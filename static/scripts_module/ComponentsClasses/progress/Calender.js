import Component from "../Component.js";
import { queryService } from "../../../common/script.js";

export default class Calendar extends Component {
  constructor(el, refs, data, startDate) {
    super(el, refs, data);
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.userStartDate = new Date(startDate);
    this.plansData = {};
    this.$data.weeks = [];
    this._init();
    //console.log(this.userStartDate, startDate);
  }

  _init() {
    this.updateNavigationButtons();
    this.fetchPlansData();
    this.generateCalendar();
  }

  async fetchPlansData() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth() + 1;
    const url = `/diet/progress/assigned-plans/?year=${year}&month=${month}`;

    await queryService.query(["plansData", year, month, url], {
      queryFn: queryService.createQueryFn(url, "get"),
      onSuccess: (ctx) => {
        this.plansData = ctx.data.plans || {};
        this.generateCalendar();
      },
      force: true,
    });
  }

  generateCalendar() {
    const year = this.currentDate.getFullYear();

    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);

    const firstDayOfWeek = firstDay.getDay();
    const lastDate = lastDay.getDate();
    const prevLastDate = prevLastDay.getDate();

    const weeks = [];
    let currentWeek = { id: `week-0`, days: [] };
    let weekId = `week-0`;
    let weekNum = 0;

    // Previous month days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = prevLastDate - i;
      currentWeek.days.push(this.createDayObject(year, month - 1, day, false));
    }

    // Current month days
    for (let day = 1; day <= lastDate; day++) {
      if (currentWeek.days.length === 7) {
        weeks.push(currentWeek);
        weekNum++;
        currentWeek = { id: `week-${weekNum}`, days: [] };
      }

      currentWeek.days.push(this.createDayObject(year, month, day, true));
    }

    // Next month days
    const remainingDays = 7 - currentWeek.days.length;
    for (let day = 1; day <= remainingDays; day++) {
      currentWeek.days.push(this.createDayObject(year, month + 1, day, false));
    }
    weeks.push(currentWeek);

    this.$data.weeks = weeks;
    this.$data.calendarHeader = this.getMonthYearText();
    //console.log("===============", this.$data.weeks);
  }

  createDayObject(year, month, day, isCurrentMonth) {
    const date = new Date(year, month, day);
    const dateStr = date.toLocaleDateString("en-CA");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (day == 1) console.log(dateStr, date, day);
    const planData = this.plansData[dateStr] || {};
    //console.log(planData)
    return {
      date: dateStr,
      dayNumber: day,
      isCurrentMonth,
      isToday: date.getTime() === today.getTime(),
      isSelected: date.getTime() === this.selectedDate.getTime(),
      hasPlan: planData.diet || planData.exercise,
      plans: {
        diet: planData.diet,
        dietDay: planData.dietDay || planData.diet?.plan_name,
        exercise: planData.exercise,
        exerciseDay: planData.exerciseDay || planData.exercise?.plan_name,
      },
    };
  }

  selectDay(day) {
    // if (!day.isCurrentMonth) return;
    console.log("selected day", day);
    this.selectedDate = new Date(day.date);
    this.$data.selectedDate = day.date;
    // this.generateCalendar();
    // Switch to day view and right page on mobile
    this.$data.currentView = "day";
    this.$data.selectedPeriod = "day";
    if (this.$data.isMobile) {
      this.$data.showLeftPage = false;
    }

    // Trigger data fetch for selected day
    if (window.dayProgress) {
      window.dayProgress.loadDayData(day.date);
    }
  }

  previousMonth() {
    if (!this.canGoPrevious()) return;

    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.fetchPlansData();
    this.updateNavigationButtons();
  }

  nextMonth() {
    if (!this.canGoNext()) return;

    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.fetchPlansData();
    this.updateNavigationButtons();
  }

  canGoPrevious() {
    if (!this.userStartDate) return false;
    const firstOfCurrentMonth = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      1
    );
    const firstOfStartMonth = new Date(
      this.userStartDate.getFullYear(),
      this.userStartDate.getMonth(),
      1
    );
    return firstOfCurrentMonth > firstOfStartMonth;
  }

  canGoNext() {
    const today = new Date();
    const firstOfCurrentMonth = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      1
    );
    const firstOfCurrentRealMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );
    return firstOfCurrentMonth < firstOfCurrentRealMonth;
  }

  updateNavigationButtons() {
    if (this.$refs.prevBtn) {
      this.$refs.prevBtn.disabled = !this.canGoPrevious();
    }
    if (this.$refs.nextBtn) {
      this.$refs.nextBtn.disabled = !this.canGoNext();
    }
  }

  getMonthYearText() {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return `${
      months[this.currentDate.getMonth()]
    } ${this.currentDate.getFullYear()}`;
  }
}

//console.log("calender loaded");
