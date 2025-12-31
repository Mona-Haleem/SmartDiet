import { queryService } from "../../common/script.js";
export default class CreationForm {
  constructor(data, refs) {
    this.data = data;
    this.refs = refs;
    console.log(this.data)
    const isPlan = this.data.$data.selectedPlanType
    if(!!isPlan){
      this.data.currentType = 'plan';
    }
    this.open(this.data.currentType,isPlan);
  }

  validate() {
    const errors = {};

    const { formData, currentType } = this.data;
    console.log(formData,this.data.formData,this.data.$data.formData)
    // Name validation
    if (!formData.name?.trim()) {
      errors.name = "Name is required";
    } else if (formData.name.length > 50) {
      errors.name = "Name must be less than 100 characters";
    }

    // Plan category validation
    if (currentType === "plan") {
      const allowed = ["diet", "exercise", "full"];
      if (!allowed.includes(formData.category)) {
        errors.category = "Please select a plan type";
      }
    }

    // Recipe validations
    if (currentType === "recipe") {
      if (formData.serv && formData.serv < 1) {
        errors.serv = "Servings must be at least 1";
      }
      if (formData.prep_time_hours && formData.prep_time_hours < 0) {
        errors.prep_time_hours = "Hours cannot be negative";
      }
      if (
        formData.prep_time_minutes &&
        (formData.prep_time_minutes < 0 || formData.prep_time_minutes > 59)
      ) {
        errors.prep_time_minutes = "Minutes must be between 0 and 59";
      }
    }

    // Plan validations
    if (currentType === "plan") {
      if (formData.duration_days && formData.duration_days < 1) {
        errors.duration_days = "Duration must be at least 1 day";
      }
    }

    return errors;
  }

  async submit() {
    console.log(this.data)
    this.data.errors = this.validate();
    if (Object.keys(this.data.errors).length > 0) {
      return;
    }

    this.data.isSubmitting = true;

    if(this.data.currentType ==  'plan' && this.data.formData.category !== 'full'){
      this.data.formData.diet_plan_id = null;
      this.data.formData.exercise_plan_id = null;

    }
    if(this.data.currentType == 'recipe' && window.ingredientInput && window.ingredientInput?.data.ingredients)
      this.data.formData.ingredients = ingredientInput.data.ingredients;
    const url = `/diet/collections/${this.data.currentType}s/new/${this.data.formData.name}/`;
    await queryService.query(["createEle"], {
      queryFn: queryService.createQueryFn(url, "post", JSON.stringify({
        ...this.data.formData,
        type:this.data.currentType
      })),
      force: true,
      onSuccess: (ctx) => {
        this.data.showSuccess = true;
        this.data.successMessage = ctx.data.message || "Created successfully!";

        setTimeout(async () => {
          this.close();
          console.log(!!window.homeManager,!!window.dayProgress)
          if(window.homeManager && window.homeManager.setCurrPlan){
            await homeManager.setCurrPlan(ctx.data.id, ctx.data.category)
            homeManager.$data.allPlans?.push({
              id:ctx.data.id,
              name:ctx.data.name,
              category: ctx.data.type
            })
          }else if (window.dayProgress && window.dayProgress.setCurrPlan){
            window.dayProgress.setCurrPlan(ctx.data.id,ctx.data.category)
            dayProgress.$data.allPlans?.push({
              id:ctx.data.id,
              name:ctx.data.name,
              category: ctx.data.type
            })
          }else if (ctx.data.redirect) {
            window.location.href = ctx.data.redirect;
          }
        }, 1500);
        this.data.isSubmitting = false;
      },
      onError: (ctx) => {
        console.log(ctx.response)
        if(ctx.response.data.errors)
          this.data.errors = ctx.response.data.errors || {};
        else
          this.data.errors = { __all__: ctx.response.data.error };
        this.data.isSubmitting = false;
        console.log(this.data.errors)
      },
    });
  }

  open(type = "recipe",planType='diet') {
    setTimeout(() => (this.data.isOpen = true), 300);
    this.resetForm(type);
    this.data.currentType = type;
    this.data.formData.category = planType; 
    document.body.style.overflow = "hidden";
  }

  close(parentFlag) {
    this.data.isOpen = false;
    this.data.showSuccess = false;
    this.data.errors = {};
    
    setTimeout(() => (this.data.$data.showAddForm = false), 300);
    console.log(this.data.$data.showAddForm);
  }

  switchType(type) {
    this.data.currentType = type;
    this.resetForm(type);
    this.data.errors = {};
  }

  resetForm(type) {
    this.data.formData = {
      name: "",
      category: type === "plan" ? "" : "",
      notes: "",
      shared: false,
      favorite: false,
      ...(type === "recipe"
        ? {
            prep_time_hours: 0,
            prep_time_minutes: 0,
            serv: 1,
            ingredients: "",
          }
        : {
            duration_preset: "7",
            duration_days: 7,
            goal: "",
            create_default_sections: true,
          }),
    };
  }

  clearError(field) {
    delete this.data.errors[field];
  }

  selectCategory(category) {
    this.data.formData.category = category;
    this.data.showCategorySuggestions = false;
  }

  moveDown() {
    if (!this.data.showCategorySuggestions) return;
    this.data.activeSuggestion =
      (this.data.activeSuggestion + 1) % this.data.categorySuggestions.length;
  }

  moveUp() {
    if (!this.data.showCategorySuggestions) return;
    this.data.activeSuggestion =
      (this.data.activeSuggestion - 1 + this.data.categorySuggestions.length) %
      this.data.categorySuggestions.length;
  }

  selectActive() {
    console.log(this.data.activeSuggestion)
    if (this.data.activeSuggestion >= 0) {
      this.selectCategory(this.data.categorySuggestions[this.data.activeSuggestion]);
      this.data.showCategorySuggestions = false;
      this.data.activeSuggestion = -1;
    }
  }

  updateDuration() {
    if (this.data.formData.duration_preset) {
      this.data.formData.duration_days = parseInt(
        this.data.formData.duration_preset
      );
    }
  }
}
