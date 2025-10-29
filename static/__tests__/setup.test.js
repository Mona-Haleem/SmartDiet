import { describe, it, expect } from '@jest/globals';

describe('Test Setup Verification', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should have jsdom environment', () => {
    expect(document).toBeDefined();
    expect(window).toBeDefined();
  });

  it('should have Alpine.js mocked', () => {
    expect(global.Alpine).toBeDefined();
    expect(global.Alpine.initTree).toBeDefined();
  });

  it('should have fetch mocked', () => {
    expect(global.fetch).toBeDefined();
    expect(typeof global.fetch).toBe('function');
  });

  it('should have localStorage mocked', () => {
    expect(global.localStorage).toBeDefined();
    expect(typeof global.localStorage.getItem).toBe('function');
  });

  it('should have CSRF token in DOM', () => {
    const csrfToken = document.querySelector('[name="csrfmiddlewaretoken"]');
    expect(csrfToken).toBeTruthy();
  });
});