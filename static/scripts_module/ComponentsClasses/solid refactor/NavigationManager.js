// NavigationManager.js
import * as dom from "../helpers/utils/DomUtils.js";

export default class NavigationManager {
  constructor({ onPopState } = {}) {
    this.onPopStateHandler = onPopState || (() => {});
    this.isListening = false;
  }

  init() {
    if (this.isListening) return;
    this.isListening = true;

    dom.onPopState(({ url }) => {
      this.handlePopState(url);
    });
  }

  handlePopState(url) {
    if (typeof this.onPopStateHandler === "function") {
      this.onPopStateHandler(url);
    }
  }

  push(url) {
    dom.pushUrl(url);
  }


  setPopStateHandler(handler) {
    this.onPopStateHandler = handler;
  }
}
