import { queryService } from "../../../common/script.js";
import { isValidImg, isValidImgurl } from "../../helpers/utils/validators.js";
export default class MediaManager {
  constructor(eleId, type, updateServerData, anchorEl) {
    this.eleId = eleId;
    this.type = type;
    this.updateServerData = updateServerData;
    this.anchorEl = anchorEl;
  }

  async uploadMedia(input, data) {
    const img = input.files[0];
    if (!isValidImg(img)) return;
    const formData = new FormData();
    formData.append("media", img);
    const url = `/diet/collections/${this.type}/${this.eleId}/media/`;
    await queryService.query(["uploadMedia", img.name, url], {
      queryFn: queryService.createQueryFn(url, "post", formData),
      onSuccess: (ctx) => {
        data.ele.media.push(ctx.data.mediaUrl);
        data.mediaIndex = data.ele.media.length - 1;
        console.log("sucess", data.ele.media, ctx.data);
        input.value = "";
        return ctx.data;
      },
      onError: (ctx) => {
        console.log(ctx);
      },
      ttl: 60 * 1000,
    });
  }

  async appendMediaLink(input, data) {
    const mediaUrl = input.value.trim();
    if (isValidImgurl(mediaUrl)) {
      data.ele.media.push(mediaUrl);
      data.mediaIndex = data.ele.media.length - 1;
      await this.updateServerData(["updateMediaList", data.ele.media], {
        media: data.ele.media,
      });
    }

    input.value = "";
    data.addMediaLink = false;
  }
  async deleteMedia(imgEle, data) {
    const imgSrc = imgEle.children[0].src;
    const url = `/diet/collections/${this.type}/${this.eleId}/media/`;
    await queryService.query(["deleteMedia", imgSrc, url], {
      queryFn: queryService.createQueryFn(
        url,
        "patch",
        JSON.stringify({ mediaUrl: imgSrc })
      ),
      onSuccess: (ctx) => {
        console.log(imgSrc, imgEle, data.ele.media);
        data.ele.media.filter(
          (media) =>
            media != imgSrc &&
            !(media.startsWith("/media") && imgSrc.includes(media))
        );
        const lastDisplayedImg =
          data.displayedMedia[data.displayedMedia.length - 1];
        const imageLength = data.ele.media.length;
        const lastDisplayedIndex = data.ele.media.indexOf(lastDisplayedImg);
        if (lastDisplayedIndex != imageLength - 1) {
          data.displayedMedia = [
            ...data.displayedMedia.filter(
              (media) =>
                media != imgSrc &&
                !(media.startsWith("/media") && imgSrc.includes(media))
            ),
            data.ele.media[lastDisplayedIndex + 1],
          ];
        } else {
          data.displayedMedia = data.displayedMedia.filter(
            (media) =>
              media != imgSrc &&
              !(media.startsWith("/media") && imgSrc.includes(media))
          );
        }
        data.mediaIndex = 0;
        console.log(data, imgSrc);

        return ctx.data;
      },
      force: true,
      onError: (ctx) => {
        console.log(ctx);
      },
      ttl: 60 * 1000,
    });
  }
  expandMediaViewer(data, paginator) {
    data.mode = "mediaViewer";
    this.anchorEl.classList.add("d-none");
    paginator.pageClass.mode = 1;
    paginator.data.page = 0;
    paginator.data.next = true;

    paginator.paginateTo("next");
  }
  expandImage(data, imgIndex, paginator) {
    data.mode = "fullImages";
    paginator.pageClass.mode = 1;
    paginator.data.next = true;
    paginator.data.page = imgIndex;
    paginator.paginateTo("next");
  }
  restViewer(data, paginator, updatafn) {
    if (data.mode === "fullImages") {
      this.expandMediaViewer(data, paginator);
    } else {
      data.mode = "details";
      setTimeout(() => {
        if (updatafn) updatafn(0);
        paginator.paginateTo("page1");
      }, 300);
      this.anchorEl.classList.remove("d-none");
    }
  }
}
