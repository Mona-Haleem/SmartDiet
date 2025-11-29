export class UrlManager {
  constructor(baseUrl = window.location.href) {
    this.baseUrl = baseUrl;
  }

  validatePageParam() {
    const urlObj = new URL(window.location.href);
    const page = urlObj.searchParams.get("page");
    if (isNaN(Number(page))) {
      urlObj.searchParams.set("page", "1");
    }
    return urlObj.toString();
  }

  buildQueryUrl(page, size) {
    const url = new URL(this.baseUrl);
    url.searchParams.set("page", !isNaN(Number(page)) ? page : 1);
    url.searchParams.set("size", size);
    return url.toString();
  }

  getCurrentPage(url) {
    return new URL(this.baseUrl).searchParams.get("page") || 1;
  }
}
