import DayProgress from '../../scripts_module/ComponentsClasses/progress/DayProgress.js';
import { queryService } from '../../common/script.js';
import Component from '../../scripts_module/ComponentsClasses/Component.js';
jest.mock('../../common/script.js', () => ({ queryService: { query: jest.fn(), createQueryFn: jest.fn() } }));

describe('daily progress interactions', () => {
  let progress, data, reply, fail;
  beforeEach(async () => {
    data = { selectedDate: '2026-11-17', selectedPlanType: 'diet', metrics: [], existingMetrics: [] };
    reply = { plan_name: 'Diet', planId: 3, plan_goal: 'Goal', current_day: 2, metrics: [{ id: 1, name: 'Water', value: 500 }], feedback: 'Good' };
    fail = false;
    window.progressHeader = { fetchAvgScore: jest.fn() };
    window.alert = jest.fn(); window.confirm = jest.fn(() => true);
    queryService.createQueryFn.mockImplementation((url, method, body) => Object.assign(jest.fn(), { url, method, body }));
    queryService.query.mockImplementation(async (_key, options) => {
      if (fail) options.onError?.({ error: new Error('Offline') });
      else options.onSuccess?.({ data: reply });
      return reply;
    });
    progress = new DayProgress(document.createElement('div'), {}, data);
    await Promise.resolve(); queryService.query.mockClear(); queryService.createQueryFn.mockClear();
  });
  afterEach(() => { Component.instances = {}; delete window.dayProgress; delete window.progressHeader; });

  it('loads plan, metrics and feedback without requiring home-page data', () => {
    expect(data).toMatchObject({ planName: 'Diet', planId: 3, currentDay: 2, feedback: 'Good' });
    expect(data.metrics[0].value).toBe(500);
  });
  it('falls back to an empty day with no home context', async () => {
    reply = {}; await progress.loadDayData(data.selectedDate);
    expect(data.planName).toBe('No Plan'); expect(data.metrics).toEqual([]); expect(data.feedback).toBe('');
  });
  it('sends metric values with the selected local date and plan type', async () => {
    const metric = { id: 1, value: 500 }; await progress.updateMetricValue(metric, 750);
    const call = queryService.createQueryFn.mock.calls.find(([, method]) => method === 'patch');
    expect(JSON.parse(call[2])).toEqual({ value: 750, date: '2026-11-17', plan_type: 'diet' });
  });
  it('rolls back an optimistic value when saving fails', async () => {
    fail = true; const metric = { id: 1, value: 500 }; await progress.updateMetricValue(metric, 750);
    expect(metric.value).toBe(500); expect(alert).toHaveBeenCalled();
  });
  it('starts a fresh metric form and resets it on close', () => {
    progress.addMetric('toPlan'); expect(data.metricForm.metricType).toBe('toPlan'); expect(data.showMetricModal).toBe(true);
    progress.closeMetricModal(); expect(data.metricForm).toEqual({}); expect(data.showMetricModal).toBe(false);
  });
  it('edits a negative metric without changing its direction', () => {
    progress.editMetric({ id: 3, name: 'Stress', type: 'scale', isPostive: false, target: 1 });
    expect(data.metricForm.isPositive).toBe(false); expect(data.showMetricModal).toBe(true);
  });
  it.each(['category', 'scale', 'daily'])('loads reusable %s metric definitions', type => {
    data.existingMetrics = [{ id: 7, name: 'Existing', type, options: ['calm', 'busy'] }];
    progress.addMetric('customGoal'); data.metricForm.selectedExisting = 7; progress.onExistingMetricSelected();
    expect(data.metricForm.name).toBe('Existing'); expect(data.metricForm.type).toBe(type);
    if (type === 'category') expect(data.metricForm.options).toBe('calm, busy');
    if (type === 'scale') expect(data.metricForm.options).toEqual([1, 2, 3, 4, 5]);
    data.metricForm.selectedExisting = ''; progress.onExistingMetricSelected(); expect(data.metricForm.name).toBe('');
  });
  it('normalizes category choices and selected targets for creation', async () => {
    progress.addMetric('customGoal'); Object.assign(data.metricForm, { name: 'Mood', type: 'category', target: 'calm, busy', options: 'calm, busy, stressed' });
    await progress.saveMetric();
    const call = queryService.createQueryFn.mock.calls.find(([, method]) => method === 'post');
    expect(JSON.parse(call[2])).toMatchObject({ target: ['calm', 'busy'], options: ['calm', 'busy', 'stressed'], date: data.selectedDate });
  });
  it('updates an existing metric and reports a failed save', async () => {
    progress.addMetric('toPlan'); data.editingMetric = { id: 3 }; data.metricForm.type = 'scale'; fail = true;
    await progress.saveMetric(); expect(queryService.createQueryFn).toHaveBeenCalledWith('/diet/progress/metric/3/', 'put', expect.any(String));
    expect(alert).toHaveBeenCalled();
  });
  it.each([false, true])('handles a %s toggle failure flag', async failed => {
    fail = failed; const metric = { id: 1, isActive: true }; data.metrics = [metric];
    await progress.toggleMetricActive(metric);
    expect(metric.isActive).toBe(failed); expect(data.metrics).toHaveLength(failed ? 1 : 0);
  });
  it('keeps a metric when deletion is cancelled and removes it after confirmation', async () => {
    const metric = { id: 1, name: 'Water' }; data.metrics = [metric]; confirm.mockReturnValueOnce(false);
    await progress.deleteMetric(metric); expect(queryService.query).not.toHaveBeenCalled();
    reply = { deactivated: true }; await progress.deleteMetric(metric); expect(data.metrics).toEqual([]); expect(alert).toHaveBeenCalled();
  });
  it('loads inactive metrics, reactivates one, and closes the list', async () => {
    reply = { metrics: [{ id: 1 }, { id: 2 }] }; await progress.showInactiveMetrics();
    expect(data.inactiveMetrics).toHaveLength(2); await progress.reactivateMetric(1);
    expect(data.inactiveMetrics).toEqual([{ id: 2 }]); progress.closeInactiveModal(); expect(data.inactiveMetrics).toEqual([]);
  });
  it.each([false, true])('settles feedback saving state on failure=%s', async failed => {
    fail = failed; await progress.saveFeedback(); expect(progress.isSaving).toBe(false);
    if (!failed) expect(progress.savedAt).toMatch(/\d/);
  });
  it.each([[null, 'daily', '--'], [false, 'boolean', 'No'], [true, 'boolean', 'Yes'], [3, 'scale', '3/5'], [0, 'daily', '0']])(
    'formats recorded values %s (%s)', (value, type, expected) => expect(progress.formatValue(value, type)).toBe(expected)
  );
  it.each(['boolean', 'scale', 'category'])('provides useful %s defaults', type => {
    progress.addMetric('customGoal'); data.metricForm.type = type; progress.onMetricTypeChange();
    expect(data.metricForm.options).toBeDefined(); expect(progress.getMetricIcon(type)).toMatch(/^fa-/);
  });
  it('assigns plans for the selected date and ignores the create sentinel', async () => {
    await progress.setCurrPlan('new', 'diet'); expect(queryService.query).not.toHaveBeenCalled();
    await progress.setCurrPlan(4, 'diet', true);
    const call = queryService.createQueryFn.mock.calls.find(([, method]) => method === 'post');
    expect(JSON.parse(call[2])).toEqual({ plan_id: 4, start_date: data.selectedDate, replace: true });
  });
});
