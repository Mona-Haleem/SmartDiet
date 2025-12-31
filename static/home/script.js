import ProgressHeader from "../scripts_module/ComponentsClasses/progress/ProgressHeader.js";
import DayProgress from "../scripts_module/ComponentsClasses/progress/DayProgress.js";
import HomeManager from "../scripts_module/ComponentsClasses/home/HomeManager.js";
import CreationForm from "../scripts_module/ComponentsClasses/creationForm.js";
import IngredientInput from "../scripts_module/ComponentsClasses/ingredientsInput.js"
window.CreationForm = CreationForm;
window.IngredientInput = IngredientInput
window.ProgressHeader = ProgressHeader;
window.DayProgress = DayProgress;
window.HomeManager = HomeManager;

console.log("Home page scripts loaded");

// Initialize Alpine.js data
document.addEventListener('alpine:init', () => {
  
  // Home Manager Data
  Alpine.data('homeManager', () => ({
    // allPlans: [],
    // currentDietPlan: null,
    // currentExercisePlan: null
  }));

  // Progress Header Data
  Alpine.data('progressHeader', () => ({
    avgScore: '--'
  }));

  // Day Progress Data
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
    showInactiveModal: false,
    editingMetric: null,
    inactiveMetrics: [],
    metricForm: {}
  }));

});

window.setCurrPlan = async function(planDataStr, titleElementId, planType) {
  if (window.homeManager) {
    await window.homeManager.setCurrPlan(planDataStr, titleElementId, planType);
  } else {
    console.error('HomeManager not initialized');
  }
};
