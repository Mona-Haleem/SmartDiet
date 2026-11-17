import PeriodProgress from '../../scripts_module/ComponentsClasses/progress/PeriodProgress.js';
import { queryService } from '../../common/script.js';
import Component from '../../scripts_module/ComponentsClasses/Component.js';
jest.mock('../../common/script.js', () => ({ queryService: { query: jest.fn(), createQueryFn: jest.fn() } }));

describe('period charts and readable summaries', () => {
  let period, data, reply;
  beforeEach(async () => {
    data = { selectedPeriod: 'month', selectedDate: '2026-11-17', selectedPlanType: 'diet', metricsData: [] };
    reply = { chart_data: [{ date: '2026-11-17', overall_score: 50, metrics: { 7: 75 } }],
      metrics: [{ id: 7, name: 'Water', score: .75, change: .1 }] };
    queryService.createQueryFn.mockReturnValue(jest.fn());
    queryService.query.mockImplementation(async (_key, options) => { options.onSuccess({ data: reply }); return reply; });
    window.Chart = jest.fn().mockImplementation((_context, config) => ({ data: config.data, options: config.options, update: jest.fn(), destroy: jest.fn() }));
    const canvas = document.createElement('canvas'); canvas.getContext = jest.fn(() => ({}));
    period = new PeriodProgress(document.createElement('div'), { chartCanvas: canvas }, data);
    await Promise.resolve(); await Promise.resolve();
  });
  afterEach(() => { Component.instances = {}; delete window.periodProgress; delete window.Chart; });

  it('loads numeric chart data and an equivalent accessible table model', () => {
    expect(data.chartRows).toEqual(reply.chart_data); expect(period.chart.data.datasets[0].data).toEqual([50]);
    expect(data.metricsData[0]).toMatchObject({ id: 'metric-7', achievement: .75 });
  });
  it('replaces an existing chart instance when period data changes', async () => {
    const old = period.chart; await period.initChart(); expect(old.destroy).toHaveBeenCalled();
  });
  it('switches between individual metric and overall data', () => {
    period.highlightMetric({ id: 'metric-7', name: 'Water' });
    expect(period.chart.data.datasets[0].data).toEqual([75]); expect(data.chartName).toBe('Water');
    period.showOverallProgress(); expect(period.chart.data.datasets[0].data).toEqual([50]);
    expect(period.chart.options.scales.y.max).toBe(100);
  });
  it('handles a metric with no recorded values', () => {
    period.highlightMetric({ id: 'metric-99', name: 'Missing' }); expect(period.chart.data.datasets[0].data).toEqual([0]);
  });
  it('handles a missing canvas or chart during teardown', async () => {
    period.$refs.chartCanvas = null; await period.initChart(); period.chart = null; expect(() => period.updateChart()).not.toThrow();
  });
  it.each([
    [[{ name: 'Water', achievement: .9, change: 1 }], 'positive trends'],
    [[{ name: 'Water', achievement: .2, change: -1 }], 'declining trends'],
    [[{ name: 'Water', achievement: .8, change: 1 }, { name: 'Sleep', achievement: .6, change: -1 }], 'mixed'],
  ])('summarizes achievement and trend without confusing score units', (metrics, expected) => {
    data.metricsData = metrics; const summary = period.getSummary(); expect(summary).toContain(expected);
    expect(summary).toContain('%');
  });
  it('provides a useful empty-period message', () => {
    data.metricsData = []; period.getSummary(); expect(data.summary).toContain('No data available');
  });
  it.each([[0, '0'], [1.25, '+1.3'], [-1.25, '-1.3']])('formats change %s', (change, expected) => {
    expect(period.formatChange(change, 'daily')).toBe(expected);
  });
  it('keeps chart ticks and tooltips in percentage units', () => {
    const config = window.Chart.mock.calls[0][1];
    expect(config.options.plugins.tooltip.callbacks.label({ raw: 50 })).toBe('50%');
    expect(config.options.scales.y.ticks.callback(.5)).toBe('0.50%');
    expect(config.options.scales.y.ticks.callback(5)).toBe('5.0%');
    expect(config.options.scales.y.ticks.callback(50)).toBe('50%');
    expect(period.getMetricIcon('unknown')).toBe('fa-circle');
  });
});
