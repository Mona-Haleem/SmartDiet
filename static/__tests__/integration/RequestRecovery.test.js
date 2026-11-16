import ApiService from '../../scripts_module/helpers/fetchData/ApiService.js';
import QueryCache from '../../scripts_module/helpers/fetchData/QueryCache.js';
import QueryService from '../../scripts_module/helpers/fetchData/QueryService.js';

const response = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => data,
});

describe('real HTTP client, query service, and cache recovery', () => {
  let service;

  beforeEach(() => {
    global.fetch.mockReset();
    service = new QueryService(new ApiService(), new QueryCache());
  });

  it('sends a new request after a failed request instead of succeeding with cached null', async () => {
    fetch.mockResolvedValueOnce(response({ errors: { name: ['Required'] } }, 400))
      .mockResolvedValueOnce(response({ saved: true }));
    const options = { queryFn: service.createQueryFn('/save/', 'PATCH', { name: 'New name' }) };
    const onError = jest.fn();
    await service.query(['save', 1], { ...options, onError });
    const onSuccess = jest.fn();
    await service.query(['save', 1], { ...options, onSuccess });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ data: { saved: true } }));
  });

  it('permits a corrected login after invalid credentials', async () => {
    fetch.mockResolvedValueOnce(response({ errors: { login: ['Invalid credentials'] } }, 400))
      .mockResolvedValueOnce(response({ authenticated: true }));
    const first = new FormData();
    first.set('login', 'user@example.test'); first.set('login_password', 'wrong');
    const corrected = new FormData();
    corrected.set('login', 'user@example.test'); corrected.set('login_password', 'TestPassword1!');
    await service.query(['/login/', first], {
      queryFn: service.createQueryFn('/login/', 'POST', first),
    });
    const result = await service.query(['/login/', corrected], {
      queryFn: service.createQueryFn('/login/', 'POST', corrected),
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1].body.get('login_password')).toBe('TestPassword1!');
    expect(result).toEqual({ authenticated: true });
  });

  it('retries a network failure without treating it as a cached success', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Network unavailable'))
      .mockResolvedValueOnce(response({ restored: true }));
    const options = { queryFn: service.createQueryFn('/progress/', 'GET') };
    await service.query('/progress/', options);
    expect(await service.query('/progress/', options)).toEqual({ restored: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('preserves server validation details for the error callback', async () => {
    fetch.mockResolvedValueOnce(response({ errors: { name: ['Already exists'] } }, 400));
    const onError = jest.fn();
    await service.query('/save/', { queryFn: service.createQueryFn('/save/', 'POST'), onError });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      response: expect.objectContaining({ status: 400, data: { errors: { name: ['Already exists'] } } }),
    }));
  });

  it.each(['GET', 'POST', 'PATCH', 'DELETE'])('propagates cancellation for %s', async method => {
    fetch.mockResolvedValueOnce(response({ ok: true }));
    await service.query([method, '/item/'], { queryFn: service.createQueryFn('/item/', method) });
    expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
});
