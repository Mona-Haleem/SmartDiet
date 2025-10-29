/**
 * AuthForm.js
 * A concrete component for handling authentication forms.
 * Extends the base Component class.
 */

import { queryService } from "../../common/script.js";
import Component from "./Component.js";
import { validators } from "../helpers/utils/validators.js";
import * as dom from "../helpers/utils/DomUtils.js";
import  NavigationManager from "../helpers/utils/NavigationManager.js" ;
export default class AuthForm extends Component {
  static PopStateEvent;
  constructor(el, refs, data) {
    super(el, refs, data);
    this.errorContainer = this.$refs["error-container"] || null;
   
    if (!AuthForm.PopStateEvent){
      AuthForm.PopStateEvent = AuthForm.handelPopStateEvent(this.instanceId)
    }
    
    if(NavigationManager.allowPush && !NavigationManager.initState)
      NavigationManager.pushUrl(this.$el.name);

    NavigationManager.initState = false
  }

  static handelPopStateEvent(instanceId){
    NavigationManager.onPopState(({url})=>{
      NavigationManager.allowPush = false;
      Component.instances[instanceId].swapContent(url.replace(/diet(?:\/users)?\//, 'diet/users/'))
      NavigationManager.allowPush = true;
    })
    return true
  }

  validateForm(ctx) {
    let isInvalid = false;
    const formData = new FormData(this.$el);
    for (const [key, input] of Object.entries(this.$data.inputRefs)) {
      if (!(input instanceof HTMLInputElement)) continue;

      const validator = validators[key];
      if (!validator) continue;
   
      const value = input.value?.trim() || "";
      const secParam = key === "confirmation" ? this.$data.inputRefs.password.value : undefined;
        console.log(value,secParam)

      if (!validator.validate(value, secParam)) {
        input.classList.add('isInvalid');
        isInvalid = true;
        dom.showError(validator.errorMsg, input.closest('p').nextElementSibling, false);
      }else{
        input.classList.remove('isInvalid')
        dom.removeError(input.closest('p').nextElementSibling)
      }
    }

    if (isInvalid) {
      throw new Error("Invalid form entries. Please correct the errors.");
    }
    ctx.body = formData;
  }

  async submitForm(e, url) {
    queryService.query([url,new FormData(this.$el)], {
      queryFn: queryService.createQueryFn(url, "post"),
      prefetch: (ctx) => this.validateForm(ctx),
      onSuccess: (ctx) => {
        super.swapContent(ctx.data);
      },
      onError: (response) => this.showServerErrors(response),
      ttl: 24 * 60 * 60 * 1000,
    });
  }

  async showServerErrors({ response }) {
    this.$data.errors = response?.data?.errors
      ? Object.values(response.data.errors).flat()
      : [response?.message || "Unexpected error"];
  }

  async swapContent(url) {
    queryService.query(url, {
      queryFn: queryService.createQueryFn(url, "get"),
      onSuccess: (ctx) => {
        super.swapContent(ctx.data);
      },
      onError: (ctx) => console.log(ctx),
      ttl: Infinity,
    });
  }
}
