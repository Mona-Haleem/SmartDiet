export default class Paginator {
  constructor(data,refs) {
    this.data = data;
    this.refs = refs ;
    this.pageClass = null;
    window.addEventListener("resize", () => this.OnResize());
  }

  async paginateTo(direction) {
    let result;
    if (this.pageClass?.mode && this.pageClass.mode == 2)
      this.data.page =
        direction == "next" ? ++this.data.page : --this.data.page;

    if (direction === "next" && this.data.next) {
      this.data.page += 1;
      result = await this.pageClass?.onPaginate("next", this.data.page);
    } else if (direction === "prev" && this.data.prev) {
      this.data.page -= 1;
      result = await this.pageClass?.onPaginate("prev", this.data.page);
    } else {
      result = await this.pageClass?.onPaginate(direction, direction);
      this.data.page = result.page ?? direction;
    }
    console.log(result);
    const { next, prev } = result;
    this.data.next = next;
    this.data.prev = prev;
    if (result.activeSection) {
      this.activeSection.activeSection = result.activeSection.activeSection;
      this.activeSection.activeId = result.activeSection.activeId;
    }
    console.log(this.activeSection?.activeSection);
  }

  updateData(paginatorData) {
    console.log("active", this.activeSection?.activeSection);

    this.data.next = paginatorData.next ?? this.data.next;
    this.data.prev = paginatorData.prev ?? this.data.prev;
    this.data.page = paginatorData.page ?? this.data.page;
    if (paginatorData.activeSection) {
      this.activeSection.activeSection =
        paginatorData.activeSection.activeSection;
      this.activeSection.activeId = paginatorData.activeSection.activeId;
    }
    console.log(this.activeSection);
  }

  OnResize() {
    if (this.handelSizeChange) clearTimeout(this.handelSizeChange);
    this.handelSizeChange = setTimeout(async () => {
      console.log("active", this.activeSection);
      if (Paginator.resizeMode) return;
      Paginator.resizeMode = true;
      if (this.activeSection?.activeSection && this.pageClass.$data.mode == "details") {
        this.pageClass.updateData(0);
        const page = this.pageClass.sectionNavigator.getSectionPage(
          this.activeSection?.activeId,
          this.pageClass.mode
        );
        this.pageClass.updateData(page);
      } else {
        this.pageClass.updateData();
      }
      Paginator.resizeMode = false;
    }, 100);
  }
}
