export class DataManager {
  constructor(queryService) {
    this.queryService = queryService;
  }

  async fetchItems(url) {
    const data = await this.queryService.query(["browse", url], {
      queryFn: this.queryService.createQueryFn(url, "get"),
      onSuccess: (ctx) => ctx.data,
      onError: (ctx) => {
        console.error("Data fetch error:", ctx);
        throw new Error("Failed to fetch items");
      },
      ttl: 24 * 60 * 60 * 1000,
    });
    
    return data.result;
  }
}

