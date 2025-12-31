// Progress Page Main Script
import Calendar from '../scripts_module/ComponentsClasses/progress/Calender.js';
import ProgressHeader from '../scripts_module/ComponentsClasses/progress/ProgressHeader.js';
import DayProgress from '../scripts_module/ComponentsClasses/progress/DayProgress.js';
import PeriodProgress from '../scripts_module/ComponentsClasses/progress/PeriodProgress.js';
import CreationForm from "../scripts_module/ComponentsClasses/creationForm.js";
import IngredientInput from "../scripts_module/ComponentsClasses/ingredientsInput.js"
window.CreationForm = CreationForm;
window.IngredientInput = IngredientInput
window.Calendar = Calendar;
window.ProgressHeader = ProgressHeader;
window.DayProgress = DayProgress;
window.PeriodProgress = PeriodProgress;

console.log("all loaded")
// Initialize Alpine.js data
document.addEventListener('alpine:init', () => {
  Alpine.data('calendar', () => ({
    weeks: [],
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear()
  }));

  Alpine.data('progressHeader', () => ({
    // Inherited from parent
  }));

  Alpine.data('dayProgress', () => ({
    planName: '',
    planGoal: '',
    currentDay: 1,
    planSections: [],
    metrics: [],
    feedback: '',
    isSaving: false,
    savedAt: '',
    showMetricModal: false,
    editingMetric: null,
    metricForm: {}
  }));

  Alpine.data('periodProgress', () => ({
    metricsData: [],
    chartData: [],
    selectedMetric: null,
    chartHeight: 150
  }));
});

// Export for use in other modules if needed
// export { Calendar, ProgressHeader, DayProgress, PeriodProgress };