import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ApiService from '../../scripts_module/helpers/fetchData/ApiService.js';

describe('ApiService - Integration Tests', () => {
  let apiService;

  beforeEach(() => {
    apiService = new ApiService();
    global.fetch.mockClear();
  });

  describe('request method', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { data: 'test' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse)
      });

      const result = await apiService.request('/api/test', 'GET');

      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.type).toBe('json');
      expect(result.data).toEqual(mockResponse);
    });

    it('should make successful POST request with JSON body', async () => {
      const mockResponse = { id: 1, created: true };
      const requestBody = { name: 'Test' };
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse)
      });

      const result = await apiService.request('/api/test', 'POST', requestBody);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody)
        })
      );
    });

    it('should make POST request with FormData', async () => {
      const formData = new FormData();
      formData.append('username', 'testuser');
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
        text: async () => '{}'
      });

      await apiService.request('/api/test', 'POST', formData);

      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[1].body).toBeInstanceOf(FormData);
      expect(fetchCall[1].headers['Content-Type']).toBeUndefined(); // Should be removed for FormData
    });

    it('should include CSRF token for non-GET requests', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
        text: async () => '{}'
      });

      await apiService.request('/api/test', 'POST', { data: 'test' });

      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[1].headers['X-CSRFToken']).toBe('mock-csrf-token');
    });

    it('should not include CSRF token for GET requests', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
        text: async () => '{}'
      });

      await apiService.request('/api/test', 'GET');

      const fetchCall = global.fetch.mock.calls[0];
      expect(fetchCall[1].headers['X-CSRFToken']).toBeUndefined();
    });

    it('should handle HTML responses', async () => {
      const htmlContent = '<div>Test HTML</div>';
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        json: async () => { throw new Error('Not JSON'); },
        text: async () => htmlContent
      });

      const result = await apiService.request('/api/test', 'GET');

      expect(result.type).toBe('html');
      expect(result.data).toBe(htmlContent);
    });

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiService.request('/api/test', 'GET'))
        .rejects.toThrow('Network error');
    });

    it('should handle failed responses', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Not found' }),
        text: async () => '{"error":"Not found"}'
      });

      const result = await apiService.request('/api/test', 'GET');

      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(result.data.error).toBe('Not found');
    });
  });

  describe('convenience methods', () => {
    it('should call GET method', async () => {
      const requestSpy = jest.spyOn(apiService, 'request');
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
        text: async () => '{}'
      });

      await apiService.get('/api/test');

      expect(requestSpy).toHaveBeenCalledWith('/api/test', 'GET', null, {});
    });

    it('should call POST method with body', async () => {
      const requestSpy = jest.spyOn(apiService, 'request');
      const body = { data: 'test' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
        text: async () => '{}'
      });

      await apiService.post('/api/test', body);

      expect(requestSpy).toHaveBeenCalledWith('/api/test', 'POST', body, {});
    });

    it('should call PUT method', async () => {
      const requestSpy = jest.spyOn(apiService, 'request');
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
        text: async () => '{}'
      });

      await apiService.put('/api/test', { data: 'test' });

      expect(requestSpy).toHaveBeenCalledWith('/api/test', 'PUT', { data: 'test' }, {});
    });

    it('should call PATCH method', async () => {
      const requestSpy = jest.spyOn(apiService, 'request');
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
        text: async () => '{}'
      });

      await apiService.patch('/api/test', { data: 'test' });

      expect(requestSpy).toHaveBeenCalledWith('/api/test', 'PATCH', { data: 'test' }, {});
    });

    it('should call DELETE method', async () => {
      const requestSpy = jest.spyOn(apiService, 'request');
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
        text: async () => '{}'
      });

      await apiService.delete('/api/test');

      expect(requestSpy).toHaveBeenCalledWith('/api/test', 'DELETE', null, {});
    });
  });

  describe('CSRF token retrieval', () => {
    it('should get CSRF token from input', () => {
      const token = apiService.getCsrfToken();
      expect(token).toBe('mock-csrf-token');
    });

    it('should return null if no CSRF token found', () => {
      const csrfInput = document.querySelector('[name="csrfmiddlewaretoken"]');
      csrfInput.remove();

      const token = apiService.getCsrfToken();
      expect(token).toBeNull();
    });
  });
});