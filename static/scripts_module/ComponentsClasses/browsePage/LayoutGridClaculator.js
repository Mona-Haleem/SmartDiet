export class LayoutGridCalculator {
  constructor(breakpoints = null) {
    this.breakpoints = breakpoints || {
      600: 1,
      795: 2,
      992: 3,
      1224: 4,
      default: 6
    };
  }

  calculate(containerHeight) {
    const width = window.innerWidth;
    const rows = Math.round(containerHeight / 175);
    
    for (const [breakpoint, columns] of Object.entries(this.breakpoints)) {
      if (breakpoint === 'default') continue;
      if (width <= Number(breakpoint)) {
        return columns * rows;
      }
    }
    
    return this.breakpoints.default * rows;
  }
}
