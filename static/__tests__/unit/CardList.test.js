import CardList from '../../scripts_module/ComponentsClasses/CardList.js';
import NavigationManager from '../../scripts_module/helpers/utils/NavigationManager.js';

describe('browse sizing and URLs', () => {
  let list;

  beforeEach(() => {
    list = Object.create(CardList.prototype);
    list.$el = document.createElement('div');
    Object.defineProperty(list.$el, 'clientHeight', { value: 570, configurable: true });
    list.size = 24;
    history.replaceState({}, '', '/diet/collections/browse/?q=oats&categories=Dinner');
    NavigationManager.allowPush = false;
  });

  it.each([[500, 4], [700, 8], [900, 12], [1200, 16], [1400, 24]])(
    'fits cards at viewport width %i', (width, expected) => {
      Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
      expect(list.getCurrentListSize().size).toBe(expected);
    }
  );

  it('preserves search/filter parameters during pagination', () => {
    const url = new URL(list.buildQueryUrl(2));
    expect(url.pathname).toBe('/diet/collections/browse/');
    expect(url.searchParams.get('q')).toBe('oats');
    expect(url.searchParams.get('categories')).toBe('Dinner');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('size')).toBe('24');
  });

  it('requests a positive bounded page size for a temporarily hidden container', () => {
    Object.defineProperty(list.$el, 'clientHeight', { value: 0, configurable: true });
    const { size } = list.getCurrentListSize();
    expect(size).toBeGreaterThan(0);
    expect(size).toBeLessThanOrEqual(24);
  });
});
