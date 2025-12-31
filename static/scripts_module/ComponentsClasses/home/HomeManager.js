import { queryService } from "../../../common/script.js";
import Component from "../Component.js";
export default class HomeManager extends Component {
  constructor(el, refs, data) {
    super(el, refs, data);
    this.allPlans = [];
    this.currentDietPlan = null;
    this.currentExercisePlan = null;
    window.homeManager = this;
    this._init();
  }

  _init() {
    // Plans are passed from Django template via Alpine data
    this.allPlans = this.$data.allPlans || [];
    console.log("HomeManager initialized with plans:", this.allPlans);
  }

  async setCurrPlan(planId, planType, replace=true) {
    try {
      if (planId === "new") {
        return;
      }

      const url = "/diet/dailyplan/set/";

      await queryService.query(["setPlan", planId, planType, url], {
        queryFn: queryService.createQueryFn(
          url,
          "post",
          JSON.stringify({
            plan_id: planId,
            start_date: new Date().toISOString().split("T")[0],
            replace,
          })
        ),
        onSuccess: (ctx) => {
          this.$data.todayPlans[planType] = ctx.data.plan;
          const anchorLink = this.$refs[`anchorLink-${planType}`];
          console.log(this.$refs.anchorLink,anchorLink)
          if (anchorLink) {
            const encodedName = encodeURIComponent(ctx.data.plan.name);

            anchorLink.href = anchorLink.href
              .replace(/\/\d+\//, `/${ctx.data.plan.id}/`)
              .replace(/\/[^/]+\/$/, `/${encodedName}/`);
          }
          if (window.dayProgress) {
            window.dayProgress.loadDayData(this.$data.selectedDate);
          }
        },
        force: true,
      });
    } catch (error) {
      console.error("Error setting plan:", error);
    }
  }
}

console.log("HomeManager loaded");
