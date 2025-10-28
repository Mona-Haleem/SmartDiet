/**
 * AuthForm.js
 * A concrete component for handling authentication forms.
 * Extends the base Component class.
 */

import { queryService } from "../../common/script.js";
import Component from "./Component.js";
import { validators } from "../validators.js";
import * as dom from "../helpers/utils/DomUtils.js";
import { swapContent } from "../helpers/utils/DomUtils.js";
export default class AuthForm extends Component {
  static PopStateEvent;
  static isSwaping = false
  static initState = true
  constructor(el, refs, data) {
    super(el, refs, data);
    //window.history.pushState({}, "", this.$el.name);
    this.errorContainer = this.$refs["error-container"] || null;
    if (!AuthForm.PopStateEvent){
      AuthForm.PopStateEvent = AuthForm.handelPopStateEvent(this.instanceId)
    }
    if(!AuthForm.isSwaping && !AuthForm.initState)
      dom.pushUrl(this.$el.name+"/");
    console.log("Constructor end:", this.$el);
    
    AuthForm.initState = false
  }

  static handelPopStateEvent(instanceId){
    dom.onPopState(({url})=>{
      AuthForm.isSwaping = true
      console.log('inside',Component.instances[instanceId].$el)
      Component.instances[instanceId].swapContent(url.replace(/diet(?:\/users)?\//, 'diet/users/'))
      AuthForm.isSwaping = false
    })
    return true
  }

  validateForm(ctx) {
    let isInvalid = false;
    console.log('----------------prefetching----------------',this.$data)


    const formData = new FormData(this.$el);
    for (const [key, input] of Object.entries(this.$data.inputRefs)) {
      if (!(input instanceof HTMLInputElement)) continue;

      const validator = validators[key];
      if (!validator) continue;
      const value = input.value?.trim() || "";
      const secParam = key === "confirmation" ? this.$data.inputRefs.password.value : undefined;
        console.log(value,secParam)

      if (!validator.validate(value, secParam)) {
        isInvalid = true;
        console.log(key,isInvalid)

        // Show all errors at once
        dom.showError(validator.errorMsg, input.closest('p').nextElementSibling, false);
      }else{
        dom.removeError(input.closest('p').nextElementSibling)
      }
    }

    if (isInvalid) {
      throw new Error("Invalid form entries. Please correct the errors.");
    }
    ctx.body = formData;
  }

  async submitForm(e, url) {
    queryService.query(url, {
      queryFn: queryService.createQueryFn(url, "post"),
      prefetch: (ctx) => this.validateForm(ctx),
      onSuccess: (ctx) => {
        if (this.$el.name == "register") super.swapContent(ctx.data);
        console.log("Success:", ctx, this.$el);
      },
      onError: (response) => this.showServerErrors(response),
      force: "true",
      ttl: Infinity,
    });
  }

  async showServerErrors({ response }) {
    console.log(response);
    this.$data.errors = response.data?.errors
      ? Object.values(response.data.errors).flat()
      : [response.message || "Unexpected error"];
  }

  async swapContent(url) {
    console.log(url)
    queryService.query(url, {
      queryFn: queryService.createQueryFn(url, "get"),
      onSuccess: (ctx) => {
        super.swapContent(ctx.data);
      },
      onError: (ctx) => console.log(ctx),
      force: "true",
      ttl: Infinity,
    });
  }
}
