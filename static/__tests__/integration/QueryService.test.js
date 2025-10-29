import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import QueryService from "../../scripts_module/helpers/fetchData/QueryService.js";
import ApiService from "../../scripts_module/helpers/fetchData/ApiService.js";
import QueryCache from "../../scripts_module/helpers/fetchData/QueryCache.js";

describe("QueryService - Integration Tests", () => {
  let queryService;
  let apiService;
  let cache;

  beforeEach(() => {
    apiService = new ApiService();
    cache = new QueryCache({ defaultTTL: 1000 });
    queryService = new QueryService(apiService, cache);
    global.fetch.mockClear();
  });

  describe("query method - basic functionality", () => {
    it("should fetch data and cache it", async () => {
      const mockData = { id: 1, name: "Test" };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockData,
        text: async () => JSON.stringify(mockData),
      });

      const result = await queryService.query("/api/test", {
        queryFn: queryService.createQueryFn("/api/test", "GET"),
      });

      expect(result).toEqual(mockData);
      expect(cache.get("/api/test").data).toEqual(mockData);
    });

    it("should serve from cache on second request", async () => {
      const mockData = { id: 1, name: "Test" };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockData,
        text: async () => JSON.stringify(mockData),
      });

      // First request
      await queryService.query("/api/test", {
        queryFn: queryService.createQueryFn("/api/test", "GET"),
      });

      // Second request - should use cache
      const result = await queryService.query("/api/test", {
        queryFn: queryService.createQueryFn("/api/test", "GET"),
      });

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should force refetch when force=true", async () => {
      const mockData = { id: 1, name: "Test" };
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockData,
        text: async () => JSON.stringify(mockData),
      });

      // First request
      await queryService.query("/api/test", {
        queryFn: queryService.createQueryFn("/api/test", "GET"),
      });

      // Second request with force=true
      await queryService.query("/api/test", {
        queryFn: queryService.createQueryFn("/api/test", "GET"),
        force: true,
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("lifecycle callbacks", () => {
    it("should call onLoading before fetch", async () => {
      const callbacks = [];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({}),
        text: async () => "{}",
      });

      await queryService.query("/api/test", {
        queryFn: queryService.createQueryFn("/api/test", "GET"),
        onLoading: (ctx) => callbacks.push("loading"),
        onSuccess: (ctx) => callbacks.push("success"),
      });

      expect(callbacks).toEqual(["loading", "success"]);
    });

    it("should call onSuccess with context", async () => {
      const mockData = { id: 1 };
      let successContext;

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockData,
        text: async () => JSON.stringify(mockData),
      });

      await queryService.query("/api/test", {
        queryFn: queryService.createQueryFn("/api/test", "GET"),
        onSuccess: (ctx) => {
          successContext = ctx;
        },
      });

      expect(successContext).toBeDefined();
      expect(successContext.data).toEqual(mockData);
      expect(successContext.stage).toBe("success");
      expect(successContext.queryKey).toBe("/api/test");
    });

    it("should call onError on failed request", async () => {
      let errorContext;

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ message: "Server error" }),
        text: async () => '{"message":"Server error"}',
      });

      try {
        await queryService.query("/api/test", {
          queryFn: queryService.createQueryFn("/api/test", "GET"),
          onError: (ctx) => {
            errorContext = ctx;
          },
        });
      } catch (error) {
        // Expected to throw
      }

      expect(errorContext).toBeDefined();
      expect(errorContext.error).toBeDefined();
      expect(errorContext.stage).toBe("error");
    });

    it("should call prefetch before fetching", async () => {
      const callbacks = [];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({}),
        text: async () => "{}",
      });

      await queryService.query("/api/test", {
        queryFn: queryService.createQueryFn("/api/test", "GET"),
        prefetch: (ctx) => callbacks.push("prefetch"),
        onLoading: (ctx) => callbacks.push("loading"),
      });

      expect(callbacks).toEqual(["prefetch", "loading"]);
    });

    it("should call onError if prefetch throws", async () => {
      let errorCalled = false;

      await queryService.query("/api/test", {
        queryFn: queryService.createQueryFn("/api/test", "GET"),
        prefetch: (ctx) => {
          throw new Error("Validation failed");
        },
        onError: (ctx) => {
          errorCalled = true;
        },
      });

      expect(errorCalled).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("context management", () => {
    it("should allow prefetch to modify context.body", async () => {
      let capturedBody;

      global.fetch.mockImplementationOnce((url, options) => {
        capturedBody = options.body;
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({}),
          text: async () => "{}",
        });
      });

      const formData = new FormData();
      formData.append("test", "value");

      await queryService.query("/api/test", {
        queryFn: async (ctx) => {
          return apiService.post("/api/test", ctx.body);
        },
        prefetch: (ctx) => {
          ctx.body = formData;
        },
      });

      expect(capturedBody).toBeInstanceOf(FormData);
    });

    it("should pass context through all stages", async () => {
      const contexts = [];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ data: "test" }),
        text: async () => '{"data":"test"}',
      });

      await queryService.query("/api/test", {
        queryFn: queryService.createQueryFn("/api/test", "GET"),
        prefetch: (ctx) => {
          contexts.push({ ...ctx });
        },
        onLoading: (ctx) => {
          contexts.push({ ...ctx });
        },
        onSuccess: (ctx) => {
          contexts.push({ ...ctx });
        },
      });

      expect(contexts.length).toBe(3);
      expect(contexts[0].stage).toBe("prefetch");
      expect(contexts[1].stage).toBe("loading");
      expect(contexts[2].stage).toBe("success");

      // All should have same queryKey
      expect(contexts.every((ctx) => ctx.queryKey === "/api/test")).toBe(true);
    });
  });

  describe("stale data handling", () => {
    it("should serve stale data while refetching", async () => {
      const mockData1 = { version: 1 };
      const mockData2 = { version: 2 };
      let successCallCount = 0;

      // First request
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockData1,
        text: async () => JSON.stringify(mockData1),
      });

      await queryService.query("/api/test", {
        queryFn: queryService.createQueryFn("/api/test", "GET"),
        ttl: 100,
      });

      // Wait for data to become stale
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Second request - should serve stale first, then refetch
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => mockData2,
        text: async () => JSON.stringify(mockData2),
      });

      await queryService.query("/api/test", {
        queryFn: queryService.createQueryFn("/api/test", "GET"),
        onSuccess: (ctx) => {
          successCallCount++;
        },
      });

      // Should be called twice: once for stale, once for fresh
      expect(successCallCount).toBe(2);
    });
  });

  describe("redirect handling", () => {
    it("should handle X-Redirect header", async () => {
      const handleRedirectSpy = jest.spyOn(queryService, "handleRedirect");

      // Mock ApiService.post
      jest.spyOn(apiService, "post").mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name) => (name === "X-Redirect" ? "/login/" : null),
        },
        json: async () => ({}),
      });

      // Run the query
      await queryService.query("/api/test", {
        queryFn: queryService.createQueryFn("/api/test", "POST"),
      });

      // Assert redirect
      expect(handleRedirectSpy).toHaveBeenCalled();
      const callArg = handleRedirectSpy.mock.calls[0][0];
      expect(callArg.headers.get("X-Redirect")).toBe("/login/");

      handleRedirectSpy.mockRestore();
    });
  });

  describe("createQueryFn", () => {
    it("should create working query function", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ data: "test" }),
        text: async () => '{"data":"test"}',
      });

      const queryFn = queryService.createQueryFn("/api/test", "GET");
      const context = { body: null };
      const result = await queryFn(context);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ data: "test" });
      expect(context.response).toBeDefined();
      expect(context.ok).toBe(true);
    });

    it("should throw error for invalid HTTP method", () => {
      expect(() => {
        queryService.createQueryFn("/api/test", "INVALID");
      }).toThrow("Invalid ApiService method");
    });
  });
});
