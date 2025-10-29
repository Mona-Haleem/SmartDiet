export default class Component {
  static instances = {};
  constructor(el, refs = {}, data = {}) {
    if (new.target === Component) {
      throw new Error(
        "Component is abstract and cannot be instantiated directly."
      );
    }

    this.$el = el;
    this.$refs = refs;
    this.$data = data;
    this.instanceId = this.constructor.getInstanceID(this);
    this.$el.dataset.instanceId = this.instanceId;
    Component.instances[this.instanceId] = this;
  }

  async swapContent(data) {
    try {
      const html = data;
      const tpl = document.createElement("template");
      tpl.innerHTML = html.trim();
      const newEl = tpl.content.firstElementChild;

      if (!newEl) throw new Error("No valid root element in template");
      const parent = this.$el.parentNode;

      if (newEl) {
        newEl.dataset.instanceId = this.instanceId;
      }

      if (parent) {
        parent.replaceChild(newEl, this.$el);
      }

    
      Alpine.initTree(this.$el);

      this.refreshRefs();
      this.delete();
      return true;
    } catch (err) {
      console.error("Swap failed:", err);
      return false;
    }
  }

  async createEle(
    payload,
    target,
    position = "beforeend",
    ComponentClass = this
  ) {
    if (typeof payload === "string") {
      if (!(target instanceof HTMLElement)) {
        throw new Error("Target DOM node required for HTML payload");
      }

      const tpl = document.createElement("template");
      tpl.innerHTML = payload.trim();
      const node = tpl.content.firstElementChild;

      target.insertAdjacentElement(position, node);
      Alpine.initTree(node);
      const $data = Alpine.$data(node);
      const instance = new ComponentClass(node, $data.$refs || {}, $data || {});
      node.__instance = instance;
      return instance;

      // Treat as HTML: replace the DOM
    } else if (typeof payload === "object" && typeof target === "function") {
      // Treat as JSON: update reactive data
      return target(payload);
    }
  }

  async updateEle(payload) {
    if (typeof payload === "string") {
      this.swapContent(payload);
    } else if (typeof payload === "object" && payload !== null) {
      this.updateData(payload);
    }
  }

  async delete() {
    if (this.$el) {
      delete Component.instances[this.instanceId];
    }
    // Dereference all internal data so GC can clean up
    for (const key of Object.keys(this)) {
      this[key] = null;
    }
  }

  updateData(newData) {
    for (const key in newData) {
      if (Object.prototype.hasOwnProperty.call(this.$data, key)) {
        this.$data[key] = newData[key];
      }
    }
  }
  refreshRefs() {
    const alpineData = Alpine.$data(this.$el);
    if (alpineData && alpineData.$refs) {
      this.$refs = alpineData.$refs;
    }
  }

  static getInstanceID(component) {
    const className = this.name || "Component";
    return component.$el?.dataset?.instanceId || `${className.toLowerCase()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
  }

  static findInstance(ele) {
    const instanceEl = ele.closest("[data-instance-id]");
    return instanceEl
      ? Component.instances[instanceEl.dataset.instanceId]
      : null;
  }

  static getTemplate(data) {
    return document.createElement("div");
  }
  bindNewElement(newElement) {
    if (!newElement) return;

    // Clean up old element's reference if it exists and is different
    if (this.element && this.element !== newElement) {
      delete this.element.dataset.instanceId;
    }

    this.element = newElement;
    this.element.dataset.instanceId = this.instanceId;
  }

  handleAction(action, event, payload) {
    if (typeof this[action] === "function") {
      this[action](event, payload);
    } else {
      console.warn(`Action "${action}" not found on component`, this);
    }
  }
}
