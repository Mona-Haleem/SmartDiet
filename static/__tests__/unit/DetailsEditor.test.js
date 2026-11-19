import DetailsEditor from '../../scripts_module/ComponentsClasses/detailsEditor.js';
import { queryService } from '../../common/script.js';
jest.mock('../../common/script.js', () => ({ queryService: { query: jest.fn(), createQueryFn: jest.fn() } }));

describe('editor save, cancellation and failure recovery', () => {
  let editor, component, form, failed, html, root, formRoot;
  const original = [{ type: 'p', content: 'Original', effects: [] }];
  const changed = [{ type: 'p', content: 'Changed', effects: ['fw-bold'] }];
  const copy = value => JSON.parse(JSON.stringify(value));
  beforeEach(() => {
    document.body.innerHTML = '<div x-data="{ele:{}}"></div><div x-data="createSectionDetailsEditor()"></div><div class="paginator-container"></div>';
    root = document.body.children[0]; formRoot = document.body.children[1];
    component = { mode: 'details', sections: { 7: { data: { section: 'Day 1', detail: copy(original) } },
      directions: { data: { section: 'Directions', detail: copy(original) } } } };
    form = {}; failed = false; html = '<p>Saved response</p>';
    Alpine.$data.mockImplementation(element => element === root ? component : element === formRoot ? form : {});
    Alpine.nextTick = jest.fn(async callback => callback?.());
    queryService.createQueryFn.mockImplementation((url, method, body) => Object.assign(jest.fn(), { url, method, body }));
    queryService.query.mockImplementation(async (_key, options) => { if (failed) options.onError?.({ error: new Error('Offline') }); else options.onSuccess?.({ data: html }); return html; });
    const section = document.createElement('section'); section.innerHTML = '<h2>Day 1</h2><div>Original</div>';
    const directions = document.createElement('section'); directions.innerHTML = '<h2>Directions</h2><div>Original</div><p>Old trailing node</p>';
    window.eleObj = { $data: component,
      $refs: { 'section-7': section, recDirections: directions }, mode: 1, swapContent: jest.fn(),
      sectionNavigator: { getSectionPage: jest.fn(() => 2) }, updateData: jest.fn(), onPaginate: jest.fn(),
      updateServerData: jest.fn(async (_keys, _body, success, error) => { if (failed) error?.(); else success?.({ data: html }); }) };
    component.ele = { directions: copy(original) };
    window.alert = jest.fn(); editor = new DetailsEditor();
  });
  afterEach(() => { delete window.eleObj; delete Alpine.nextTick; });
  it('opens a deep copy of the selected section without modifying the original', () => {
    editor.init(7); expect(component.mode).toBe('editor'); expect(form.sectionId).toBe(7);
    expect(form.details).toEqual(original); form.details[0].content = 'Draft';
    expect(component.sections[7].data.detail).toEqual(original); expect(editor.originalData.detail).toEqual(original);
    expect(document.querySelector('.paginator-container').style.position).toBe('static');
  });
  it('loads empty section details as an empty editable document', () => {
    delete component.sections[7].data.detail; editor.init(7); expect(form.details).toEqual([]); expect(form.originalDetails).toEqual([]);
  });
  it('tolerates a component that is unmounted before the next render', () => {
    Alpine.$data.mockImplementation(element => element === root ? component : null);
    expect(() => editor.init(7)).not.toThrow(); expect(editor.editorInstance).toBeNull();
  });
  it('cancels an edit and clears the editor state', () => {
    editor.init(7); component.sections[7].data.detail = changed; editor.cancel();
    expect(component.sections[7].data.detail).toEqual(original); expect(component.mode).toBe('details');
    expect(editor.currentSectionId).toBeNull(); expect(editor.editorInstance).toBeNull(); expect(editor.originalData).toBeNull();
    editor.cancel(); expect(component.mode).toBe('details');
  });
  it('sends structured details and updates only the selected section after success', async () => {
    editor.init(7); const previous = window.eleObj.$refs['section-7'].children[1];
    await editor.saveDetails(changed);
    expect(queryService.createQueryFn).toHaveBeenCalledWith('/diet/collections/plans/sections/7/', 'patch', JSON.stringify({ detail: changed }));
    expect(component.sections[7].data.detail).toEqual(changed);
    expect(window.eleObj.swapContent).toHaveBeenCalledWith(html, previous);
    expect(window.eleObj.updateData).toHaveBeenCalledWith(2); expect(window.eleObj.onPaginate).toHaveBeenCalledWith(undefined, 2);
    expect(component.mode).toBe('details'); expect(editor.currentSectionId).toBeNull();
  });
  it('keeps a rejected save open with the draft intact for retry', async () => {
    editor.init(7); form.details = copy(changed); failed = true; await editor.saveDetails(form.details);
    expect(component.mode).toBe('editor'); expect(form.details).toEqual(changed); expect(editor.currentSectionId).toBe(7);
    expect(component.sections[7].data.detail).toEqual(original); expect(window.alert).toHaveBeenCalled();
    failed = false; await editor.saveDetails(form.details); expect(component.sections[7].data.detail).toEqual(changed);
  });
  it('does not persist anything when no section is selected', async () => {
    await editor.saveDetails(changed); await editor.saveDirections(changed);
    expect(queryService.query).not.toHaveBeenCalled(); expect(window.eleObj.updateServerData).not.toHaveBeenCalled();
  });
  it('saves recipe directions using the recipe endpoint and removes superseded nodes', async () => {
    editor.init('directions'); const target = window.eleObj.$refs.recDirections;
    const replaced = target.children[1]; await editor.saveDetails(changed);
    expect(window.eleObj.updateServerData.mock.calls[0].slice(0, 2)).toEqual([['updateDirections'], { directions: changed }]);
    expect(component.ele.directions).toEqual(changed); expect(target.children).toHaveLength(2);
    expect(window.eleObj.swapContent).toHaveBeenCalledWith(html, replaced); expect(window.eleObj.updateData).toHaveBeenCalledWith(0);
    expect(editor.currentSectionId).toBeNull();
  });
  it('keeps recipe direction edits available after an API failure', async () => {
    editor.init('directions'); failed = true; await editor.saveDetails(changed);
    expect(component.mode).toBe('editor'); expect(component.ele.directions).toEqual(original);
    expect(editor.currentSectionId).toBe('directions'); expect(window.eleObj.swapContent).not.toHaveBeenCalled();
  });
  it('can save when a section DOM node has been replaced by another render', async () => {
    editor.init(7); delete window.eleObj.$refs['section-7']; await editor.saveDetails(changed);
    expect(component.sections[7].data.detail).toEqual(changed); expect(editor.currentSectionId).toBeNull();
  });
  it('falls back to the event loop when Alpine has no nextTick hook', () => {
    jest.useFakeTimers(); delete Alpine.nextTick; const callback = jest.fn(); editor.$nextTick(callback);
    expect(callback).not.toHaveBeenCalled(); jest.runAllTimers(); expect(callback).toHaveBeenCalledTimes(1); jest.useRealTimers();
  });
});
