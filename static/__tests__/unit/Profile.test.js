import Profile from '../../scripts_module/ComponentsClasses/Profile/profile.js';
import { queryService } from '../../common/script.js';
import Component from '../../scripts_module/ComponentsClasses/Component.js';
jest.mock('../../common/script.js', () => ({ queryService: { query: jest.fn(), createQueryFn: jest.fn() } }));

describe('profile edits and restriction persistence', () => {
  let profile, data, refs, result, failed;
  beforeEach(() => {
    jest.useFakeTimers();
    history.replaceState({}, '', '/diet/users/profile/');
    refs = { restrictionsTable: document.createElement('table'), nameInput: document.createElement('input'),
      avataImg: document.createElement('img'), imgUpload: document.createElement('input') };
    refs.imgUpload.type = 'file'; document.body.append(...Object.values(refs));
    data = { user: { username: 'Original', age: 26, restrictions: [{ id: 1, type: 'other', name: 'Peanuts', remark: 'Avoid' }] },
      orgValue: 'Original', editMode: true, isAdding: false };
    failed = false; result = {};
    queryService.createQueryFn.mockImplementation((url, method, body) => Object.assign(jest.fn(), { url, method, body }));
    queryService.query.mockImplementation(async (_key, options) => {
      if (failed) options.onError?.({ error: new Error('Offline') }); else options.onSuccess?.({ data: result });
      return result;
    });
    profile = new Profile(document.createElement('div'), refs, data);
  });
  afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); Component.instances = {}; });

  it('does not request an unchanged username', () => {
    refs.nameInput.value = ' Original '; profile.updateUserName();
    expect(data.editMode).toBe(false); expect(queryService.query).not.toHaveBeenCalled();
  });
  it('updates a validated username after server confirmation', async () => {
    refs.nameInput.value = 'Renamed'; profile.updateUserName(); await Promise.resolve();
    expect(data.user.username).toBe('Renamed'); expect(data.editMode).toBe(false);
    expect(queryService.createQueryFn).toHaveBeenCalledWith('/diet/users/profile/update/', 'patch', JSON.stringify({ username: 'Renamed' }));
  });
  it('keeps editing and marks a rejected username', async () => {
    failed = true; refs.nameInput.value = 'Taken'; profile.updateUserName(); await Promise.resolve();
    expect(refs.nameInput).toHaveClass('invalid'); expect(data.user.username).toBe('Original');
  });
  it('updates a health field and its derived age', async () => {
    result = { age: 31 }; const input = document.createElement('input'); input.value = '1995-01-01';
    profile.updateUserData(input, 'birth_date'); await Promise.resolve();
    expect(data.user.birth_date).toBe('1995-01-01'); expect(data.user.age).toBe(31);
  });
  it('validates image uploads before contacting the server', () => {
    Object.defineProperty(refs.imgUpload, 'files', { value: [new File(['text'], 'file.txt', { type: 'text/plain' })], configurable: true });
    profile.updateAvatarImage(); expect(queryService.query).not.toHaveBeenCalled();
  });
  it('uploads a valid avatar and displays the returned URL', async () => {
    result = { image_url: '/media/new.png' };
    Object.defineProperty(refs.imgUpload, 'files', { value: [new File(['png'], 'file.png', { type: 'image/png' })], configurable: true });
    profile.updateAvatarImage(); await Promise.resolve();
    const [, method, body] = queryService.createQueryFn.mock.calls.at(-1);
    expect(method).toBe('post'); expect(body.get('avatar_img').name).toBe('file.png');
    expect(refs.avataImg.getAttribute('src')).toBe('/media/new.png');
  });
  it('adds only one temporary restriction while its form is open', () => {
    profile.registerRef('temp', 'name', refs.nameInput);
    profile.addRestriction('medical'); profile.addRestriction('medical'); jest.runAllTimers();
    expect(data.user.restrictions.filter(item => item.id === 'temp')).toHaveLength(1);
    expect(data.activeType).toBe('medical'); expect(refs.nameInput).toHaveFocus();
  });
  it('rejects empty and duplicate restrictions', () => {
    expect(profile.validRestrictions({ id: 2, name: '', remark: '' })).toBe(false);
    expect(profile.validRestrictions({ id: 2, name: 'Peanuts', remark: 'Avoid' })).toBe(false);
    expect(profile.validRestrictions({ id: 1, name: 'Peanuts', remark: 'Avoid' })).toBe(true);
  });
  it('replaces the temporary restriction with the saved record', () => {
    data.user.restrictions.push({ id: 'temp' }); result = { restriction: { id: 2, name: 'Milk' } };
    profile.saveRestriction({ name: 'Milk' }, '/diet/users/restrictions/temp');
    expect(data.user.restrictions.map(item => item.id)).toEqual([1, 2]); expect(data.isAdding).toBe(false);
  });
  it('removes the temporary draft after a failed creation', () => {
    failed = true; data.user.restrictions.push({ id: 'temp' });
    profile.saveRestriction({ name: 'Milk' }, '/diet/users/restrictions/temp');
    expect(data.user.restrictions.map(item => item.id)).toEqual([1]); expect(data.isAdding).toBe(false);
  });
  it('sends trimmed restriction edits', () => {
    const remark = document.createElement('input'); remark.value = ' Updated ';
    refs.nameInput.value = ' Peanuts '; profile.registerRef(1, 'name', refs.nameInput); profile.registerRef(1, 'remark', remark);
    profile.updateRestrictions(1, 'other');
    const [url, method, body] = queryService.createQueryFn.mock.calls.at(-1);
    expect(url).toBe('/diet/users/restrictions/1'); expect(method).toBe('put');
    expect(JSON.parse(body)).toMatchObject({ name: 'Peanuts', remark: 'Updated' });
  });
  it.each([false, true])('removes a restriction only after successful deletion, failure=%s', async failure => {
    failed = failure; await profile.removeRestriction(1); expect(data.user.restrictions).toHaveLength(failure ? 1 : 0);
  });
  it('filters restrictions by type and removes stale element references', () => {
    expect(profile.getRestrictionsByType('other')).toHaveLength(1);
    profile.registerRef(1, 'name', refs.nameInput); profile.unregisterRef(1, 'name');
    expect(profile.customRefs[1]).toBeUndefined(); profile.unregisterRef('missing', 'name');
  });
});
