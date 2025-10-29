export default {
  // Use jsdom for browser-like environment
  testEnvironment: 'jsdom',
  
  // Setup file runs before each test file
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Module path mapping (adjust to your structure)
  moduleNameMapper: {
    '^@/(.*)$': './static/$1',
    '^@helpers/(.*)$': './static/scripts_module/helpers/$1',
    '^@components/(.*)$': './static/scripts_module/ComponentsClasses/$1'
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
    '!static/**/node_modules/**'
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
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Verbose output
  verbose: true,
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true
};