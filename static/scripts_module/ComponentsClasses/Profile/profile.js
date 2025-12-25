import Component from "../Component.js";

export default class Profile extends Component {
  constructor(el, refs, data) {
    super(el, refs, data);
    this.$data.full = window.innerWidth > 992;
    this.collapseLine = window.innerWidth <= 992 ? 7 : 10; 
    this.$data.collapse = this.$data.user.restrictions.length > this.collapseLine;
    window.addEventListener("resize", () => {
      if (window.innerWidth <= 992) {
        this.$data.full = false;
        this.collapseLine = 7;
      } else {
        this.collapseLine = 10;
        this.$data.full = true;
      }
    });
  }

  addRestriction(type) {
    this.$data.user.restrictions.push({
      id: Date.now(),
      type: type,
      name: "",
      remark: "",
    });
    this.$data.collapse = this.$data.user.restrictions.length > this.collapseLine;
    this.$data.activeType = type;
  }

  removeRestriction(index) {
    this.$data.user.restrictions.splice(index, 1);
    this.$data.collapse = this.$data.user.restrictions.length > this.collapseLine;
  }

  getRestrictionsByType(type) {
    return this.$data.user.restrictions.filter((r) => r.type === type);
  }
}
