export default class LayoutCalculator {
  constructor(containerWidth) {
    this.containerWidth = containerWidth;
  }
  calculateScreenSize(ele){
    const width = window.innerWidth;
    const height = Math.round(ele.clientHeight / 160);
    let size ;
    const  sizeMap = {600:1*height , 795:2*height , 992:3*height , 1224:4*height};
    for (const w in sizeMap) {
      if (width <= w) {
        size = sizeMap[w];
        break;
      }
    }
    if(!size) size = 6 * height;
    
    return  size;
  }
  calculatePages(ele, mode,page) {
    
    //reset
    ele.style.columnCount = 1;
    ele.style.width = this.containerWidth + "px";
    //calc
    console.log(ele.clientHeight, this.containerWidth);
    console.log("pages needed",ele.clientHeight / this.containerWidth)
    const requiredPages = Math.max(1,Math.ceil((ele.clientHeight / this.containerWidth) - 0.4));
    
    //updata ele
    this._updateContainerLayout(ele,requiredPages ,mode ,page);  
    return requiredPages ;
  }
  
  _updateContainerLayout(ele,requiredPages ,mode ,page){
    const columGap = this.containerWidth/0.45 * 0.1;
    ele.style.columnCount = requiredPages;
    ele.style.width =
      requiredPages * this.containerWidth +
      (mode - 1) * (columGap) * (requiredPages - 1) +
      "px";
    ele.style.right = this.getScrollPosition(page || 0,mode) + "px";
    ele.style.columnGap =
      mode == 2 ? columGap + "px" : "15px";

  }
  getScrollPosition(page, mode) {
    if (page === 0 || (mode === 2 && Math.floor(page / 2) === 0)) return 0;
    return mode === 1
      ? (page - 1) * this.containerWidth
      : (Math.floor(page / 2) - 0.45) * (this.containerWidth / 0.45 );
  }
}
