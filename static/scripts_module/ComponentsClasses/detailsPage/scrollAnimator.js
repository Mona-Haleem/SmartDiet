export default class ScrollAnimator {
  constructor(element) {
    this.ele = element;
    this.currentAnimation = null;
  }

  async scrollTo(targetValue,ele, duration = 300) {
    this.cancel();

    const startingValue = parseInt(ele.style.right) || 0;
    const distance = targetValue - startingValue;
    if (distance == 0) return Promise.resolve();

    const startTime = performance.now();

    return new Promise((resolve) => {
      const step = (now) => {
        this._step(ele,{
          now,
          startTime,
          duration,
          startingValue,
          distance,
          targetValue,
          resolve,
        });
      };

      this.currentAnimation = requestAnimationFrame(step);
    });
  }
  _step(ele,state) {
    const {
      now,
      startTime,
      duration,
      startingValue,
      distance,
      targetValue,
      resolve,
    } = state;

    const t = Math.min((now - startTime) / duration, 1);
    const eased = this._ease(t);

    ele.style.right = startingValue + distance * eased + "px";

    if (t < 1) {
      this.currentAnimation = requestAnimationFrame((now2) =>
        this._step(ele,{ ...state, now: now2 })
      );
    } else {
      ele.style.right = targetValue + "px";
      this.currentAnimation = null;
      resolve();
    }
  }

  _ease(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  cancel() {
    if (this.currentAnimation) {
      cancelAnimationFrame(this.currentAnimation);
      this.currentAnimation = null;
    }
  }
}
