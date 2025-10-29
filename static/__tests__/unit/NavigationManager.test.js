import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import NavigationManager from '../../scripts_module/helpers/utils/NavigationManager.js';

describe('NavigationManager - Unit Tests', () => {
  beforeEach(() => {
    // Reset static properties
    NavigationManager.allowPush = true;
    NavigationManager.initState = true;
    
    // Reset history
    window.history.pushState({}, '', '/');
    
    // Clear all event listeners
    const oldListeners = window._addEventListener;
    window.removeAllListeners = jest.fn();
  });

  describe('pushUrl', () => {
    it('should push new URL to history', () => {
      const pushStateSpy = jest.spyOn(window.history, 'pushState');
      
      NavigationManager.pushUrl('register');
      
      expect(pushStateSpy).toHaveBeenCalled();
      expect(pushStateSpy).toHaveBeenCalledWith(
        {},
        '',
        expect.stringContaining('diet/register')
      );
    });

    it('should not push if URL is already current', () => {
      // Set current URL
      window.history.pushState({}, '', 'http://localhost/diet/login/');
      
      const pushStateSpy = jest.spyOn(window.history, 'pushState');
      
      NavigationManager.pushUrl('login');
      
      // Should not be called because URL is the same
      expect(pushStateSpy).not.toHaveBeenCalled();
    });

    it('should handle empty or invalid URLs', () => {
      const pushStateSpy = jest.spyOn(window.history, 'pushState');
      
      NavigationManager.pushUrl('');
      NavigationManager.pushUrl(null);
      NavigationManager.pushUrl(undefined);
      
      expect(pushStateSpy).not.toHaveBeenCalled();
    });

    it('should pass state object', () => {
      const pushStateSpy = jest.spyOn(window.history, 'pushState');
      const state = { from: 'test' };
      
      NavigationManager.pushUrl('register', state);
      
      expect(pushStateSpy).toHaveBeenCalledWith(
        state,
        '',
        expect.any(String)
      );
    });
  });

  describe('replaceUrl', () => {
    it('should replace current history entry', () => {
      const replaceStateSpy = jest.spyOn(window.history, 'replaceState');
      
      NavigationManager.replaceUrl('register');
      
      expect(replaceStateSpy).toHaveBeenCalled();
    });

    it('should not replace if URL is current', () => {
      window.history.replaceState({}, '', 'http://localhost/diet/login/');
      
      const replaceStateSpy = jest.spyOn(window.history, 'replaceState');
      
      NavigationManager.replaceUrl('login');
      
      expect(replaceStateSpy).not.toHaveBeenCalled();
    });
  });

  describe('onPopState', () => {
    it('should register popstate event listener', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const callback = jest.fn();
      
      NavigationManager.onPopState(callback);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
    });

    it('should call callback with event data on popstate', () => {
      const callback = jest.fn();
      NavigationManager.onPopState(callback);
      
      // Trigger popstate event
      const popstateEvent = new PopStateEvent('popstate', {
        state: { test: 'data' }
      });
      window.dispatchEvent(popstateEvent);
      
      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          state: { test: 'data' },
          url: expect.any(String),
          path: expect.any(String)
        })
      );
    });

    it('should not register callback if not a function', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      NavigationManager.onPopState('not a function');
      NavigationManager.onPopState(null);
      
      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });
  });
});