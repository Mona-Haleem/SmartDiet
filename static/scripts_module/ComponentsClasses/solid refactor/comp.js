// Component.js
export default class Component {
  static instances = {};

  constructor(el, refs = {}, data = {}) {
    if (new.target === Component) {
      throw new Error("Component is abstract and cannot be instantiated directly.");
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
      const tpl = document.createElement("template");
      tpl.innerHTML = data.trim();
      const newEl = tpl.content.firstElementChild;

      if (!newEl) throw new Error("No valid root element in template");

      const parent = this.$el.parentNode;
      if (newEl) newEl.dataset.instanceId = this.instanceId;

      if (parent) parent.replaceChild(newEl, this.$el);

      Alpine.initTree(newEl);
      this.$el = newEl;
      this.refreshRefs();
      return true;
    } catch (err) {
      console.error("Swap failed:", err);
      return false;
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
    return component.$el?.dataset?.instanceId || `${className.toLowerCase()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  static findInstance(ele) {
    const instanceEl = ele.closest("[data-instance-id]");
    return instanceEl ? Component.instances[instanceEl.dataset.instanceId] : null;
  }
}
