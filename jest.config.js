export default {
  // Use jsdom for browser-like environment
  testEnvironment: 'jsdom',
  
  // Setup file runs before each test file
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Module path mapping (adjust to your structure)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/static/$1',
    '^@helpers/(.*)$': '<rootDir>/static/scripts_module/helpers/$1',
    '^@components/(.*)$': '<rootDir>/static/scripts_module/ComponentsClasses/$1'
  },
  
  // Transform JS files with babel
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/static/__tests__/e2e/',
    '/venv/',
    '/.pytest_cache/'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'static/scripts_module/**/*.js',
    'static/common/**/*.js',
    '!static/**/*.test.js',
    '!static/**/*.spec.js',
    '!static/**/*.config.js',
    '!static/**/node_modules/**',
    '!static/scripts_module/unusedScripts/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  // Verbose output
  verbose: true,
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true
};
