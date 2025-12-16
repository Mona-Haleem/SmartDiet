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
        this.$refs.page1.style.display = "none";
        this.$refs.page2.style.visibility = "visible";
      } else {
        this.$refs.page2.style.visibility = "hidden";
        this.$refs.page1.style.display = "";
      }
      this.$refs.page2.style.width = "100%";
    } else {
      this.layoutCalculator.containerWidth = this.$el.clientWidth * 0.45;
      this.mode = 2;
      if (Math.floor(page / 2) === 0) {
        this.$refs.page1.style.display = "";
        this.$refs.page2.style.width = "45%";
      } else {
        this.$refs.page1.style.display = "none";
        this.$refs.page2.style.width = "100%";
      }
      this.$refs.page2.style.visibility = "visible";
    }
  }
  async updateData(page) {
    if(this.$data.mode === "fullImages") return;
    if(this.$data.mode === "mediaViewer"){
      this.onPaginate(undefined, 1)
      return
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
      console.log("full image page", page,this.$data.ele.media.length,Math.max(1, Math.min(page, this.$data.ele.media.length)));
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
    const scrollDistance = this.layoutCalculator.getScrollPosition(
      page,
      this.mode
    );
    console.log(page, scrollDistance);
    this.scrollAnimator.scrollTo(scrollDistance);
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
  // getPageScrollPosition(page) {
  //   console.log("log page fro drbug", page);
  //   if (page === 0 || (this.mode == 2 && Math.floor(page / 2) == 0)) return 0;
  //   else if (this.mode == 1) return (page - 1) * this.$el.clientWidth;
  //   else return (Math.floor(page / 2) - 0.45) * this.$el.clientWidth;
  // }
  // async smoothScroll(targetValue) {
  //   if (this.scrollTimer) {
  //     clearInterval(this.scrollTimer);
  //     this.scrollTimer = null;
  //   }
  //   return new Promise((resolve) => {
  //     const startingValue = parseInt(this.$refs.details.style.right) || 0;
  //     const distance = targetValue - startingValue;
  //     this.scrollTimer = setInterval(() => {
  //       if (distance == 0) {
  //         clearInterval(this.scrollTimer);
  //         this.scrollTimer = null;
  //         resolve();
  //       }
  //       const current = parseInt(this.$refs.details.style.right) || 0;
  //       const step = (targetValue - startingValue) / 10;
  //       this.$refs.details.style.right = current + step + "px";

  //       if (
  //         (step > 0 && current >= targetValue) ||
  //         (step < 0 && current <= targetValue)
  //       ) {
  //         this.$refs.details.style.right = targetValue + "px";
  //         clearInterval(this.scrollTimer);
  //         resolve();
  //       }
  //     }, 10);
  //   });
  // }

  // getSectionPage(section) {
  //   if (section == "page1") return 0;

  //   let distance = 0;
  //   let node = this.$refs[section];
  //   while (node && node?.id !== "details") {
  //     distance += node.offsetLeft;
  //     // console.log(node.id, node.offsetLeft, distance);
  //     node = node.parentElement;
  //     // console.log(node);

  //     if (
  //       node &&
  //       !(node?.className?.includes("section") || node?.id === "details")
  //     )
  //       node = node.parentElement;
  //   }

  //   let page =
  //     this.mode == 1
  //       ? Math.round(distance / this.$el.clientWidth) + 1
  //       : Math.round(distance / (this.$el.clientWidth * 0.55)) + 1;
  //   console.log(page, this.$refs[section]);
  //   return page;
  // }

  // getActiveSection(page) {
  //   if (page === 0) return { activeSection: "Info Card", activeId: "page1" };
  //   let sections = [...this.$data?.ele?.details];
  //   while (sections) {
  //     const section = sections.shift();
  //     if (section && page == this.getSectionPage(`section-${section.id}`)) {
  //       return {
  //         activeSection: section.section,
  //         activeId: `section-${section.id}`,
  //       };
  //     }
  //     if (section?.subSections) sections.push(...section.subSections);
  //   }
  //   console.log(sections);
  // }

  static handelPopStateEvent(instanceId) {}

  getSectionName(sectionId) {
    for (let i = 0; i < this.$data.ele.details.length; i++) {
      const section = this.$data.ele.details[i];
      if (section.id == sectionId) return section.section;
    }
  }
}
