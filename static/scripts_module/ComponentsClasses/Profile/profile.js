import Component from "../Component.js";
import { queryService } from "../../../common/script.js";
import { isValidImg } from "../../helpers/utils/validators.js";
export default class Profile extends Component {
  constructor(el, refs, data) {
    super(el, refs, data);
    this._init();
    this.customRefs = {};
    window.addEventListener("resize", () => {
      if (window.innerWidth <= 992) {
        this.$data.full = false;
        this.collapseLine = 7;
      } else {
        this.collapseLine = 10;
        this.$data.full = true;
      }
    });
  }

  _init() {
    this.$data.full = window.innerWidth > 992;
    this.collapseLine = window.innerWidth <= 992 ? 7 : 10;
    this.$data.collapse =
      this.$data.user.restrictions.length > this.collapseLine;
    const restrictions = this.$refs.restrictionsTable;
   

    restrictions.addEventListener("change", (e) => {});
  }
  updateAvatarImage() {
    let input = this.$refs.imgUpload;
    const file = input.files[0];
    if (file) {
      if (!isValidImg(file)) return;
      const formData = new FormData();
      formData.append("avatar_img", file);
      console.log("file", file);
      this.updateServerData(["updateImg", file.name], formData, (ctx) => {
        console.log(ctx.data);
        this.$refs.avataImg.src = ctx.data.image_url;
      });
    }
  }

  updateUserName() {
    console.log("called");
    const input = this.$refs.nameInput;
    const newName = input.value.trim();
    const orgName = this.$data.orgValue;
    if (newName == orgName) {
      this.$data.editMode = false;
      return;
    }
    this.updateServerData(
      ["updateUsername", newName],
      JSON.stringify({ username: newName }),
      (ctx) => {
        input.classList.remove("invalid");
        this.$data.user.username = newName;
        this.$data.editMode = false;
      },
      () => {
        if (!input.classList.includes("invalid")) {
          input.classList.add("invalid");
          input.focus();
        } else {
          input.classList.remove("invalid");
          this.$data.editMode = false;
        }
      }
    );
  }

  updateUserData(input, key) {
    this.updateServerData(
      ["updateUsername", key, input.value],
      JSON.stringify({ [key]: input.value }),
      (ctx) => {
        this.$data.user[key] = input.value;
        if ("age" in ctx.data) {
          this.$data.user.age = ctx.data.age;
        }
      }
    );
  }

  addRestriction(type) {
    if (this.$data.isAdding) return;
    this.isAdding = true;
    this.$data.user.restrictions.push({
      id: "temp",
      type: type,
      name: "",
      remark: "",
      isTemp: true,
      invalid: false,
    });
    this.$data.collapse =
      this.$data.user.restrictions.length > this.collapseLine;
    this.$data.activeType = type;
    setTimeout(()=>{
      this.customRefs["temp"]["name"]?.focus();

    },10)
  }

  updateRestrictions(id, type) {
    console.log(this.$data.user.restrictions);
    const nameInput = this.customRefs[id]["name"];
    const remarkInput = this.customRefs[id]["remark"];
    // const oldValue = this.$data.user.restrictions.find((r) => r.id === id);
    const newValue = {
      id,
      name: nameInput?.value?.trim(),
      remark: remarkInput?.value?.trim(),
      type,
    };
    if (!this.validRestrictions(newValue)) {
      // nameInput.value = oldValue.name;
      // remarkInput.value = oldValue.remark;
      return;
    }
    if (!newValue.name) {
      nameInput.focus();
      return;
    }
    const url = `/diet/users/restrictions/${id}`;
    if (id == "temp") this.saveRestriction(newValue, url);
    else this.updateRestrictionsDate(newValue, url);
  }
  saveRestriction(newValue, url) {
    const restrictions = this.$data.user.restrictions;
    queryService.query(["addRestriction", url], {
      queryFn: queryService.createQueryFn(
        url,
        "post",
        JSON.stringify(newValue)
      ),
      onSuccess: (ctx) => {
        // for (let key in oldValue) {
        //   oldValue[key] = ctx.data.restriction[key];
        // }
        restrictions.splice(restrictions.length - 1, 1);
        restrictions.push(ctx.data.restriction);
        this.$data.isAdding = false;
      },
      force: true,
      onError: (ctx) => {
        restrictions.splice(restrictions.length - 1, 1);
        this.$data.collapse =
          this.$data.user.restrictions.length > this.collapseLine;
        console.log(ctx);
        this.$data.isAdding = false;
      },
    });
  }

  updateRestrictionsDate(newValue, url) {
    queryService.query(["UpdateRestriction", newValue, url], {
      queryFn: queryService.createQueryFn(url, "put", JSON.stringify(newValue)),
      onSuccess: () => {
        // oldValue.name = newValue.name;
        // oldValue.remark = newValue.remark;
      },
      force: true,
      onError: (ctx) => {
        console.log(ctx);
      },
    });
  }
  validRestrictions(newValue) {
    if (!(newValue.name || newValue.remark)) return false;
    const dublicate = this.$data.user.restrictions.filter(
      (r) =>
        r.name == newValue.name &&
        r.remark == newValue.remark &&
        r.id !== newValue.id
    );
    if (dublicate.length) return false;
    return true;
  }
  async removeRestriction(id) {
    const restrictions = this.$data.user.restrictions;
    const info = restrictions.find(r => r.id == id);
    const index = restrictions.findIndex(r => r.id == id);
    console.log(info);
    const url = `/diet/users/restrictions/${id}`;
    await queryService.query(["deleteRestriction", id, url], {
      queryFn: queryService.createQueryFn(url, "delete"),
      onSuccess: () => {
        restrictions.splice(index, 1);
        this.$data.collapse =
          this.$data.user.restrictions.length > this.collapseLine;
      },
      onError: (ctx) => {
        console.log(ctx);
      },
    });
  }

  getRestrictionsByType(type) {
    return this.$data.user.restrictions.filter((r) => r.type === type);
  }

  async updateServerData(
    keyList,
    data,
    sucessFun = () => {},
    errFun = () => {}
  ) {
    const url = window.location.pathname + "update/";
    const method = keyList.includes("updateImg") ? "post" : "patch";
    await queryService.query([...keyList, url], {
      queryFn: queryService.createQueryFn(url, method, data),
      onSuccess: (ctx) => {
        console.log("sucess");
        sucessFun(ctx);
        return ctx.data;
      },
      onError: (ctx) => {
        errFun(ctx);
        console.log(ctx);
      },
      ttl: 60 * 1000,
    });
  }

  registerRef(id, field, element) {
    if (!this.customRefs[id]) {
      this.customRefs[id] = {};
    }
    this.customRefs[id][field] = element;
  }
  unregisterRef(id, field) {
    if (this.customRefs[id]) {
      delete this.customRefs[id][field];

      // If no fields left for this ID, remove the entire entry
      if (Object.keys(this.customRefs[id]).length === 0) {
        delete this.customRefs[id];
      }
    }
  }
}
