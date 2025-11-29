import { baseUrl } from "../helpers/Constants.js";
import Component from "./Component.js";
import { queryService, cache } from "../../common/script.js";
import NavigationManager from "../helpers/utils/NavigationManager.js";

export default class CardList extends Component {
  static PopStateEvent;
  static resizeMode = false;
  constructor(ele, refs, data, paginatorUpdateFn) {
    super(ele, refs, data);
    const { size } = this.getCurrentListSize();
    this.size = size;
    this.paginatorUpdateFn = paginatorUpdateFn;
    if(this.size !== 24 ){
      if (this.$data.items.length < this.size) this.updateData();
      else{
        validateUrlPageParam();
        this.$data.items = this.$data.items.slice(0, this.size);
        this.paginatorUpdateFn({next:true})
      }
    }

    if (!CardList.PopStateEvent) {
      CardList.PopStateEvent = CardList.handelPopStateEvent(this.instanceId);
    }

    NavigationManager.initState = false;

    window.addEventListener("resize", () => this.OnResize());
  }
  getCurrentListSize() {
    const width = window.innerWidth;
    const height = Math.round(this.$el.clientHeight / 175);
    let size ;
    const  sizeMap = {600:1*height , 795:2*height , 992:3*height , 1224:4*height};
    for (const w in sizeMap) {
      if (width <= w) {
        size = sizeMap[w];
        break;
      }
    }
    if(!size) size = 6 * height;
    
    return { sizeChanged: size !== this.size, size: size };
  }
  buildQueryUrl(page) {
    const url = new URL(window.location.href);
    url.searchParams.set("page", !isNaN(Number(page)) ? page : 1);
    if (
      NavigationManager.allowPush &&
      !NavigationManager.initState &&
      !CardList.resizeMode
    )
      NavigationManager.pushUrl(
        url.pathname.replace("/diet/", "") + url.search
      );
  

    url.searchParams.set("size", this.size);

    return url.toString();
  }

  async updateData() {
    validateUrlPageParam();
    let page = new URL(window.location.href).searchParams.get("page") || 1; 
    const data = await this.onPaginate(undefined, page);
    this.paginatorUpdateFn(data);
  }
  OnResize() {
    const { sizeChanged, size } = this.getCurrentListSize();
    console.log(size)
    if (!sizeChanged) return;
    this.handelSizeChange;
    if (this.handelSizeChange) clearTimeout(this.handelSizeChange);
    this.handelSizeChange = setTimeout(async () => {
      CardList.resizeMode = true;
      this.size = size;
      await this.updateData();
      CardList.resizeMode = false;
    }, 50);
  }
  async onPaginate(direction, page = 1) {
    const url = this.buildQueryUrl(page);
    const data = await queryService.query(["browse", url], {
      queryFn: queryService.createQueryFn(url, "get"),
      onSuccess: (ctx) => {
        this.$data.items = ctx.data.result?.items;
        return ctx.data;
      },
      onError: (ctx) => console.log(ctx),
      ttl: 24 * 60 * 60 * 1000,
    });
    return data.result;
  }

  static handelPopStateEvent(instanceId) {
    NavigationManager.onPopState(async ({ url }) => {
      NavigationManager.allowPush = false;
      console.log("componenet", Component.instances[instanceId]);

      const data = await Component.instances[instanceId].onPaginate(
        undefined,
        new URL(url).searchParams.get("page") || 1
      );
      console.log("data", data);
      Component.instances[instanceId].$data.items = data?.items || [];
      Component.instances[instanceId].paginatorUpdateFn(data);
      NavigationManager.allowPush = true;
    });
    return true;
  }
}


function validateUrlPageParam(){
  const url = new URL(window.location.href);
    if(isNaN(Number(url.searchParams.get("page") || 1))){
      url.searchParams.set("page", 1);
    }
}