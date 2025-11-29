/**
 * QueryCache.js
 * A flexible, in-memory cache inspired by React Query.
 * Manages data, timestamps, TTL (Time To Live), and fetching states.
 */
export default class QueryCache {
  constructor({ defaultTTL = 60000 } = {}) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  _now() {
    return Date.now();
  }

  _createEntry(key, data, ttl, isFetching = false) {
    return {
      data,
      timestamp: this._now(),
      ttl,
      isFetching,
      isStale: false,
      error: null,
    };
  }
  set(key, data, { ttl = this.defaultTTL } = {}) {
    key = JSON.stringify(key)
    const entry = this._createEntry(key, data, ttl);
    this.cache.set(key, entry);
    return entry;
  }

    get(key) {
      key = JSON.stringify(key)
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = this._now() - entry.timestamp > entry.ttl;
    if (isExpired && !entry.isStale) {
      entry.isStale = true;
    }
    return entry;
  }

  invalidate(key) {
    key = JSON.stringify(key)
    const entry = this.cache.get(key);
    if (entry) {
      entry.isStale = true;
    }
  }

  remove(key) {
    key = JSON.stringify(key)
    this.cache.delete(key);
  }
  clear() {
    this.cache.clear();
  }

  setFetching(key, isFetching, { error = null } = {}) {
    key = JSON.stringify(key)
    let entry = this.cache.get(key);
    if (!entry) {
      entry = this._createEntry(key, null, this.defaultTTL, isFetching);
    } else {
      entry.isFetching = isFetching;
    }
    entry.error = error;
    this.cache.set(key, entry);
  }
}
