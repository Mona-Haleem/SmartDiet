import { queryService, cache } from "../../common/script.js";
import DietEle from "./DietEle.js";
import { formatDate, formatDuration } from "../helpers/utils/DataFromater.js";
export default class Plan extends DietEle {
  constructor(ele, refs, data, paginatorUpdateFn, extraRefs) {
    super(ele, refs, data, paginatorUpdateFn, extraRefs);
    this.extraRefs = extraRefs;
    console.log(this.$data.ele)

    this.$data.ele.created = formatDate(this.$data.ele.created);
    this.$data.ele.edited = formatDate(this.$data.ele.edited);
    console.log(this.$data.ele)
    this.$data.ele.formatedDuration = formatDuration(this.$data.ele.duration);
    console.log(this.$data.ele.formatedDuration);
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

  async updateDuration(targetEle) {
    let duration = Math.max(1,Number(targetEle.value.trim()));
    if (isNaN(duration)) return;
    const value = duration * 24 * 60;
    await this.updateServerData(
      ["updateDuration", value],
      {
        duration: value,
      },
      () => {
        this.$data.ele.formatedDuration = formatDuration(`P${targetEle.value}D00H:00M:00S`);
      }
    );
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
        sucessFun();
        return ctx.data;
      },
      onError: (ctx) => {
        errFun();
        console.log(ctx);
      },
      ttl: 60 * 1000,
    });
  }
}
