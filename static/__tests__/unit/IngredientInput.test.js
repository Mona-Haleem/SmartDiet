import IngredientInput from '../../scripts_module/ComponentsClasses/ingredientsInput.js';

describe('structured ingredient entry', () => {
  let data, refs, input;
  beforeEach(() => {
    jest.useFakeTimers();
    data = { ingredients: [], current: { amount: 2, unit: 'cup', name: ' flour ' }, activeUnit: -1 };
    refs = { ingredientAmount: document.createElement('input'), ingredientName: document.createElement('input') };
    document.body.append(refs.ingredientAmount, refs.ingredientName);
    input = new IngredientInput(data, refs);
  });
  afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); });

  it('adds trimmed structured values and restores amount focus', () => {
    input.addIngredient(); jest.runAllTimers();
    expect(data.ingredients).toEqual([{ amount: 2, unit: 'cup', name: 'flour' }]);
    expect(data.current.name).toBe('');
    expect(refs.ingredientAmount).toHaveFocus();
  });
  it('ignores blank ingredient names', () => {
    data.current.name = ' '; input.addIngredient(); expect(data.ingredients).toEqual([]);
  });
  it.each(['', 'unknown-unit'])('defaults missing/unknown unit %s to a piece', unit => {
    data.current.unit = unit; data.current.amount = ''; input.addIngredient();
    expect(data.ingredients[0]).toMatchObject({ amount: 1, unit: 'piece' });
  });
  it('removes only the selected ingredient', () => {
    data.ingredients = [{ name: 'flour' }, { name: 'milk' }]; input.removeIngredient(0);
    expect(data.ingredients).toEqual([{ name: 'milk' }]);
  });
  it('filters suggestions without case sensitivity', () => {
    data.current.unit = 'TA'; input.filterUnits(); expect(data.filteredUnits).toEqual(['tablespoon', 'tablespoons']);
    data.current.unit = ''; input.filterUnits(); expect(data.filteredUnits).toContain('kg');
  });
  it('cycles suggestions in both directions', () => {
    data.filteredUnits = ['g', 'kg']; input.moveDown(); expect(data.activeUnit).toBe(0);
    input.moveUp(); expect(data.activeUnit).toBe(1); input.moveDown(); expect(data.activeUnit).toBe(0);
  });
  it('does not select a non-existent suggestion', () => {
    data.filteredUnits = []; input.moveDown(); expect(data.activeUnit).toBe(-1);
  });
  it('selects a suggestion and focuses the ingredient name', () => {
    input.selectUnit('kg'); expect(data.current.unit).toBe('kg'); expect(data.showUnitSuggestions).toBe(false);
    expect(refs.ingredientName).toHaveFocus();
  });
  it('round-trips ingredient text and preserves multiword names', () => {
    input.loadFromText('1.5 cup wheat flour\n2 piece egg\n salt ');
    expect(data.ingredients).toEqual([{ amount: 1.5, unit: 'cup', name: 'wheat flour' },
      { amount: 2, unit: 'piece', name: 'egg' }, { amount: 1, unit: 'piece', name: 'salt' }]);
    expect(input.serialize()).toBe('1.5 cup wheat flour\n2 piece egg\n1 piece salt');
    input.loadFromText(''); expect(data.ingredients).toHaveLength(3);
  });
});
