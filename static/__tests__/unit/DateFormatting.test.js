import { formatDate, formatDuration, process_data } from '../../scripts_module/helpers/utils/DataFromater.js';

describe('readable dates and durations', () => {
  beforeEach(() => { jest.useFakeTimers().setSystemTime(new Date('2026-11-17T12:00:00Z')); });
  afterEach(() => jest.useRealTimers());
  it.each([[10, 'Just now'], [120, '2 Min ago'], [7200, '2 H ago'], [172800, '2 days ago']])('formats a timestamp %s seconds ago', (seconds, expected) => {
    expect(formatDate(new Date(Date.now() - seconds * 1000).toISOString())).toBe(expected);
  });
  it('uses a calendar date for older records', () => {
    expect(formatDate('2025-01-01T12:00:00Z')).toBe(new Date('2025-01-01T12:00:00Z').toLocaleDateString());
  });
  it.each([['P1D', '1 day'], ['P2D3H4M', '2 days 3 hours 4 mins'], ['P0D1H1M', '1 hour 1 min'], ['P0D', '0 mins'], [1, '1 day'], [2, '2 days'], ['P1DT2H30M', '1 day 2 hours 30 mins'], ['invalid', '0 mins']])('formats duration %s', (value, expected) => {
    expect(formatDuration(value)).toBe(expected);
  });
  it('formats browse record dates with or without duration', () => {
    const record = { creation_date: new Date().toISOString(), last_modification: new Date().toISOString(), duration: 'P2D' };
    expect(process_data(record)).toMatchObject({ creation_date: 'Just now', last_modification: 'Just now', duration: '2 days' });
    expect(process_data({ creation_date: new Date().toISOString(), last_modification: new Date().toISOString() }).duration).toBeUndefined();
  });
});
