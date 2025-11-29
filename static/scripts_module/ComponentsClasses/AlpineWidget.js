class AlpineWidget {
    constructor({ el = null, data = null, refs = null } = {}) {
        this.el = el;
        this.data = data;
        this.refs = refs;

        this._listeners = [];
        this._intervals = [];
        this._timeouts = [];
        this._observers = [];
        this._rafs = [];

        this._abortControllers = [];

    }

    on(el, event, handler) {
        el.addEventListener(event, handler);
        this._listeners.push(() => el.removeEventListener(event, handler));
    }

    interval(id) {
        this._intervals.push(id);
        return id;
    }

    timeout(id) {
        this._timeouts.push(id);
        return id;
    }

    observer(obs) {
        this._observers.push(obs);
        return obs;
    }

    raf(id) {
        this._rafs.push(id);
        return id;
    }

    registerAbortController(controller) {
        this._abortControllers.push(controller);
        return controller;
    }

    /* ---------------------
       Destroy method
    ----------------------*/

    destroy() {
        // remove listeners
        this._listeners.forEach(remove => remove());
        this._listeners = [];

        // clear intervals
        this._intervals.forEach(id => clearInterval(id));
        this._intervals = [];

        // clear timeouts
        this._timeouts.forEach(id => clearTimeout(id));
        this._timeouts = [];

        // disconnect observers
        this._observers.forEach(o => o.disconnect());
        this._observers = [];

        // cancel RAFs
        this._rafs.forEach(id => cancelAnimationFrame(id));
        this._rafs = [];

        this._abortControllers.forEach(c => c.abort());
        this._abortControllers = [];
        
        // drop Alpine references
        this.el = null;
        this.data = null;
        this.refs = null;
    }
}
