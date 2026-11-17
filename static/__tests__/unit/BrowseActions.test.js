import CardList from '../../scripts_module/ComponentsClasses/CardList.js';
import Component from '../../scripts_module/ComponentsClasses/Component.js';
import NavigationManager from '../../scripts_module/helpers/utils/NavigationManager.js';
import { queryService } from '../../common/script.js';
jest.mock('../../common/script.js', () => ({ queryService: { query: jest.fn(), createQueryFn: jest.fn() } }));

describe('library pagination and persisted card actions', () => {
  let list, data, result, failed, pagination;
  beforeEach(() => {
    jest.useFakeTimers(); history.replaceState({}, '', '/diet/collections/browse/');
    Object.defineProperty(window, 'innerWidth', { value: 1400, configurable: true });
    const el = document.createElement('div'); Object.defineProperty(el, 'clientHeight', { value: 570, configurable: true });
    data = { items: [{ id: 1, name: 'Meal', details_path: '/recipes/1/' }], page: 1 };
    result = { result: { items: [{ id: 2, name: 'Next', created: new Date().toISOString(), edited: new Date().toISOString() }], next: true, page: 2 } };
    failed = false; pagination = jest.fn(); CardList.PopStateEvent = false; CardList.resizeMode = false;
    NavigationManager.allowPush = false; NavigationManager.initState = false;
    queryService.createQueryFn.mockImplementation((url, method, body) => Object.assign(jest.fn(), { url, method, body }));
    queryService.query.mockImplementation(async (_key, options) => { if (failed) options.onError?.({ error: new Error('Offline') }); else options.onSuccess?.({ data: result }); return failed ? null : result; });
    list = new CardList(el, {}, data, pagination);
  });
  afterEach(async () => { await list.delete(); jest.clearAllTimers(); jest.useRealTimers(); Component.instances = {}; });

  it('requests a page with bounded size and formats returned item dates', async () => {
    expect(await list.onPaginate('next', 2)).toEqual(result.result);
    expect(data.items[0]).toMatchObject({ id: 2, created: 'Just now', edited: 'Just now' });
    expect(queryService.createQueryFn.mock.calls.at(-1)[0]).toContain('page=2&size=24');
  });
  it('retains the current cards after a failed page request', async () => {
    failed = true; expect(await list.onPaginate('next', 2)).toBeUndefined(); expect(data.items[0].id).toBe(1);
  });
  it('passes server navigation state to the paginator', async () => {
    await list.updateData(); expect(pagination).toHaveBeenCalledWith(result.result);
  });
  it('debounces viewport changes into a single refresh', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true });
    list.OnResize(); list.OnResize(); expect(queryService.query).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(51); expect(queryService.query).toHaveBeenCalledTimes(1);
    expect(list.size).toBe(4); expect(CardList.resizeMode).toBe(false);
  });
  it('avoids a request when the viewport capacity has not changed', () => {
    list.OnResize(); jest.runAllTimers(); expect(queryService.query).not.toHaveBeenCalled();
  });
  it.each([false, true])('changes a card only after server confirmation, failure=%s', async failure => {
    failed = failure; await list.updateServerData(1, 'favorite', true); expect(data.items[0].favorite).toBe(failure ? undefined : true);
  });
  it('removes an updated card that no longer belongs to a filtered partial page', async () => {
    history.replaceState({}, '', '?favorite=true'); await list.updateServerData(1, 'favorite', false); expect(data.items).toEqual([]);
  });
  it('refills a full filtered page after updating a card', async () => {
    list.size = 1; history.replaceState({}, '', '?shared=false'); await list.updateServerData(1, 'shared', true);
    expect(queryService.query).toHaveBeenCalledTimes(2);
    expect(queryService.query.mock.calls.at(-1)[1].force).toBe(true);
  });
  it('ignores a missing card and cancelled deletion', async () => {
    window.confirm = jest.fn(() => false); await list.deleteEle(1); await list.updateServerData(99, 'favorite', true);
    window.confirm.mockReturnValue(true); await list.deleteEle(99); expect(queryService.query).not.toHaveBeenCalled();
  });
  it.each([false, true])('deletes a confirmed card only after success, failure=%s', async failure => {
    window.confirm = jest.fn(() => true); failed = failure; await list.deleteEle(1); expect(data.items).toHaveLength(failure ? 1 : 0);
  });
  it('refills a full page after deletion', async () => {
    window.confirm = jest.fn(() => true); list.size = 1; await list.deleteEle(1); expect(queryService.query).toHaveBeenCalledTimes(2);
  });
  it('restores a history entry with a forced fetch', async () => {
    window.dispatchEvent(new PopStateEvent('popstate', { state: { url: 'http://localhost/diet/collections/browse/?page=2' } }));
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(queryService.query.mock.calls.at(-1)[1].force).toBe(true); expect(pagination).toHaveBeenCalled();
    expect(NavigationManager.allowPush).toBe(true);
  });
});
