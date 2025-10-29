
export default class NavigationManager {
  static allowPush = true
  static initState = true
  
  static pushUrl(url, state = {}) {
    if (typeof url !== "string" || !url.trim()) return;
    const cleanUrl = new URL(`diet/${url}/`, window.location.origin).toString();
    if (window.location.href !== cleanUrl) {
      window.history.pushState(state, "", cleanUrl);
    }
  }
  static replaceUrl(url, state = {}) {
    if (typeof url !== "string" || !url.trim()) return;
    const cleanUrl = new URL(`diet/${url}/`, window.location.origin).toString();
    if (window.location.href !== cleanUrl) {
      window.history.replaceState(state, "", cleanUrl);
    }
  }
  static onPopState(callback) {
    if (typeof callback !== "function") return;
    window.addEventListener("popstate", (event) => {
      event.preventDefault();
      console.log(this.$el);
      callback({
        state: event.state,
        url: window.location.href,
        path: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      });
    });
  }
  // init() {
  //   if (this.isListening) return;
  //   this.isListening = true;

  //   dom.onPopState(({ url }) => {
  //     this.handlePopState(url);
  //   });
  // }

  // handlePopState(url) {
  //   if (typeof this.onPopStateHandler === "function") {
  //     this.onPopStateHandler(url);
  //   }
  // }



  // setPopStateHandler(handler) {
  //   this.onPopStateHandler = handler;
  // }
}
