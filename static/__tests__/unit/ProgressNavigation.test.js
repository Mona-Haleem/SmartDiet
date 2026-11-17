import Calendar from '../../scripts_module/ComponentsClasses/progress/Calender.js';
import ProgressHeader from '../../scripts_module/ComponentsClasses/progress/ProgressHeader.js';
import HomeManager from '../../scripts_module/ComponentsClasses/home/HomeManager.js';
import Component from '../../scripts_module/ComponentsClasses/Component.js';
import { queryService } from '../../common/script.js';
jest.mock('../../common/script.js', () => ({ queryService: { query: jest.fn(), createQueryFn: jest.fn() } }));

describe('local calendar and progress navigation', () => {
  let data, reply;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 17, 13, 30));
    data = { selectedPlanType: 'diet', selectedPeriod: 'day', selectedDate: '2026-11-17', currentView: 'day', todayPlans: {}, allPlans: [] };
    reply = { plans: { '2026-11-17': { diet: true, dietDay: 'Day 1', exercise: { plan_name: 'Run' } } }, avgScore: 0 };
    queryService.createQueryFn.mockImplementation((url, method, body) => Object.assign(jest.fn(), { url, method, body }));
    queryService.query.mockImplementation(async (_key, options) => { options.onSuccess?.({ data: reply }); return reply; });
    window.dayProgress = { loadDayData: jest.fn() };
    window.periodProgress = { loadPeriodData: jest.fn().mockResolvedValue(), getSummary: jest.fn() };
  });
  afterEach(() => {
    jest.useRealTimers(); Component.instances = {};
    delete window.dayProgress; delete window.periodProgress; delete window.homeManager;
  });
  const createCalendar = (start = '2026-10-01') => new Calendar(document.createElement('div'),
    { prevBtn: document.createElement('button'), nextBtn: document.createElement('button') }, data, start);

  it('renders complete weeks with one selected local date and plan badges', () => {
    const calendar = createCalendar(); const days = data.weeks.flatMap(week => week.days);
    expect(data.weeks.every(week => week.days.length === 7)).toBe(true);
    expect(days.filter(day => day.isCurrentMonth)).toHaveLength(30);
    expect(days.filter(day => day.isSelected).map(day => day.date)).toEqual(['2026-11-17']);
    expect(days.find(day => day.isToday)).toMatchObject({ date: '2026-11-17', plans: { dietDay: 'Day 1', exerciseDay: 'Run' } });
    expect(calendar.$refs.nextBtn.disabled).toBe(true); expect(data.calendarHeader).toBe('November 2026');
  });
  it('stops at the first tracking month and the current month', () => {
    const calendar = createCalendar(); calendar.previousMonth(); calendar.previousMonth();
    expect(calendar.currentDate.getMonth()).toBe(9); expect(calendar.$refs.prevBtn.disabled).toBe(true);
    calendar.nextMonth(); calendar.nextMonth(); expect(calendar.currentDate.getMonth()).toBe(10);
  });
  it('moves one month at month end without overflowing back into the same month', () => {
    jest.setSystemTime(new Date(2026, 2, 31, 12)); const calendar = createCalendar('2026-01-01');
    calendar.previousMonth(); expect(calendar.currentDate.getMonth()).toBe(1);
    expect(data.weeks.flatMap(week => week.days).filter(day => day.isCurrentMonth)).toHaveLength(28);
  });
  it('handles leap February and the previous/next year cells', () => {
    const calendar = createCalendar(); calendar.currentDate = new Date(2024, 1, 1); calendar.generateCalendar();
    expect(data.weeks.flatMap(week => week.days).filter(day => day.isCurrentMonth)).toHaveLength(29);
    calendar.currentDate = new Date(2026, 0, 1); calendar.generateCalendar();
    expect(data.weeks[0].days[0].date).toBe('2025-12-28');
  });
  it.each([false, true])('selects a date and loads its data, mobile=%s', mobile => {
    const calendar = createCalendar(); data.isMobile = mobile;
    calendar.selectDay({ date: '2026-11-10' });
    expect(data.selectedDate).toBe('2026-11-10'); expect(data.currentView).toBe('day');
    expect(window.dayProgress.loadDayData).toHaveBeenCalledWith('2026-11-10');
    if (mobile) expect(data.showLeftPage).toBe(false);
  });
  it('can select without an active daily component or button refs', () => {
    const calendar = createCalendar(); delete window.dayProgress; calendar.$refs = {};
    expect(() => { calendar.selectDay({ date: '2026-11-12' }); calendar.updateNavigationButtons(); }).not.toThrow();
    calendar.userStartDate = null; expect(calendar.canGoPrevious()).toBe(false);
  });
  it.each([[0, 0], [72.6, 73], [null, '--']])('displays average score %s correctly', (score, expected) => {
    reply.avgScore = score; new ProgressHeader(document.createElement('div'), {}, data); expect(data.avgScore).toBe(expected);
  });
  it('refreshes the daily view once when changing plan type', () => {
    const header = new ProgressHeader(document.createElement('div'), {}, data);
    header.switchPlanType('diet'); expect(window.dayProgress.loadDayData).not.toHaveBeenCalled();
    header.switchPlanType('exercise'); expect(window.dayProgress.loadDayData).toHaveBeenCalledTimes(1);
    expect(data.selectedPlanType).toBe('exercise');
  });
  it('loads period charts once when the period changes and tolerates an unmounted chart', async () => {
    const header = new ProgressHeader(document.createElement('div'), {}, data); data.selectedPeriod = 'month';
    await header.changePeriod(); expect(window.periodProgress.loadPeriodData).toHaveBeenCalledTimes(1);
    expect(window.periodProgress.getSummary).toHaveBeenCalledTimes(1);
    delete window.periodProgress; await expect(header.changePeriod()).resolves.toBeUndefined();
  });
  it('routes category and period changes to the mounted view', async () => {
    const header = new ProgressHeader(document.createElement('div'), {}, data); data.currentView = 'month';
    header.switchPlanType('exercise'); expect(window.periodProgress.loadPeriodData).toHaveBeenCalledTimes(1);
    await header.changePeriod(); expect(window.dayProgress.loadDayData).toHaveBeenCalledTimes(1);
  });
  it('assigns a home plan for the local day and updates its link', async () => {
    const anchor = document.createElement('a'); anchor.href = '/diet/collections/plans/1/Old/';
    const manager = new HomeManager(document.createElement('div'), { 'anchorLink-diet': anchor }, data);
    await manager.setCurrPlan('new', 'diet'); expect(queryService.query).not.toHaveBeenCalled();
    reply = { plan: { id: 4, name: 'New plan' } }; await manager.setCurrPlan(4, 'diet', false);
    const payload = JSON.parse(queryService.createQueryFn.mock.calls.at(-1)[2]);
    expect(payload).toEqual({ plan_id: 4, start_date: '2026-11-17', replace: false });
    expect(data.todayPlans.diet).toEqual(reply.plan); expect(anchor.pathname).toBe('/diet/collections/plans/4/New%20plan/');
  });
  it('handles missing home links and failed plan assignments without corrupting state', async () => {
    const manager = new HomeManager(document.createElement('div'), {}, data);
    delete window.dayProgress; reply = { plan: { id: 4, name: 'Plan' } }; await manager.setCurrPlan(4, 'diet');
    queryService.query.mockRejectedValueOnce(new Error('Offline')); await expect(manager.setCurrPlan(5, 'diet')).resolves.toBeUndefined();
    expect(data.todayPlans.diet.id).toBe(4);
  });
});
