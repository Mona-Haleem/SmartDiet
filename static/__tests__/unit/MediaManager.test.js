import MediaManager from '../../scripts_module/ComponentsClasses/detailsPage/MediaManager.js';
import { queryService } from '../../common/script.js';
jest.mock('../../common/script.js', () => ({ queryService: { query: jest.fn(), createQueryFn: jest.fn() } }));

describe('media persistence and viewer state', () => {
  let manager, data, failed, input, anchor, update;
  beforeEach(() => {
    jest.useFakeTimers(); failed = false; input = document.createElement('input'); anchor = document.createElement('a');
    data = { ele: { media: ['/media/old.png', '/media/second.png', '/media/third.png'] }, displayedMedia: ['/media/old.png', '/media/second.png'], mediaIndex: 1 };
    queryService.createQueryFn.mockImplementation((url, method, body) => Object.assign(jest.fn(), { url, method, body }));
    queryService.query.mockImplementation(async (_key, options) => {
      if (failed) options.onError?.({ error: new Error('Offline') }); else options.onSuccess?.({ data: { mediaUrl: '/media/new.png' } });
    });
    update = jest.fn(async (_keys, _body, success, error) => { if (failed) error?.(); else success?.({ data: {} }); });
    manager = new MediaManager(4, 'recipe', update, anchor);
  });
  afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });
  it.each(['text/plain', 'image/png'])('validates and uploads %s media', async type => {
    Object.defineProperty(input, 'files', { value: [new File(['content'], 'upload.png', { type })] });
    await manager.uploadMedia(input, data);
    expect(data.ele.media).toHaveLength(type === 'image/png' ? 4 : 3);
    if (type === 'image/png') {
      expect(data.mediaIndex).toBe(3); expect(queryService.createQueryFn.mock.calls[0][2].get('media').name).toBe('upload.png');
    }
  });
  it('does not modify the list after a failed upload', async () => {
    failed = true; Object.defineProperty(input, 'files', { value: [new File(['png'], 'file.png', { type: 'image/png' })] });
    await manager.uploadMedia(input, data); expect(data.ele.media).toHaveLength(3);
  });
  it('handles cancelling the file picker', async () => {
    Object.defineProperty(input, 'files', { value: [] }); await expect(manager.uploadMedia(input, data)).resolves.toBeUndefined();
    expect(queryService.query).not.toHaveBeenCalled();
  });
  it.each(['https://example.com/a.png', 'not a URL'])('validates linked image %s', async value => {
    input.value = value; data.addMediaLink = true; await manager.appendMediaLink(input, data);
    expect(data.ele.media).toHaveLength(value.startsWith('https') ? 4 : 3); expect(data.addMediaLink).toBe(false); expect(input.value).toBe('');
  });
  it('rolls back a linked image when saving fails', async () => {
    failed = true; input.value = 'https://example.com/a.png'; await manager.appendMediaLink(input, data);
    expect(data.ele.media).toHaveLength(3); expect(data.mediaIndex).toBe(1);
  });
  it.each([false, true])('deletes an image only after confirmation by the API, failure=%s', async failure => {
    failed = failure; const wrapper = document.createElement('div'); const image = document.createElement('img');
    image.src = '/media/old.png'; wrapper.append(image); await manager.deleteMedia(wrapper, data);
    expect(data.ele.media).toEqual(failure ? ['/media/old.png', '/media/second.png', '/media/third.png'] : ['/media/second.png', '/media/third.png']);
    expect(data.displayedMedia).toEqual(failure ? ['/media/old.png', '/media/second.png'] : ['/media/second.png', '/media/third.png']);
  });
  it('deleting the final image leaves an empty viewer', async () => {
    data.ele.media = ['/media/old.png']; data.displayedMedia = ['/media/old.png'];
    const wrapper = document.createElement('div'); wrapper.innerHTML = '<img src="/media/old.png">';
    await manager.deleteMedia(wrapper, data); expect(data.ele.media).toEqual([]); expect(data.displayedMedia).toEqual([]); expect(data.mediaIndex).toBe(0);
  });
  it('moves between media, full-image, and details views', () => {
    const paginator = { pageClass: {}, data: {}, paginateTo: jest.fn() }; const refresh = jest.fn();
    manager.expandMediaViewer(data, paginator); expect(data.mode).toBe('mediaViewer'); expect(anchor).toHaveClass('d-none');
    manager.expandImage(data, 1, paginator); expect(data.mode).toBe('fullImages'); expect(paginator.data.page).toBe(1);
    manager.restViewer(data, paginator); expect(data.mode).toBe('mediaViewer');
    manager.restViewer(data, paginator, refresh); jest.runAllTimers(); expect(data.mode).toBe('details');
    expect(anchor).not.toHaveClass('d-none'); expect(refresh).toHaveBeenCalledWith(0); expect(paginator.paginateTo).toHaveBeenLastCalledWith('page1');
  });
});
