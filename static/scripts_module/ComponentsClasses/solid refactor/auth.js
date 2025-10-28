// AuthForm.js
import { queryService } from "../../common/script.js";
import Component from "./Component.js";
import { validators } from "../validators.js";
import * as dom from "../helpers/utils/DomUtils.js";
import NavigationManager from "../helpers/NavigationManager.js";

export default class AuthForm extends Component {
  static navigation = null;
  static initState = true;
  static isSwapping = false;

  constructor(el, refs, data) {
    super(el, refs, data);
    this.errorContainer = this.$refs["error-container"] || null;

    if (!AuthForm.navigation) {
      AuthForm.navigation = new NavigationManager({
        onPopState: (url) => this.handleNavigation(url),
      });
      AuthForm.navigation.init();
    }

    if (!AuthForm.isSwapping && !AuthForm.initState) {
      AuthForm.navigation.push(this.$el.name + "/");
    }

    AuthForm.initState = false;
  }

  handleNavigation(url) {
    AuthForm.isSwapping = true;
    const normalizedUrl = url.replace(/diet(?:\/users)?\//, "diet/users/");
    this.swapContent(normalizedUrl);
    AuthForm.isSwapping = false;
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

      if (!validator.validate(value, secParam)) {
        isInvalid = true;
        dom.showError(validator.errorMsg, input.closest("p").nextElementSibling, false);
      } else {
        dom.removeError(input.closest("p").nextElementSibling);
      }
    }

    if (isInvalid) throw new Error("Invalid form entries. Please correct the errors.");
    ctx.body = formData;
  }

  async submitForm(e, url) {
    queryService.query(url, {
      queryFn: queryService.createQueryFn(url, "post"),
      prefetch: (ctx) => this.validateForm(ctx),
      onSuccess: (ctx) => {
        if (this.$el.name === "register") super.swapContent(ctx.data);
      },
      onError: (response) => this.showServerErrors(response),
      force: true,
      ttl: Infinity,
    });
  }

  async showServerErrors({ response }) {
    this.$data.errors = response.data?.errors
      ? Object.values(response.data.errors).flat()
      : [response.message || "Unexpected error"];
  }

  async swapContent(url) {
    queryService.query(url, {
      queryFn: queryService.createQueryFn(url, "get"),
      onSuccess: (ctx) => super.swapContent(ctx.data),
      onError: (ctx) => console.log(ctx),
      force: true,
      ttl: Infinity,
    });
  }
}
