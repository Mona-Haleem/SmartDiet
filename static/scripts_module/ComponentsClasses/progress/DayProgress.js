import Component from "../Component.js";
import { queryService } from "../../../common/script.js";

export default class DayProgress extends Component {
  constructor(el, refs, data) {
    super(el, refs, data);
    this.planName = '';
    this.planGoal = '';
    this.currentDay = 1;
    this.planSections = [];
    this.metrics = [];
    this.feedback = '';
    this.isSaving = false;
    this.savedAt = '';
    this.$data.showMetricModal = false;
    this.showInactiveModal = false;
    this.$data.editingMetric = null;
    this.$data.metricForm = {};
    this.inactiveMetrics = [];
    window.dayProgress = this;
    this._init();
  }


  _init() {
    this.loadDayData(this.$data.selectedDate);
  }

  async loadDayData(date) {
    const planType = this.$data.selectedPlanType;
    const url = `/diet/progress/day/?date=${date}&type=${planType}`;
    
    await queryService.query(['dayData', date, planType, url], {
      queryFn: queryService.createQueryFn(url, 'get'),
      onSuccess: (ctx) => {
        const data = ctx.data;
        this.$data.planName = data.plan_name || 'No Plan';
        this.$data.planId = data.planId
        this.$data.planGoal = data.plan_goal || '';
        this.$data.currentDay = data.current_day || 1;
        this.$data.planSections = data.plan_sections || [];
        this.$data.metrics = data.metrics || [];
        this.$data.feedback = data.feedback || '';
        this.$data.existingMetrics =data.unusedMetrics || [];
        progressHeader.fetchAvgScore()
        console.log(this.$data.metrics)
      },
      force: true
    });
  }

  expandSection(section) {
    section.expanded = !section.expanded;
  }

  selectMetric(metric) {
    // Could be used for highlighting or additional actions
  }

  async updateMetricValue(metric, newValue) {
    const oldValue = metric.value;
    metric.value = newValue;
    
    const url = `/diet/progress/metric/${metric.id}/value/`;
    await queryService.query(['updateMetricValue', metric.id, url], {
      queryFn: queryService.createQueryFn(url, 'patch', JSON.stringify({ 
        value: newValue,
        date: this.$data.selectedDate,
        plan_type: this.$data.selectedPlanType 
      })),
      onSuccess:() =>{
        this.loadDayData(this.$data.selectedDate);
        progressHeader.fetchAvgScore();
      },
      onError: () => {
        metric.value = oldValue;
        alert('Failed to update metric value');
      },
      force: true
    });
  }

  
  addMetric(type) {
    this.$data.editingMetric = null;
    this.$data.metricForm = {
      name: '',
      type: 'continues',
      target: '',
      goal: '',
      start:"",
      metricType: type,
      isPositive: true,
      options: [],
      selectedExisting: ''
    };
    this.$data.showMetricModal = true;
  }
onExistingMetricSelected() {
  const selectedId = this.$data.metricForm.selectedExisting;
  
  if (!selectedId) {
    // Reset to empty form
    this.$data.metricForm.name = '';
    this.$data.metricForm.type = 'continues';
    this.$data.metricForm.options = [];
    return;
  }
  
  const existing = this.$data.existingMetrics.find(m => m.id == selectedId);
  if (existing) {
    this.$data.metricForm.name = existing.name;
    this.$data.metricForm.type = existing.type;
    
    // Handle options based on type
    if (existing.type === 'category' && existing.options) {
      this.$data.metricForm.options = Array.isArray(existing.options) 
        ? existing.options.join(', ') 
        : existing.options;
    } else if (existing.type === 'scale') {
      this.$data.metricForm.options = [1, 2, 3, 4, 5];
    } else {
      this.$data.metricForm.options = [];
    }
  }
}

editMetric(metric) {
    this.$data.editingMetric = metric;
    this.$data.metricForm = {
      name: metric.name,
      type: metric.type,
      target: metric.target,
      goal: metric.goal ||  '',
      isPositive: metric.isPositive !== false,
      options: metric.options || [],
      start:metric.start,
      selectedExisting: '',
    };
    this.$data.showMetricModal = true
    console.log(typeof this.$data.metric,options);
  }


  async saveMetric() {
    const isEdit = !!this.$data.editingMetric;
    const url = isEdit 
      ? `/diet/progress/metric/${this.$data.editingMetric.id}/`
      : `/diet/progress/metric/`;
    
    const method = isEdit ? 'put' : 'post';
    
    // Process target based on type
    let target = this.$data.metricForm.target;
    if (this.$data.metricForm.type === 'category') {
      // If target is comma-separated string, convert to array
      if (typeof target === 'string' && target.includes(',')) {
        target = target.split(',').map(t => t.trim());
      }
    }
    
    // Handle options for category/scale
    let options = this.$data.metricForm.options;
    if (this.$data.metricForm.type === 'category' && typeof options === 'string') {
      options = options.split(',').map(o => o.trim());
    } else if (this.$data.metricForm.type === 'scale') {
      options = [1, 2, 3, 4, 5];
    }
    
    const data = {
      name: this.$data.metricForm.name,
      type: this.$data.metricForm.type,
      start:this.$data.metricForm.start,
      target: target,
      goal: this.$data.metricForm.goal,
      metricType: this.$data.metricForm.metricType || 'customGoal',
      plan_type: this.$data.selectedPlanType,
      date: this.$data.selectedDate,
      isPositive: this.$data.metricForm.isPositive,
      options: options,
      existingMetricId: this.$data.metricForm.selectedExisting || null // NEW: Pass existing metric ID
    };
    
    await queryService.query(['saveMetric', url], {
      queryFn: queryService.createQueryFn(url, method, JSON.stringify(data)),
      onSuccess: () => {
        this.closeMetricModal();
        this.loadDayData(this.$data.selectedDate);
        progressHeader.fetchAvgScore();
        
      },
      onError: (ctx) => {
        alert('Failed to save metric: ' + (ctx.error?.message || 'Unknown error'));
      },
      force: true
    });
  }

  async toggleMetricActive(metric) {
    const oldState = metric.isActive;
    metric.isActive = !metric.isActive;
    
    const url = `/diet/progress/metric/${metric.id}/toggle/`;
    await queryService.query(['toggleMetric', metric.id, url], {
      queryFn: queryService.createQueryFn(url, 'patch'),
      onSuccess: () => {
        // Remove from list if deactivated
        console.log(metric)
        if (!metric.isActive) {
          console.log(metric,this.metrics)
          this.$data.metrics = this.$data.metrics.filter(m => m.id !== metric.id);
        }
      },
      onError: () => {
        metric.isActive = oldState;
        alert('Failed to toggle metric');
      },
      force: true
    });
  }
 
  async deleteMetric(metric) {
    if (!confirm(`Delete metric "${metric.name}"? This cannot be undone if there's no historical data.`)) {
      return;
    }
    
    const url = `/diet/progress/metric/${metric.id}/delete/`;
    await queryService.query(['deleteMetric', metric.id, url], {
      queryFn: queryService.createQueryFn(url, 'delete'),
      onSuccess: (ctx) => {
        this.$data.metrics = this.$data.metrics.filter(m => m.id !== metric.id);
        if (ctx.data.deactivated) {
          alert('Metric has historical data and was deactivated instead of deleted.');
        }
      },
      onError: () => {
        alert('Failed to delete metric');
      },
      force: true
    });
  }

  async showInactiveMetrics() {
    const url = '/diet/progress/metrics/inactive/';
    await queryService.query(['inactiveMetrics', url], {
      queryFn: queryService.createQueryFn(url, 'get'),
      onSuccess: (ctx) => {
        this.$data.inactiveMetrics = ctx.data.metrics || [];
        this.$data.showInactiveModal = true;
      },
      force: true
    });
  }

  
 async reactivateMetric(metricId) {
    const url = `/diet/progress/metric/${metricId}/toggle/`;
    await queryService.query(['reactivateMetric', metricId, url], {
      queryFn: queryService.createQueryFn(url, 'patch', JSON.stringify({ 
        isActive: true 
      })),
      onSuccess: () => {
        this.$data.inactiveMetrics = this.$data.inactiveMetrics.filter(m => m.id !== metricId);
        this.loadDayData(this.$data.selectedDate);
      },
      force: true
    });
  }


  closeInactiveModal() {
    this.$data.showInactiveModal = false;
    this.$data.inactiveMetrics = [];
  }

  closeMetricModal() {
    this.$data.showMetricModal = false;
    this.$data.editingMetric = null;
    this.$data.metricForm = {};
  }

  async saveFeedback() {
    this.isSaving = true;
    const url = `/diet/progress/feedback/`;
    
    await queryService.query(['saveFeedback', this.$data.selectedDate, url], {
      queryFn: queryService.createQueryFn(url, 'post', JSON.stringify({
        date: this.$data.selectedDate,
        plan_type: this.$data.selectedPlanType,
        feedback: this.$data.feedback
      })),
      onSuccess: () => {
        const now = new Date();
        this.savedAt = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        this.isSaving = false;
      },
      onError: () => {
        this.isSaving = false;
      },
      force: true
    });
  }
 
  formatValue(value, type) {
    if (value === null || value === undefined) return '--';
    
    if (type === 'boolean') {
      return value === true || String(value).toLowerCase() === 'true' ? 'Yes' : 'No';
    } else if (type === 'scale') {
      return `${value}/5`;
    }
    
    return String(value);
  }

  getMetricIcon(type) {
    const icons = {
      continues: 'fa-chart-line',
      daily: 'fa-calendar-day',
      boolean: 'fa-check-circle',
      scale: 'fa-star-half-alt',
      category: 'fa-tags'
    };
    return icons[type] || 'fa-circle';
  }

   onMetricTypeChange() {
    const type = this.$data.metricForm.type;
    
    // Set default values based on type
    if (type === 'boolean') {
      this.$data.metricForm.target = 'true';
    } else if (type === 'scale') {
      this.$data.metricForm.target = '5';
      this.$data.metricForm.options = [1, 2, 3, 4, 5];
    } else if (type === 'category') {
      this.$data.metricForm.options = [];
    }
  }

  async setCurrPlan(planId, planType, replace=false) {
    try {
      if (planId === "new") {
        // window.location.href = "/plans/create/";
        return;
      }

      const url = "/diet/dailyplan/set/";

      await queryService.query(["setPlan", planId, planType, url], {
        queryFn: queryService.createQueryFn(
          url,
          "post",
          JSON.stringify({
            plan_id: planId,
            start_date: this.$data.selectedDate,
            replace,
          })
        ),
        onSuccess: (ctx) => {
           this.loadDayData(this.$data.selectedDate);
          
        },
        force: true,
      });
    } catch (error) {
      console.error("Error setting plan:", error);
    }
  }
}

console.log("day loaded");