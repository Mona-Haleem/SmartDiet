/**
 * ApiService.js
 * Single Responsibility: Handles all low-level network requests.
 * Manages CSRF tokens, headers, and response parsing.
 * This class is injected into other services that need to make API calls.
 */
export default class ApiService {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || "";
    this.defaultHeaders = {
      "X-Requested-With": "fetch",
      "HX-Request": "true", 
      "Content-Type": "application/json",
      Accept: "application/json, text/html",
      ...config.headers,
    };
  }


  getCsrfToken() {
    const tokenEl =
      document.querySelector('input[name="csrfmiddlewaretoken"]') ||
      document.querySelector("#csrf_token");
    return tokenEl ? tokenEl.value : null;
  }

   /**
   * Core request method
   * Always returns an object: { ok, status, type, data, headers }
   */
  async request(url, method, body = null, options = {}) {
    const fullUrl = `${this.baseUrl}${url}`;
    const headers = { ...this.defaultHeaders };
    
    const csrfToken = this.getCsrfToken();
    if (csrfToken && method.toUpperCase() !== "GET") {
      headers["X-CSRFToken"] = csrfToken;
    }
    const fetchOptions = {
      method: method.toUpperCase(),
      headers: { ...headers, ...options?.headers },
    };
    
    if (body) {
      if (body instanceof FormData) {
        delete fetchOptions.headers["Content-Type"];
        fetchOptions.body = body;
      } else if (typeof body === "object") {
        fetchOptions.body = JSON.stringify(body);
      } else {
        fetchOptions.body = body;
      }
      
    }
    
    const response = await fetch(fullUrl, fetchOptions);
    const contentType = response.headers.get("content-type") || "";
   
    let data;
    try {
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch {
      data = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      headers: response.headers,
      type: contentType.includes("application/json")
        ? "json"
        : contentType.includes("text/html")
        ? "html"
        : "text",
      data,
    };
  }

  // Convenience methods
  get(url,body, options = {}) {
    console.log('in api service')

    return this.request(url, "GET", null, options);
  }

  post(url, body, options = {}) {
    return this.request(url, "POST", body, options);
  }

  put(url, body, options = {}) {
    return this.request(url, "PUT", body, options);
  }

  patch(url, body, options = {}) {
    return this.request(url, "PATCH", body, options);
  }

  delete(url, options = {}) {
    return this.request(url, "DELETE", null, options);
  }
}