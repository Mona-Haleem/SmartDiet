import Component from "../Component.js";
import { queryService } from "../../../common/script.js";

export default class ProgressHeader extends Component {
  constructor(el, refs, data) {
    super(el, refs, data);
    this.avgScoreCache = {};
    this._init();
  }

  _init() {
    this.fetchAvgScore();
  }

  switchPlanType(type) {
    if (this.$data.selectedPlanType === type) return;
    
    this.$data.selectedPlanType = type;
    
    // Trigger data reload based on current view
    if (this.$data.currentView === 'day' && window.dayProgress) {
      window.dayProgress.loadDayData(this.$data.selectedDate);
    } else if (window.periodProgress) {
      window.periodProgress.loadPeriodData();
    }
    
    // Fetch new avg score
    this.fetchAvgScore();
  }

  async changePeriod() {
    const period = this.$data.selectedPeriod;
    
    // Update view
    this.$data.currentView = period;
    
    // Load appropriate data
    if (period === 'day' && window.dayProgress) {
      window.dayProgress.loadDayData(this.$data.selectedDate);
    } else if (window.periodProgress) {
      window.periodProgress.loadPeriodData();
    }
    
    // Fetch new avg score
    this.fetchAvgScore();
    if(period !== 'day'){
      await periodProgress.loadPeriodData();
      periodProgress.getSummary();
    }else{

    }
  }

  async fetchAvgScore() {
    const { selectedPlanType, selectedPeriod, selectedDate } = this.$data;
    const cacheKey = `${selectedPlanType}_${selectedPeriod}_${selectedDate}`;
 
    const url = `/diet/progress/avg-score/?type=${selectedPlanType}&period=${selectedPeriod}&date=${selectedDate}`;
    
    await queryService.query(['avgScore', cacheKey, url], {
      queryFn: queryService.createQueryFn(url, 'get'),
      onSuccess: (ctx) => {
          const score = ctx.data.avgScore
            this.$data.avgScore = score ? Math.round(score) : '--';
      },
      ttl: 2 * 60 * 1000,
      force:selectedPeriod == 'day'
    });
  }

  // getAvgScore() {
  //   const { selectedPlanType, selectedPeriod, selectedDate } = this.$data;
  //   const cacheKey = `${selectedPlanType}_${selectedPeriod}_${selectedDate}`;
  //   const score = this.avgScoreCache[cacheKey];
  //   this.$data.avgScore = score !== undefined ? Math.round(score) : '--';
  //   return score !== undefined ? Math.round(score) : '--';
  // }
}

console.log("header loaded")