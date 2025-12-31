import { baseUrl } from "../helpers/Constants.js";
import Component from "./Component.js";
import NavigationManager from "../helpers/utils/NavigationManager.js";
import LayoutCalculator from "./detailsPage/layoutCalculator.js";
import SectionNavigator from "./detailsPage/sectionNavigator.js";
import ScrollAnimator from "./detailsPage/scrollAnimator.js";
export default class DietEle extends Component {
  static PopStateEvent;
  static resizeMode = false;
  constructor(ele, refs, data, paginatorUpdateFn) {
    super(ele, refs, data);
    this.layoutCalculator = new LayoutCalculator(this.$el.clientWidth);

    if (this.$data.ele.type == "plan")
      this.sectionNavigator = new SectionNavigator(
        this.$refs,
        this.layoutCalculator
      );
    this.scrollAnimator = new ScrollAnimator(this.$refs.details);
    this.paginatorUpdateFn = paginatorUpdateFn;
    this.updateData(0);
    if (!DietEle.PopStateEvent) {
      DietEle.PopStateEvent = DietEle.handelPopStateEvent(this.instanceId);
    }
    NavigationManager.initState = false;
    // window.addEventListener("resize", () => this.OnResize());
  }

  updatePgaesDisplay(page) {
    if (window.innerWidth <= 992) {
      this.mode = 1;
      this.layoutCalculator.containerWidth = this.$el.clientWidth;
      if (page !== 0) {
        this.$refs.page1.classList.add("transition");
        this.$refs.page2.style.visibility = "visible";
      } else {
        this.$refs.page2.style.visibility = "hidden";
        this.$refs.page1.classList.remove("transition");
      }
      this.$refs.page2.style.width = "100%";
    } else {
      this.layoutCalculator.containerWidth = this.$el.clientWidth * 0.45;
      this.mode = 2;
      if (Math.floor(page / 2) === 0) {
        this.$refs.page2.style.width = "45%";
        this.$refs.page1.classList.remove("transition");
      } else {
        this.$refs.page1.classList.add("transition");

        this.$refs.page2.style.width = "100%";
      }
      this.$refs.page2.style.visibility = "visible";
    }
  }
  async updateData(page) {
    if (this.$data.mode === "fullImages") return;
    if (this.$data.mode === "mediaViewer") {
      this.onPaginate(undefined, 1);
      return;
    }
    this.updatePgaesDisplay(page);
    this.requiredPages = this.layoutCalculator.calculatePages(
      this.$refs.details,
      this.mode,
      page
    );
    console.log(this.requiredPages);
    const distance = this.layoutCalculator.getScrollPosition(page, this.mode);
    console.log(distance);
    this.$refs.details.style.right = distance + "px";
    this.$refs.details.style.columnGap =
      this.mode == 2 ? this.$el.clientWidth * 0.1 + "px" : "15px";
    console.log(this.$refs.details.style, this.requiredPages);

    this.paginatorUpdateFn(this.createPageDateObject(page));
  }

  // OnResize() {
  //   this.handelSizeChange;
  //   if (this.handelSizeChange) clearTimeout(this.handelSizeChange);
  //   this.handelSizeChange = setTimeout(async () => {
  //     DietEle.resizeMode = true;

  //     DietEle.resizeMode = false;
  //   }, 50);
  // }
  // calculateRequiredPages() {
  //   //reset
  //   this.$refs.details.style.columnCount = 1;
  //   this.$refs.details.style.width = this.width + "px";
  //   //calc
  //   this.requiredPages = Math.ceil(
  //     this.$refs.details.clientHeight / this.width
  //   );
  //   //updata ele
  //   this.$refs.details.style.columnCount = this.requiredPages;
  //   this.$refs.details.style.width =
  //     this.requiredPages * this.width +
  //     (this.mode - 1) * this.$el.clientWidth * 0.1 * (this.requiredPages - 1) +
  //     "px";
  // }

  async onPaginate(direction, page = 1) {
    console.log(direction, page);
    if (this.$data.mode === "mediaViewer") {
      const screenSize = this.layoutCalculator.calculateScreenSize(this.$el);
      console.log(screenSize);
      this.$data.displayedMedia = this.$data.ele.media.slice(
        (page - 1) * screenSize,
        page * screenSize
      );
      return {
        next: this.$data.ele.media.length > page * screenSize,
        prev: page > 1,
        page,
      };
    } else if (this.$data.mode === "fullImages") {
      console.log(
        "full image page",
        page,
        this.$data.ele.media.length,
        Math.max(1, Math.min(page, this.$data.ele.media.length))
      );
      page = Math.max(1, Math.min(page, this.$data.ele.media.length));
      this.$data.displayedMedia = [this.$data.ele.media[page - 1]];
      console.log(page, this.$data.displayedMedia);
      return {
        next: this.$data.ele.media.length > page,
        prev: page > 0,
        page,
      };
    }
    console.log(direction, page);
    console.log("called agin");

    if (direction && direction !== "next" && direction !== "prev") {
      page = this.sectionNavigator.getSectionPage(direction, this.mode);
    }
    if (!page && page !== 0) page = 1;
    const scrollDistance = this.layoutCalculator.getScrollPosition(
      page,
      this.mode
    );
    console.log(page, scrollDistance);
    const duration = page == 0 || page == this.mode ? 330 : 300;
    console.log(duration, page, this.mode);
    this.scrollAnimator.scrollTo(scrollDistance, this.$refs.details, duration);
    this.updatePgaesDisplay(page);
    let activeSection;
    if (this.$data.ele.type === "plan")
      activeSection =
        page !== undefined
          ? this.sectionNavigator.getActiveSection(
              page,
              this.$data?.ele?.details,
              this.mode
            )
          : undefined;
    return {
      ...this.createPageDateObject(page),
      activeSection,
    };
  }

  createPageDateObject(page) {
    return {
      next:
        this.mode == 1
          ? page < this.requiredPages && this.requiredPages !== 0
          : page < this.requiredPages - (page % 2 == 0 ? 1 : 0) &&
            this.requiredPages !== 1,
      prev: page > this.mode - 1 && this.requiredPages !== this.mode - 1,
      page,
    };
  }
  
  static handelPopStateEvent(instanceId) {}

  getSectionName(sectionId) {
    for (let i = 0; i < this.$data.ele.details.length; i++) {
      const section = this.$data.ele.details[i];
      if (section.id == sectionId) return section.section;
    }
  }
}
