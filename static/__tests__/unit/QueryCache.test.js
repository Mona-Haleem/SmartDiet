import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import QueryCache from '../../scripts_module/helpers/fetchData/QueryCache.js';

describe('QueryCache - Unit Tests', () => {
  let cache;

  beforeEach(() => {
    cache = new QueryCache({ defaultTTL: 1000 });
  });

  describe('set and get', () => {
    it('should store and retrieve data', () => {
      const testData = { id: 1, name: 'Test' };
      cache.set('key1', testData);
      
      const entry = cache.get('key1');
      
      expect(entry).not.toBeNull();
      expect(entry.data).toEqual(testData);
      expect(entry.isStale).toBe(false);
      expect(entry.isFetching).toBe(false);
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should include timestamp', () => {
      cache.set('key1', 'data');
      const entry = cache.get('key1');
      
      expect(entry.timestamp).toBeDefined();
      expect(typeof entry.timestamp).toBe('number');
    });

    it('should use custom TTL when provided', () => {
      cache.set('key1', 'data', { ttl: 5000 });
      const entry = cache.get('key1');
      
      expect(entry.ttl).toBe(5000);
    });

    it('should use default TTL when not provided', () => {
      cache.set('key1', 'data');
      const entry = cache.get('key1');
      
      expect(entry.ttl).toBe(1000);
    });
  });

  describe('stale data detection', () => {
    it('should mark data as stale after TTL expires', async () => {
      cache.set('key1', 'value', { ttl: 100 });
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const entry = cache.get('key1');
      expect(entry.isStale).toBe(true);
    });

    it('should not mark data as stale before TTL expires', () => {
      cache.set('key1', 'value', { ttl: 1000 });
      
      const entry = cache.get('key1');
      expect(entry.isStale).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('should mark entry as stale', () => {
      cache.set('key1', 'value');
      cache.invalidate('key1');
      
      const entry = cache.get('key1');
      expect(entry.isStale).toBe(true);
    });

    it('should not throw error for non-existent key', () => {
      expect(() => cache.invalidate('nonexistent')).not.toThrow();
    });
  });

  describe('remove', () => {
    it('should delete entry from cache', () => {
      cache.set('key1', 'value');
      expect(cache.get('key1')).not.toBeNull();
      
      cache.remove('key1');
      expect(cache.get('key1')).toBeNull();
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      cache.clear();
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });
  });

  describe('setFetching', () => {
    it('should set fetching state for existing entry', () => {
      cache.set('key1', 'value');
      cache.setFetching('key1', true);
      
      const entry = cache.get('key1');
      expect(entry.isFetching).toBe(true);
    });

    it('should create entry if it does not exist', () => {
      cache.setFetching('key1', true);
      
      const entry = cache.get('key1');
      expect(entry).not.toBeNull();
      expect(entry.isFetching).toBe(true);
    });

    it('should set error when provided', () => {
      const error = new Error('Test error');
      cache.setFetching('key1', false, { error });
      
      const entry = cache.get('key1');
      expect(entry.error).toBe(error);
    });

    it('should clear error when not provided', () => {
      const error = new Error('Test error');
      cache.setFetching('key1', true, { error });
      cache.setFetching('key1', false);
      
      const entry = cache.get('key1');
      expect(entry.error).toBeNull();
    });
  });
});