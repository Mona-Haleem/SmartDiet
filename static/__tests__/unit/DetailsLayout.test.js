import DietEle from '../../scripts_module/ComponentsClasses/DietEle.js';
import LayoutCalculator from '../../scripts_module/ComponentsClasses/detailsPage/layoutCalculator.js';
import SectionNavigator from '../../scripts_module/ComponentsClasses/detailsPage/sectionNavigator.js';
import ScrollAnimator from '../../scripts_module/ComponentsClasses/detailsPage/scrollAnimator.js';
import Component from '../../scripts_module/ComponentsClasses/Component.js';

describe('responsive details pagination', () => {
  let view, data, refs, el;
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
    el = document.createElement('div'); Object.defineProperty(el, 'clientWidth', { value: 1000 });
    Object.defineProperty(el, 'clientHeight', { value: 320 });
    refs = { details: document.createElement('div'), page1: document.createElement('div'), page2: document.createElement('div'), 'section-1': document.createElement('section'), 'section-2': document.createElement('section') };
    Object.defineProperty(refs.details, 'clientHeight', { value: 1800 });
    refs.details.getBoundingClientRect = () => ({ x: 0 }); refs['section-1'].getBoundingClientRect = () => ({ x: 550 }); refs['section-2'].getBoundingClientRect = () => ({ x: 1100 });
    data = { ele: { type: 'plan', details: [{ id: 1, section: 'Week 1', subSections: [{ id: 2, section: 'Day 1', subSections: [] }] }], media: ['one', 'two', 'three'] }, mode: 'details' };
    view = new DietEle(el, refs, data, jest.fn()); view.scrollAnimator.scrollTo = jest.fn();
  });
  afterEach(() => { Component.instances = {}; });
  it('uses two columns on desktop and a single column on mobile', async () => {
    expect(view.mode).toBe(2); expect(refs.page2.style.width).toBe('45%');
    Object.defineProperty(window, 'innerWidth', { value: 600, configurable: true });
    await view.updateData(0); expect(view.mode).toBe(1); expect(refs.page2.style.visibility).toBe('hidden');
    await view.onPaginate('next', 1); expect(refs.page2.style.visibility).toBe('visible'); expect(refs.page1).toHaveClass('transition');
    await view.onPaginate('prev', 0); expect(refs.page1).not.toHaveClass('transition');
  });
  it('navigates directly to nested sections and identifies their names', async () => {
    const result = await view.onPaginate('section-2'); expect(result.activeSection.activeId).toBe('section-2');
    expect(view.getSectionName(1)).toBe('Week 1'); expect(view.getSectionName(99)).toBeUndefined();
    expect(view.sectionNavigator.getActiveSection(0, data.ele.details, 2).activeId).toBe('page1');
    expect(view.sectionNavigator.getActiveSection(99, data.ele.details, 2)).toBeUndefined();
  });
  it('updates the desktop spread after the information page', async () => {
    await view.onPaginate('next', 2); expect(refs.page2.style.width).toBe('100%'); expect(refs.page1).toHaveClass('transition');
  });
  it('paginates image grids and clamps full-image requests', async () => {
    data.mode = 'mediaViewer'; view.layoutCalculator.calculateScreenSize = () => 2;
    expect(await view.onPaginate('next', 1)).toMatchObject({ next: true, prev: false }); expect(data.displayedMedia).toEqual(['one', 'two']);
    expect(await view.onPaginate('next', 2)).toMatchObject({ next: false, prev: true }); expect(data.displayedMedia).toEqual(['three']);
    await view.updateData(1); data.mode = 'fullImages'; await view.updateData(0);
    expect(await view.onPaginate('next', 99)).toMatchObject({ page: 3, next: false });
    expect(await view.onPaginate('prev', -2)).toMatchObject({ page: 1, prev: false });
  });
  it('handles recipe pages without a section navigator', async () => {
    data.ele.type = 'recipe'; await expect(view.onPaginate(undefined, null)).resolves.toMatchObject({ page: 1, activeSection: undefined });
  });
  it.each([[500, 2], [700, 4], [900, 6], [1200, 8], [1400, 12]])('sizes the image grid at width %s', (width, expected) => {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true }); expect(view.layoutCalculator.calculateScreenSize(el)).toBe(expected);
  });
  it('never returns zero image slots for a hidden container', () => {
    expect(new LayoutCalculator(450).calculateScreenSize(document.createElement('div'))).toBeGreaterThan(0);
  });
  it('calculates mobile and desktop scroll distances consistently', () => {
    const layout = new LayoutCalculator(450); expect(layout.getScrollPosition(0, 1)).toBe(0);
    expect(layout.getScrollPosition(1, 2)).toBe(0); expect(layout.getScrollPosition(3, 1)).toBe(900);
    expect(layout.getScrollPosition(2, 2)).toBe(550);
    const nav = new SectionNavigator(refs, layout); expect(nav.getSectionPage('page1', 1)).toBe(0); expect(nav.getSectionPage('section-1', 1)).toBe(2);
  });
});

describe('scroll animation lifecycle', () => {
  it('finishes at the requested position and cancels a previous frame', async () => {
    const element = document.createElement('div'); const animator = new ScrollAnimator(element);
    let callback; jest.spyOn(window, 'requestAnimationFrame').mockImplementation(fn => { callback = fn; return 5; });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {}); jest.spyOn(performance, 'now').mockReturnValue(100);
    animator.currentAnimation = 4; const finished = animator.scrollTo(100, element, 300);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(4); callback(175); expect(parseFloat(element.style.right)).toBeGreaterThan(0);
    callback(400); await finished; expect(element.style.right).toBe('100px'); expect(animator.currentAnimation).toBeNull();
    await animator.scrollTo(100, element); expect(animator.currentAnimation).toBeNull();
  });
});
