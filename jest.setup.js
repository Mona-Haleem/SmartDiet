import '@testing-library/jest-dom';

// Mock Alpine.js globally
global.Alpine = {
  initTree: jest.fn(),
  start: jest.fn(),
  flushAndStopDeferringMutations: jest.fn(),
  $data: jest.fn((el) => {
    // Return mock Alpine data
    return {
      $refs: {},
      errors: [],
      inputRefs: {}
    };
  })
};

// Mock window.fs for file reading (if you use it)
global.window.fs = {
  readFile: jest.fn()
};

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Headers()
  })
);

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock console methods to keep test output clean
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn()
};

// Setup DOM
beforeEach(() => {
  // Reset DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // Add CSRF token input (Django requirement)
  const csrfInput = document.createElement('input');
  csrfInput.type = 'hidden';
  csrfInput.name = 'csrfmiddlewaretoken';
  csrfInput.value = 'mock-csrf-token';
  document.body.appendChild(csrfInput);
  
  // Reset all mocks
  jest.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  jest.restoreAllMocks();
});