import CreationForm from '../../scripts_module/ComponentsClasses/creationForm.js';
import { queryService } from '../../common/script.js';
jest.mock('../../common/script.js', () => ({ queryService: { query: jest.fn(), createQueryFn: jest.fn() } }));

describe('recipe and plan creation form', () => {
  let form, data, refs;
  beforeEach(() => {
    jest.useFakeTimers();
    refs = { form: document.createElement('form'), dialog: document.createElement('div') };
    refs.form.innerHTML = '<input name="name">'; refs.dialog.append(refs.form); document.body.append(refs.dialog);
    data = { currentType: 'recipe', showAddForm: true, categorySuggestions: ['Dinner', 'Lunch'], activeSuggestion: -1 };
    form = new CreationForm(data, refs); jest.runAllTimers();
    data.formData.name = 'Oats';
    queryService.createQueryFn.mockImplementation((url, method, body) => Object.assign(jest.fn(), { url, method, body }));
    queryService.query.mockResolvedValue({});
  });
  afterEach(() => {
    jest.clearAllTimers(); jest.useRealTimers(); delete window.homeManager; delete window.dayProgress;
  });
  it('opens and focuses the name field', () => {
    expect(data.isOpen).toBe(true); expect(refs.form.querySelector('input')).toHaveFocus();
  });
  it.each([
    ['name', '', 'name'], ['name', 'x'.repeat(101), 'name'], ['serv', -1, 'serv'],
    ['prep_time_hours', -1, 'prep_time_hours'], ['prep_time_minutes', 60, 'prep_time_minutes'],
  ])('validates %s before sending a request', async (field, value, error) => {
    data.formData[field] = value;
    await form.submit(); expect(data.errors[error]).toBeTruthy(); expect(queryService.query).not.toHaveBeenCalled();
  });
  it('validates plan type and duration', () => {
    form.switchType('plan'); data.formData.name = 'Plan'; data.formData.category = 'unknown'; data.formData.duration_days = 0;
    expect(form.validate().category).toBeTruthy(); data.formData.category = 'diet'; data.formData.duration_days = -1;
    expect(form.validate().duration_days).toBeTruthy();
  });
  it('submits a validated recipe with its type', async () => {
    await form.submit();
    const [url, method, body] = queryService.createQueryFn.mock.calls.at(-1);
    expect(url).toContain('/recipes/new/Oats/'); expect(method).toBe('post');
    expect(JSON.parse(body)).toMatchObject({ name: 'Oats', type: 'recipe', serv: 1 });
  });
  it('clears irrelevant linked plans for a diet plan', async () => {
    form.switchType('plan'); Object.assign(data.formData, { name: 'Plan', category: 'diet', diet_plan_id: 4 });
    await form.submit(); expect(JSON.parse(queryService.createQueryFn.mock.calls.at(-1)[2]).diet_plan_id).toBeNull();
  });
  it('shows server validation errors and permits retry', async () => {
    queryService.query.mockImplementation(async (_key, options) => options.onError({ response: { data: { errors: { name: ['Taken'] } } } }));
    await form.submit(); expect(data.errors.name).toEqual(['Taken']); expect(data.isSubmitting).toBe(false);
  });
  it('shows a useful error after a connection failure', async () => {
    queryService.query.mockImplementation(async (_key, options) => options.onError({ error: new Error('Offline') }));
    await form.submit(); expect(data.errors.__all__).toContain('try again'); expect(data.isSubmitting).toBe(false);
  });
  it('assigns a newly created plan on a progress page', async () => {
    window.dayProgress = { setCurrPlan: jest.fn(), $data: { allPlans: [] } };
    queryService.query.mockImplementation(async (_key, options) => options.onSuccess({ data: { id: 7, name: 'Plan', category: 'diet' } }));
    await form.submit(); await jest.runAllTimersAsync();
    expect(window.dayProgress.setCurrPlan).toHaveBeenCalledWith(7, 'diet'); expect(data.isSubmitting).toBe(false);
    expect(window.dayProgress.$data.allPlans).toEqual([{ id: 7, name: 'Plan', category: 'diet' }]);
  });
  it('cycles category suggestions, selects one, and clears its error', () => {
    data.showCategorySuggestions = true; form.moveDown(); expect(data.activeSuggestion).toBe(0);
    form.moveUp(); expect(data.activeSuggestion).toBe(1); form.selectActive();
    expect(data.formData.category).toBe('Lunch'); expect(data.showCategorySuggestions).toBe(false);
    data.errors = { category: 'Required' }; form.clearError('category'); expect(data.errors).toEqual({});
  });
  it('applies a duration preset and preserves a custom duration', () => {
    data.formData.duration_preset = '14'; form.updateDuration(); expect(data.formData.duration_days).toBe(14);
    data.formData.duration_preset = ''; data.formData.duration_days = 5; form.updateDuration(); expect(data.formData.duration_days).toBe(5);
  });
  it('closes and restores the opener focus', () => {
    const opener = document.createElement('button'); document.body.append(opener); form.returnFocus = opener;
    form.close(); jest.runAllTimers(); expect(data.showAddForm).toBe(false); expect(opener).toHaveFocus();
  });
});
