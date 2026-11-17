import SectionsEditor from '../../scripts_module/ComponentsClasses/SectionsEditor.js';
import { queryService } from '../../common/script.js';
jest.mock('../../common/script.js', () => ({ queryService: { query: jest.fn(), createQueryFn: jest.fn() } }));

describe('section hierarchy edits', () => {
  let editor, dictionary, details, refs, failed, reply;
  beforeEach(() => {
    const child = { id: 2, section: 'Child', order: 1, subSections: [{ id: 4, section: 'Nested', order: 1, subSections: [] }] };
    details = [{ id: 1, section: 'Week', order: 1, subSections: [child] }, { id: 3, section: 'Other', order: 2, subSections: [] }];
    dictionary = { 1: { parentId: null, data: details[0] }, 2: { parentId: 1, data: child }, 3: { parentId: null, data: details[1] }, 4: { parentId: 2, data: child.subSections[0] } };
    const root = document.createElement('div'); document.body.append(root); refs = {};
    for (const id of [1, 2, 3, 4]) { refs[`section-${id}`] = document.createElement('section'); refs[`section-${id}`].id = `section-${id}`; }
    root.append(refs['section-1'], refs['section-3']); refs['section-1'].append(refs['section-2']); refs['section-2'].append(refs['section-4']);
    failed = false; reply = {};
    queryService.createQueryFn.mockImplementation((url, method, body) => Object.assign(jest.fn(), { url, method, body }));
    queryService.query.mockImplementation(async (_key, options) => { if (failed) options.onError?.({ error: new Error('Offline') }); else options.onSuccess?.({ data: reply }); return reply; });
    window.eleObj = { sectionNavigator: { getSectionPage: jest.fn(() => 1) }, mode: 1, updateData: jest.fn(), onPaginate: jest.fn() };
    editor = new SectionsEditor(dictionary);
  });
  afterEach(() => { delete window.eleObj; });
  it('does not send unchanged or blank titles', async () => {
    const input = refs['section-1']; input.innerText = 'Week:'; await editor.renameSection(1, input, null, details[0]);
    input.innerText = ''; await editor.renameSection(1, input, null, details[0]); expect(input.innerText).toBe('Week'); expect(queryService.query).not.toHaveBeenCalled();
  });
  it('rejects sibling name collisions and restores the original on a second attempt', async () => {
    const input = refs['section-1']; input.innerText = 'Other'; await editor.renameSection(1, input, null, details[0]);
    expect(input).toHaveClass('invalid'); await editor.renameSection(1, input, null, details[0]);
    expect(input.innerText).toBe('Week'); expect(input).not.toHaveClass('invalid'); expect(queryService.query).not.toHaveBeenCalled();
  });
  it.each([false, true])('persists a unique title only after success, failure=%s', async failure => {
    failed = failure; const input = refs['section-1']; input.innerText = 'Renamed'; await editor.renameSection(1, input, null, details[0]);
    expect(details[0].section).toBe(failure ? 'Week' : 'Renamed'); expect(input.classList.contains('invalid')).toBe(failure);
  });
  it('reparents a section without corrupting sibling IDs', async () => {
    await editor.reorderSection(2, 3, 'parent', refs);
    expect(details[0].subSections).toEqual([]); expect(details[1].subSections.map(item => item.id)).toEqual([2]);
    expect(dictionary[2].parentId).toBe(3); expect(refs['section-2'].parentElement).toBe(refs['section-3']);
  });
  it('retains both hierarchy and DOM on failed reordering', async () => {
    failed = true; await editor.reorderSection(2, 3, 'parent', refs); expect(dictionary[2].parentId).toBe(1); expect(details[0].subSections[0].id).toBe(2);
  });
  it('creates a child once and chooses an unused sibling title', async () => {
    details[0].subSections[0].section = 'section';
    reply = { detail: [{ id: 5, section: 'section (1)', order: 2, subSections: [] }], html: '<section id="section-5"></section>' };
    await editor.createSection(1, 'parent', refs, document.body, details);
    expect(details[0].subSections.map(item => item.id)).toEqual([2, 5]); expect(dictionary[5].data.section).toBe('section (1)');
    expect(refs['section-1'].querySelector('#section-5')).not.toBeNull();
    expect(JSON.parse(queryService.createQueryFn.mock.calls[0][2])).toMatchObject({ section: 'section (1)', order: 2 });
  });
  it('creates a top-level sibling and updates navigation', async () => {
    reply = { detail: [{ id: 5, section: 'section', order: 2, subSections: [] }], html: '<section id="section-5"></section>' };
    await editor.createSection(1, 'after', refs, document.body, details);
    expect(details.map(item => item.id)).toContain(5); expect(details[1].order).toBe(3); expect(window.eleObj.updateData).toHaveBeenCalled();
  });
  it('removes all descendants and uses the server details response after deletion', async () => {
    reply = { details: [details[1]] }; const data = { ele: { details } };
    await editor.deleteSection(1, refs['section-1'], data);
    expect(Object.keys(dictionary)).toEqual(['3']); expect(data.ele.details).toEqual(reply.details); expect(refs['section-1'].isConnected).toBe(false);
  });
  it('preserves sections when creation or deletion fails', async () => {
    failed = true; await editor.createSection(1, 'parent', refs, document.body, details);
    await editor.deleteSection(1, refs['section-1'], { ele: { details } });
    expect(Object.keys(dictionary)).toHaveLength(4); expect(refs['section-1'].isConnected).toBe(true);
  });
});
