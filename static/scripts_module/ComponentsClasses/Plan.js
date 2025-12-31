import { queryService, cache } from "../../common/script.js";
import DietEle from "./DietEle.js";
import { formatDate, formatDuration } from "../helpers/utils/DataFromater.js";
import MediaManager from "./detailsPage/mediaManager.js";
import SectioEditor from "./SectionsEditor.js";
import DetailsEditor from "./detailsEditor.js";
export default class Plan extends DietEle {
  constructor(ele, refs, data, paginatorUpdateFn, extraRefs) {
    super(ele, refs, data, paginatorUpdateFn, extraRefs);
    this.extraRefs = extraRefs;
    this.mediaManager = new MediaManager(
      this.$data.ele.creation_id,
      this.$data.ele.type,
      this.updateServerData,
      this.extraRefs.anchor
    );
    if (this.$data.ele.type == "plan") {
      this.$data.sections = {};
      this._populateSectionObjects();
      this.sectionsEditor = new SectioEditor(this.$data.sections);
    }
    console.log(this.$data.ele);
    if (this.$data.ele.type == "recipe") {
      this.orgIngridents = JSON.parse(
        JSON.stringify(this.$data.ele.ingredients)
      );
      this.$data.sections = {
        directions: {
          data: {
            section: "directions",
            detail: this.$data.ele.directions,
          },
        },
      };
    }
    this.detailsEditor = new DetailsEditor();

    console.log(this.$data.next);
    this.$data.ele.created = formatDate(this.$data.ele.created);
    this.$data.ele.edited = formatDate(this.$data.ele.edited);
    this.$data.ele.formatedDuration = formatDuration(this.$data.ele.duration);
  }

  _populateSectionObjects(data, parentId = null) {
    const sections = data || this.$data.ele.details;
    for (let i = 0; i < sections.length; i++) {
      let currentSection = sections[i];
      if (currentSection.subSections.length) {
        this._populateSectionObjects(
          currentSection.subSections,
          currentSection.id
        );
      }
      this.$data.sections[currentSection.id] = {
        data: currentSection,
        ref: this.$refs[`section-${currentSection.id}`],
        // sectionObj: new Section(
        //   currentSection.id,
        //   this.$data.sections,
        // ),
        parentId,
      };
    }
  }

  async updateName(targetEle) {
    const newName = targetEle.innerText.trim();
    const orgName = this.$data.ele.name;
    console.log(newName, orgName);
    if (newName === orgName) return;
    if (newName) {
      await this.updateServerData(
        ["updateName", newName],
        { name: newName },
        () => {
          this.$data.ele.name = newName;
          this.extraRefs.anchorName.innerText = newName;
          targetEle.classList.remove("invalid");
        },
        () => {
          targetEle.classList.add("invalid");
          targetEle.focus();
        }
      );
    } else {
      targetEle.innerText = orgName;
    }
  }
  async updateGoal(targetEle) {
    const newGoal = targetEle.innerText.trim();
    const orgGoal = this.$data.ele.goal;
    console.log(newGoal, orgGoal);
    if (newGoal === orgGoal) return;
    if (newGoal) {
      await this.updateServerData(
        ["updateGoal", newGoal],
        { goal: newGoal },
        () => {
          this.$data.ele.goal = newGoal;
        }
      );
    } else {
      targetEle.innerText = orgGoal;
    }
  }
  async updateNotes(targetEle) {
    const newNotes = targetEle.innerText.trim();
    const orgNotes = this.$data.ele.notes;
    console.log(newNotes, orgNotes);
    if (newNotes === orgNotes) return;
    if (newNotes) {
      await this.updateServerData(
        ["updateNotes", newNotes],
        { notes: newNotes },
        () => {
          this.$data.ele.notes = newNotes;
        }
      );
    } else {
      targetEle.innerText = orgNotes;
    }
  }
  async updateServing(targetEle) {
    const serving = Number(targetEle.value.trim());
    if (serving && !isNaN(serving)) {
      await this.updateServerData(["updateServ", Math.max(serving, 1)], {
        serv: serving,
      });
    } else {
      targetEle.value = 1;
    }
  }
  async updatePrepTime(targetEle, isHours) {
    let min, hours;
    if (isHours) {
      min = Math.max(0, +targetEle.nextElementSibling.nextElementSibling.value);
      hours = Math.max(0, +targetEle.value);
      if (isNaN(hours)) return;
    } else {
      min = Math.max(0, +targetEle.value);
      hours = Math.max(
        0,
        +targetEle.previousElementSibling.previousElementSibling.value
      );
      if (isNaN(min)) return;
    }
    console.log(min, hours);
    const value = hours * 60 + min;
    await this.updateServerData(["updatePrepTime", value], {
      prep_time: value,
    });
  }

  async saveIng() {
    let ingredients = this.$data.ele.ingredients;
    await this.updateServerData(
      ["updateIngridents"],
      {
        ingredients,
      },
      () => {
        this.orgIngridents = JSON.parse(JSON.stringify(ingredients));
      },
      () => {
        ingredients = this.orgIngridents;
      }
    );
  }
  cancelSaveIng() {
    console.log(this.orgIngridents);
    this.$data.ele.ingredients = this.orgIngridents;
  }
  async updateDuration(targetEle) {
    let duration = Math.max(1, Number(targetEle.value.trim()));
    if (isNaN(duration)) return;
    const value = duration * 24 * 60;
    await this.updateServerData(
      ["updateDuration", value],
      {
        duration: value,
      },
      () => {
        this.$data.ele.formatedDuration = formatDuration(
          `P${targetEle.value}D00H:00M:00S`
        );
      }
    );
  }

  async deleteEle() {
    console.log(dragEle);
    if (!dragEle) return;
    if (dragEle.classList.contains("viewer-img")) {
      await this.mediaManager.deleteMedia(dragEle, this.$data);
      dragEle = null;
      return;
    } else if (dragEle.id && dragEle.id.startsWith("section-")) {
      const sectionId = dragEle.id.replace("section-", "");
      this.$data.sections[sectionId];
      this.sectionsEditor.deleteSection(sectionId, dragEle, this.$data);
    }
  }

  async cloneEle() {
    const url = `/diet/collections/${this.$data.ele.type}s/${this.$data.ele.creation_id}/${this.$data.ele.name}/`;
    await queryService.query(["createEle"], {
      queryFn: queryService.createQueryFn(url, "post"),
      force: true,
      onSuccess: (ctx) => {
        if (ctx.data.redirect) {
          window.location.href = ctx.data.redirect;
        }
      },
      onError: (ctx) => {
        console.log(ctx.response);
      },
    });
  }
  async handleSectionAction(sectionId, action, args = {}) {
    const sectionObj = this.$data.sections[sectionId];
    switch (action) {
      case "createSection":
        this.sectionsEditor.createSection(
          sectionId,
          args.targetRelation,
          this.$refs,
          this.$el,
          this.$data.ele.details
        );
        break;
      case "renameSection":
        this.sectionsEditor.renameSection(
          sectionId,
          args.inputEle,
          sectionObj.parentId,
          sectionObj.data
        );
        break;
      case "reorderSection":
        this.sectionsEditor.reorderSection(
          dragEle?.id?.replace("section-", ""),
          args.targetId,
          args.targetRelation,
          this.$refs
        );
        break;
      case "editDetails":
        this.detailsEditor.init(sectionId);
        break;
    }
  }
  async updateServerData(
    keyList,
    data,
    sucessFun = () => {},
    errFun = () => {}
  ) {
    const url = window.location.pathname;
    await queryService.query([...keyList, url], {
      queryFn: queryService.createQueryFn(url, "patch", JSON.stringify(data)),
      onSuccess: (ctx) => {
        console.log("sucess");
        sucessFun(ctx);
        return ctx.data;
      },
      onError: (ctx) => {
        errFun();
        console.log(ctx);
      },
      force: true,
      ttl: 60 * 1000,
    });
  }
}
