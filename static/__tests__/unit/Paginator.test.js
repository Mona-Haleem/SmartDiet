import Paginator from '../../scripts_module/ComponentsClasses/Paginator.js';

describe('Paginator behavior', () => {
  let paginator;
  let data;

  beforeEach(() => {
    jest.spyOn(window, 'addEventListener').mockImplementation(() => {});
    data = { page: 1, next: true, prev: false };
    paginator = new Paginator(data, {});
    paginator.pageClass = {
      mode: 1,
      onPaginate: jest.fn(async (_direction, page) => ({ page, next: page < 3, prev: page > 1 })),
    };
  });

  it('moves to the next page and uses the returned navigation state', async () => {
    await paginator.paginateTo('next');
    expect(paginator.pageClass.onPaginate).toHaveBeenCalledWith('next', 2);
    expect(data).toEqual({ page: 2, next: true, prev: true });
  });

  it('moves to the previous page', async () => {
    Object.assign(data, { page: 2, prev: true });
    await paginator.paginateTo('prev');
    expect(data.page).toBe(1);
    expect(data.prev).toBe(false);
  });

  it('navigates directly to a requested page', async () => {
    await paginator.paginateTo(3);
    expect(data).toEqual({ page: 3, next: false, prev: true });
  });

  it('does not move backwards past the first page', async () => {
    await paginator.paginateTo('prev');
    expect(data.page).toBe(1);
    expect(paginator.pageClass.onPaginate).not.toHaveBeenCalled();
  });

  it('does not move past the last page', async () => {
    Object.assign(data, { page: 3, next: false, prev: true });
    await paginator.paginateTo('next');
    expect(data.page).toBe(3);
    expect(paginator.pageClass.onPaginate).not.toHaveBeenCalled();
  });

  it('advances a two-column spread once rather than incrementing twice', async () => {
    paginator.pageClass.mode = 2;
    await paginator.paginateTo('next');
    expect(data.page).toBe(2);
    expect(paginator.pageClass.onPaginate).toHaveBeenCalledWith('next', 2);
  });

  it('accepts explicit false navigation flags in a partial update', () => {
    paginator.updateData({ next: false, page: 3 });
    expect(data).toEqual({ page: 3, next: false, prev: false });
  });
});

