import * as dom from "../utils/DomUtils.js";
export default class QueryService {
  constructor(apiService, cache) {
    this.apiService = apiService;
    this.cache = cache;
  }

  /**
   * Core query runner (similar to React Query’s query/mutation)
   *
   * @param {string} queryKey
   * @param {{
   *   queryFn: (context) => Promise<any>,
   *   prefetch?: (context) => Promise<void> | void,
   *   onLoading?: (context) => void,
   *   onSuccess?: (context) => void,
   *   onError?: (context) => void,
   *   ttl?: number,
   *   force?: boolean
   * }} options
   */
  async query(queryKey, options = {}) {
    const {
      queryFn,
      prefetch,
      onLoading,
      onSuccess,
      onError,
      ttl,
      force = false,
    } = options;

    let entry = this.cache.get(queryKey);
    
    const controller = new AbortController();

    // 🧠 Shared, mutable context across the whole lifecycle
    const context = {
      queryKey,
      cache: this.cache,
      apiService: this.apiService,
      isCached: !!entry,
      stale: entry?.isStale ?? false,
      isFetching: false,
      body: entry?.body ?? null,
      response: entry?.response ?? null,
      data: entry?.data ?? null,
      error: null,
      stage: "init",
      meta: {}, // freeform data bag for user-defined info
      abortController: controller,      
      signal: controller.signal
    };

    // 1️⃣ Serve from cache if valid
    if (entry && !entry.isStale && !force && !entry.isFetching) {
      console.log("serve from cache", queryKey);
      context.stage = "cache";
      context.data = entry.data;
      onSuccess?.(context);
      return context.data;
    }

    // 2️⃣ Background refresh if stale
    if (entry && entry.isStale && !force && !entry.isFetching) {
      context.stage = "stale";
      context.data = entry.data;
      onSuccess?.(context); // still notify with stale data
    }

    // 3️⃣ Skip if already fetching
    if (entry && entry.isFetching) {
      return entry.data;
    }
    console.log("fetching new data", queryKey);
    // 4️⃣ Prefetch — can modify context (including body)
    try {
      context.stage = "prefetch";
      if (prefetch) await prefetch(context);
    } catch (error) {
      context.error = error;
      context.stage = "prefetch_error";
      onError?.(context);
      return;
    }

    // 5️⃣ Mark loading
    context.stage = "loading";
    context.isFetching = true;
    this.cache.setFetching(queryKey, true);
    onLoading?.(context);

    // 6️⃣ Execute queryFn with same context
    try {
      context.stage = "fetching";
      const response = await queryFn(context);
      if (!response.ok) {
        const msg =
          typeof response.data === "object" && response.data?.message
            ? response.data.message
            : "error fetching data";
        throw new Error(msg);
      }

      this.handleRedirect(response);

      context.response = response;
      context.data = response?.data ?? response; // allow raw or ApiService style
      context.stage = "success";

      onSuccess?.(context);
      // cache and notify
      this.cache.set(queryKey,  context.data, { ttl });

      return context.data;
    } catch (error) {
      context.error = error;
      context.stage = "error";
      this.cache.setFetching(queryKey, false, { error });
      onError?.(context);
      throw error;
    }
  }

  /**
   * Runtime-safe query function generator
   * Returns a function that uses the current context.body
   */
  createQueryFn(url, method, body) {
    const apiMethod = method.toLowerCase();
    if (typeof this.apiService[apiMethod] !== "function") {
      throw new Error(`Invalid ApiService method: ${method}`);
    }

    return async (context) => {
      console.log("beforr api service");

      const result = await this.apiService[apiMethod](url, context?.body || body,{ signal: context.signal });
      console.log("after api service");

      // You can even modify context here if needed
      context.response = result;
      context.status = result.status;
      context.ok = result.ok;
      return result;
    };
  }

  handleRedirect(response) {
    const redirectUrl = response.headers.get("X-Redirect");
    if (redirectUrl) {
      window.location.href = redirectUrl;
      return;
    }
  }
}
