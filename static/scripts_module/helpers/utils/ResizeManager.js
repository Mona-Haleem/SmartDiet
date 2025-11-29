export class ResizeHandler {
  constructor(delay = 100) {
    this.delay = delay;
    this.timeoutId = null;
    this.callback = null;
  }

  subscribe(callback) {
    this.callback = callback;
    window.addEventListener("resize", () => this.handleResize());
  }

  unsubscribe() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    window.removeEventListener("resize", () => this.handleResize());
  }

  handleResize() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    this.timeoutId = setTimeout(() => {
      if (this.callback) {
        this.callback();
      }
    }, this.delay);
  }
}
