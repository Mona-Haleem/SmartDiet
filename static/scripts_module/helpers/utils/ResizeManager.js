export class ResizeHandler {
  constructor(delay = 100) {
    this.delay = delay;
    this.timeoutId = null;
    this.callback = null;
    this.listener = this.handleResize.bind(this);
  }

  subscribe(callback) {
    this.callback = callback;
    window.addEventListener("resize", this.listener);
  }

  unsubscribe() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    window.removeEventListener("resize", this.listener);
    this.callback = null;
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
