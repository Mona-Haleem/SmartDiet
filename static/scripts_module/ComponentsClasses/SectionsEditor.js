import { queryService, cache } from "../../common/script.js";
import DietEle from "./DietEle.js";
import { formatDate, formatDuration } from "../helpers/utils/DataFromater.js";
import MediaManager from "./detailsPage/mediaManager.js";
export default class SectioEditor {
  constructor(sectionDict) {
    this.sectionDict = sectionDict;
  }

  async renameSection(sectionId, targetEle, parentId, data) {
    const newName = targetEle.innerText.trim().replace(/:$/, "");
    const orgName = data.section;
    const invalidNames = this._getAvoidableTitles(parentId);
    console.log(newName, orgName);
    if (newName === orgName) return;
    if (invalidNames.includes(newName)) {
      if (!targetEle.classList.contains("invalid")) {
        targetEle.classList.add("invalid");
        targetEle.focus();
        return;
      } else {
        targetEle.innerText = orgName;
        targetEle.classList.remove("invalid");
        return;
      }
    }
    const url = `/diet/collections/plans/sections/${sectionId}/`;
    if (newName) {
      await queryService.query(["renameSection", url, newName], {
        queryFn: queryService.createQueryFn(
          url,
          "patch",
          JSON.stringify({ section: newName })
        ),
        onSuccess: (ctx) => {
          console.log("sucess", ctx.data);
          targetEle.classList.remove("invalid");
          data.section = newName;
          //quickNav update
          return ctx.data;
        },
        onError: (ctx) => {
          console.log(ctx);
          targetEle.classList.add("invalid");
          targetEle.focus();
        },
      });
    } else {
      targetEle.innerText = orgName;
    }
  }
  async reorderSection(sectionId, targetId, targetRelation, refs) {
    const order = this._getNewSectionOrder(targetId, targetRelation);
    const parentId =
      targetRelation == "parent"
        ? targetId
        : this.sectionDict[targetId].parentId;

    const url = `/diet/collections/plans/sections/${sectionId}/`;
    await queryService.query(["reorderSection", sectionId, url], {
      queryFn: queryService.createQueryFn(
        url,
        "patch",
        JSON.stringify({
          order,
          parentId,
        })
      ),
      onSuccess: (ctx) => {
        console.log("sucess", ctx.data);
        //ui update
        const sectionEle = refs[`section-${sectionId}`];
        const targetEle = refs[`section-${targetId}`];
        if (targetRelation == "parent") {
          targetEle.appendChild(sectionEle);
        } else {
          targetEle.parentElement.insertBefore(sectionEle, targetEle.nextSibling);
        
        }
        //quicknav update
        if(parentId !== this.sectionDict[sectionId].parentId){
          const eleObj = this.sectionDict[sectionId]
          const newParent =this.sectionDict[parentId] 
          const oldParent = this.sectionDict[eleObj.parentId] 
          newParent?.data.subSections.push(eleObj.data)
          if(oldParent)
            oldParent.data.subSections = 
              oldParent?.data.subSections.filter(ele => ele.id = sectionId)
          this.sectionDict[sectionId].parentId =parentId;
        }
        // reorder updates
        return ctx.data;
      },
      onError: (ctx) => {
        console.log(ctx);
      },
    });
  }
  async updateDetails(sectionId, input, data) {
    // simple patch update like section name for now
    /**will be updated with functions
     * add list
     * addlist item
     * add paragraph
     * add ref
     * add link
     * add image
     * move up
     * move down
     * format selected
     * on save this fun is called*/
  }

  async createSection(targetId, targetRelation) {
    const url = `/diet/collections/plans/sections/${targetId}`;
    const parentId =
      targetRelation == "parent"
        ? targetId
        : this.sectionDict[targetId].parentId;
    const avoidableTitles = this._getAvoidableTitles(parentId);
    let title = "section";
    let num = 1;
    while (avoidableTitles.includes(title)) {
      title = `section (${num})`;
      num++;
    }
    const order = this._getNewSectionOrder(targetId, targetRelation);
    await queryService.query(["CreateSection", targetId, url], {
      queryFn: queryService.createQueryFn(
        url,
        "post",
        JSON.stringify({
          section: title,
          order,
          targetId,
          targetRelation,
        })
      ),
      onSuccess: (ctx) => {
        console.log("sucess", ctx.data);
        //ui update
        const html = ctx.data;
        const tpl = document.createElement("template");
        tpl.innerHTML = html.trim();
        const newEl = tpl.content.firstElementChild;

        if (!newEl) throw new Error("No valid root element in template");
        const targetEle = this.sectionDict[targetId].ref;
        if (targetRelation == "parent") {
          targetEle.appendChild(newEl);
        } else {
          targetEle.insertAdjacentElement("afterend", newEl);
        }
        //quicknav update

        // data update
        //additem to the dict
        newId = ctx.data.id.replace("section-", "");
        this.sectionDict[newId] = {
          data: ctx.data,
          ref: newEl,
          parentId,
        };
        //update order for next siblings if any
        //redo ui calcus for paging and resize
        return ctx.data;
      },
      onError: (ctx) => {
        console.log(ctx);
      },
    });
  }
  async deleteSection(id, eleRef, data) {
    const url = `/diet/collections/plans/sections/${id}/`;
    await queryService.query(["deleteSection", id, url], {
      queryFn: queryService.createQueryFn(url, "delete"),
      onSuccess: (ctx) => {
        console.log("sucess", ctx.data);
        eleRef.remove();
        delete this.sectionDict[id];
        for (const key in this.sectionDict) {
          if (this.sectionDict[key].parentId == id) {
            delete this.sectionDict[key];
          }
        }
        data.details = ctx.data.detials;
        let page = eleObj.sectionNavigator.getSectionPage(
          `section-${id}`,
          eleObj.mode
        );
        eleObj.updateData(page);
        eleObj.onPaginate(undefined, page);
        //redo ui calcus for paging and resize
        return ctx.data;
      },
      onError: (ctx) => {
        console.log(ctx);
      },
    });
  }

  _getAvoidableTitles(parentId) {
    const avoidableTitles = [];
    for (const key in this.sectionDict) {
      if (this.sectionDict[key].parentId == parentId) {
        avoidableTitles.push(this.sectionDict[key].data.section);
      }
    }
    return avoidableTitles;
  }
  _getNewSectionOrder(targetId, targetRelation) {
    if (targetRelation == "parent") {
      const maxOrder = 0;
      for (const key in this.sectionDict) {
        if (
          this.sectionDict[key].parentId == parentId &&
          this.sectionDict[key].data.order > maxOrder
        ) {
          maxOrder = this.sectionDict[key].data.order;
        }
      }
      return maxOrder + 1;
    } else {
      return this.sectionDict[targetId].data.order + 1;
    }
  }
}
