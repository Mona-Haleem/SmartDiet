export default class SectionNavigator {
  constructor(sectionsRefs, layoutCalculator) {
    this.refs = sectionsRefs;
    this.layoutCalculator = layoutCalculator;
  }

  _calculateSectionOffset(sectionId) {
    let section = this.refs[sectionId];
    let container = this.refs.details;
    const parentBox  = container.getBoundingClientRect();
    const childBox = section.getBoundingClientRect();
    const distance = childBox.x - parentBox.x;
    return distance;
  }
  getSectionPage(sectionId, mode) {
    if (sectionId == "page1") return 0;

    const distance = this._calculateSectionOffset(sectionId);
    console.log(distance);
    let page =
      mode == 1
        ? Math.round(distance / this.layoutCalculator.containerWidth) + 1
        : Math.round(distance / (this.layoutCalculator.containerWidth / 0.45 * 0.55)) + 1;
    console.log(page, this.refs[sectionId]);
    return page;
  }
  //this.$data?.ele?.details

  getActiveSection(page, sectionsData,mode) {
    if (page === 0) return { activeSection: "Info Card", activeId: "page1" };
    let sections = [...sectionsData];
    
    while (sections.length) {
      console.log("loopingSections", sections.length);
      const section = sections.shift();
      const x = this.getSectionPage(`section-${section.id}`,mode)
      console.log(!!section, page , x)
      if (section && page == x) {
        return {
          activeSection: section.section,
          activeId: `section-${section.id}`,
        };
      }

      if (section?.subSections) sections.push(...section.subSections);
    }
    console.log(sections);
  }
}
