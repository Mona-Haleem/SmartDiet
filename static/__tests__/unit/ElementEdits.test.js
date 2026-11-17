import EleDataManager from '../../scripts_module/ComponentsClasses/EleDataManager.js';
import Component from '../../scripts_module/ComponentsClasses/Component.js';
import { queryService } from '../../common/script.js';
jest.mock('../../common/script.js', () => ({ queryService: { query: jest.fn(), createQueryFn: jest.fn() } }));

describe('recipe and plan detail edits', () => {
  let manager, data, input, failed, reply;
  const make = (type = 'recipe') => {
    data = { mode: 'fullImages', ele: { type, creation_id: 3, name: 'Meal', goal: 'Healthy', notes: 'Original',
      ingredients: [{ name: 'Rice', amount: 1, unit: 'cup' }], directions: [], details: [{ id: 1, section: 'Week', subSections: [{ id: 2, section: 'Day', subSections: [] }] }], created: new Date().toISOString(), edited: new Date().toISOString(), duration: 'P2D' } };
    return new EleDataManager(document.createElement('div'), {}, data, jest.fn(), { anchor: document.createElement('a'), anchorName: document.createElement('span') });
  };
  beforeEach(() => {
    failed = false; reply = { nutrients: { calories: 20 } }; input = document.createElement('input');
    queryService.createQueryFn.mockImplementation((url, method, body) => Object.assign(jest.fn(), { url, method, body }));
    queryService.query.mockImplementation(async (_key, options) => { if (failed) options.onError?.({}); else options.onSuccess?.({ data: reply }); return reply; });
    manager = make();
  });
  afterEach(() => { Component.instances = {}; delete window.dragEle; });
  const lastBody = () => JSON.parse(queryService.createQueryFn.mock.calls.at(-1)[2]);
  it('indexes nested plan sections without losing their parent', () => {
    manager = make('plan'); expect(data.sections[2]).toMatchObject({ parentId: 1, data: { section: 'Day' } }); expect(data.sections[1].parentId).toBeNull();
  });
  it.each([['Meal', false], ['', false], [' New meal ', true]])('validates name %s before persisting', async (value, sends) => {
    input.innerText = value; await manager.updateName(input); expect(queryService.query).toHaveBeenCalledTimes(sends ? 1 : 0);
    expect(data.ele.name).toBe(sends ? 'New meal' : 'Meal'); if (sends) expect(manager.extraRefs.anchorName.innerText).toBe('New meal');
  });
  it('marks a rejected name and retains the original', async () => {
    failed = true; input.innerText = 'Rejected'; await manager.updateName(input); expect(input).toHaveClass('invalid'); expect(data.ele.name).toBe('Meal');
  });
  it.each([['Goal', 'goal', 'Healthy'], ['Notes', 'notes', 'Original']])('saves changed %s text and ignores unchanged values', async (method, field, original) => {
    input.innerText = original; await manager[`update${method}`](input); expect(queryService.query).not.toHaveBeenCalled();
    input.innerText = ' Changed '; await manager[`update${method}`](input); expect(data.ele[field]).toBe('Changed');
    input.innerText = ''; await manager[`update${method}`](input); expect(input.innerText).toBe('Changed');
  });
  it.each([['3', 3], ['0', null], ['invalid', null], ['-2', null]])('validates serving count %s', async (value, expected) => {
    input.value = value; await manager.updateServing(input);
    if (expected === null) expect(queryService.query).not.toHaveBeenCalled(); else expect(lastBody()).toEqual({ serv: expected });
  });
  it.each([true, false])('combines preparation hours and minutes, edited hours=%s', async hours => {
    const wrapper = document.createElement('div'); wrapper.innerHTML = '<input value="2"><span>:</span><input value="15">';
    await manager.updatePrepTime(wrapper.children[hours ? 0 : 2], hours); expect(lastBody()).toEqual({ prep_time: 135 });
    wrapper.children[hours ? 0 : 2].value = 'invalid'; queryService.query.mockClear();
    await manager.updatePrepTime(wrapper.children[hours ? 0 : 2], hours); expect(queryService.query).not.toHaveBeenCalled();
  });
  it.each([false, true])('preserves the ingredient snapshot across save failure=%s', async failure => {
    failed = failure; data.ele.ingredients.push({ name: 'Salt' }); await manager.saveIng();
    if (failure) expect(data.ele.ingredients).toEqual([{ name: 'Rice', amount: 1, unit: 'cup' }]);
    else expect(data.ele.nutrients).toEqual(reply.nutrients);
  });
  it('cancels ingredient edits without mutating the saved snapshot', () => {
    data.ele.ingredients.push({ name: 'Salt' }); manager.cancelSaveIng(); data.ele.ingredients.push({ name: 'Pepper' }); manager.cancelSaveIng();
    expect(data.ele.ingredients).toHaveLength(1);
  });
  it.each([['2', 2880], ['0', 1440], ['invalid', null]])('validates duration %s in minutes', async (value, expected) => {
    input.value = value; await manager.updateDuration(input); if (expected === null) expect(queryService.query).not.toHaveBeenCalled();
    else { expect(lastBody()).toEqual({ duration: expected }); expect(data.ele.formatedDuration).toBe(`${expected / 1440} day${expected > 1440 ? 's' : ''}`); }
  });
  it('sends clone requests without requiring a redirect and handles failure', async () => {
    await manager.cloneEle(); expect(queryService.createQueryFn.mock.calls.at(-1).slice(0, 2)).toEqual(['/diet/collections/recipes/3/Meal/', 'post']);
    failed = true; await expect(manager.cloneEle()).resolves.toBeUndefined();
  });
  it('routes section actions and ignores unknown actions', async () => {
    manager = make('plan'); manager.sectionsEditor = { createSection: jest.fn(), renameSection: jest.fn(), reorderSection: jest.fn() }; manager.detailsEditor = { init: jest.fn() };
    window.dragEle = document.createElement('section'); window.dragEle.id = 'section-2';
    for (const action of ['createSection', 'renameSection', 'reorderSection', 'editDetails', 'unknown']) await manager.handleSectionAction(1, action, { inputEle: input, targetId: 1, targetRelation: 'parent' });
    expect(manager.sectionsEditor.reorderSection.mock.calls[0].slice(0, 3)).toEqual(['2', 1, 'parent']); expect(manager.detailsEditor.init).toHaveBeenCalledWith(1);
  });
});
