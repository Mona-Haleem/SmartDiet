import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as dom from '../../scripts_module/helpers/utils/DomUtils.js';

describe('DomUtils - Unit Tests', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('showError', () => {
    it('should create and display error message', () => {
      dom.showError('Test error message', container);
      
      const errorEl = container.querySelector('.input-error');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toBe('Test error message');
    });

    it('should update existing error message when all=false', () => {
      dom.showError('First error', container);
      dom.showError('Second error', container);
      
      const errorElements = container.querySelectorAll('.input-error');
      expect(errorElements.length).toBe(1);
      expect(errorElements[0].textContent).toBe('Second error');
    });

    it('should create multiple error messages when all=true', () => {
      dom.showError('First error', container, true);
      dom.showError('Second error', container, true);
      
      const errorElements = container.querySelectorAll('.input-error');
      expect(errorElements.length).toBe(2);
      expect(errorElements[0].textContent).toBe('First error');
      expect(errorElements[1].textContent).toBe('Second error');
    });

    it('should not throw error if parentElement is null', () => {
      expect(() => dom.showError('Error', null)).not.toThrow();
    });

    it('should append error as child of parentElement', () => {
      dom.showError('Error message', container);
      
      const errorEl = container.querySelector('.input-error');
      expect(errorEl.parentElement).toBe(container);
    });
  });

  describe('removeError', () => {
    it('should remove error element', () => {
      dom.showError('Error message', container);
      expect(container.querySelector('.input-error')).toBeTruthy();
      
      dom.removeError(container);
      expect(container.querySelector('.input-error')).toBeNull();
    });

    it('should not throw if no error exists', () => {
      expect(() => dom.removeError(container)).not.toThrow();
    });

    it('should not throw if parentElement is null', () => {
      expect(() => dom.removeError(null)).not.toThrow();
    });
  });

  describe('validateInput', () => {
    beforeEach(() => {
      container.innerHTML = `
        <form>
          <input name="username" value="ab" />
          <div class="error-target"></div>
        </form>
      `;
    });

    it('should add isInvalid class for invalid input', () => {
      const input = container.querySelector('[name="username"]');
      const target = container.querySelector('.error-target');
      
      dom.validateInput(input, 'Username too short', target);
      
      expect(input.classList.contains('isInvalid')).toBe(true);
    });

    it('should show error message for invalid input', () => {
      const input = container.querySelector('[name="username"]');
      const target = container.querySelector('.error-target');
      
      dom.validateInput(input, 'Username too short', target);
      
      const errorEl = target.querySelector('.input-error');
      expect(errorEl).toBeTruthy();
      expect(errorEl.textContent).toBe('Username too short');
    });

    it('should remove isInvalid class for valid input', () => {
      const input = container.querySelector('[name="username"]');
      input.value = 'validusername';
      input.classList.add('isInvalid');
      const target = container.querySelector('.error-target');
      
      dom.validateInput(input, 'Username too short', target);
      
      expect(input.classList.contains('isInvalid')).toBe(false);
    });

    it('should validate password confirmation with second parameter', () => {
      container.innerHTML = `
        <form>
          <input name="password" value="Pass123!" />
          <input name="confirmation" value="Pass123!" />
          <div class="error-target"></div>
        </form>
      `;
      
      const confirmInput = container.querySelector('[name="confirmation"]');
      const target = container.querySelector('.error-target');
      
      dom.validateInput(confirmInput, 'Passwords do not match', target);
      
      expect(confirmInput.classList.contains('isInvalid')).toBe(false);
    });
  });

  describe('showLoading', () => {
    it('should create and append loader', () => {
      dom.showLoading(container);
      
      const loader = container.querySelector('.loader');
      expect(loader).toBeTruthy();
    });

    it('should contain spinner element', () => {
      dom.showLoading(container);
      
      const spinner = container.querySelector('.spinner');
      expect(spinner).toBeTruthy();
    });

    it('should not create duplicate loaders', () => {
      dom.showLoading(container);
      dom.showLoading(container);
      
      const loaders = container.querySelectorAll('.loader');
      expect(loaders.length).toBe(1);
    });

    it('should not throw if targetElement is null', () => {
      expect(() => dom.showLoading(null)).not.toThrow();
    });
  });

  describe('hideLoading', () => {
    it('should remove loader element', () => {
      dom.showLoading(container);
      expect(container.querySelector('.loader')).toBeTruthy();
      
      dom.hideLoading(container);
      expect(container.querySelector('.loader')).toBeNull();
    });

    it('should not throw if no loader exists', () => {
      expect(() => dom.hideLoading(container)).not.toThrow();
    });

    it('should not throw if targetElement is null', () => {
      expect(() => dom.hideLoading(null)).not.toThrow();
    });
  });

  describe('parseHTML', () => {
    it('should parse HTML string into DOM element', () => {
      const htmlString = '<div class="test">Content</div>';
      const element = dom.parseHTML(htmlString);
      
      expect(element.tagName).toBe('DIV');
      expect(element.className).toBe('test');
      expect(element.textContent).toBe('Content');
    });

    it('should handle complex HTML structures', () => {
      const htmlString = `
        <div class="parent">
          <span class="child">Text</span>
          <button>Click</button>
        </div>
      `;
      const element = dom.parseHTML(htmlString);
      
      expect(element.querySelector('.child')).toBeTruthy();
      expect(element.querySelector('button')).toBeTruthy();
    });
  });

  describe('toggleTheme', () => {
    let button;

    beforeEach(() => {
      button = document.createElement('button');
      button.innerText = 'D';
      localStorage.clear();
    });

    it('should toggle from light to dark theme', () => {
      localStorage.setItem('theme', '');
      const event = { target: button };
      
      dom.toggleTheme(event);
      
      expect(localStorage.getItem('theme')).toBe('dark');
      expect(button.innerText).toBe('L');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should toggle from dark to light theme', () => {
      localStorage.setItem('theme', 'dark');
      const event = { target: button };
      
      dom.toggleTheme(event);
      
      expect(localStorage.getItem('theme')).toBe('');
      expect(button.innerText).toBe('D');
      expect(document.documentElement.getAttribute('data-theme')).toBe('');
    });
  });

  describe('initializeTheme', () => {
    let button;

    beforeEach(() => {
      button = document.createElement('button');
      localStorage.clear();
    });

    it('should initialize dark theme from localStorage', () => {
      localStorage.setItem('theme', 'dark');
      
      dom.initializeTheme(button);
      
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(button.innerText).toBe('L');
    });

    it('should initialize light theme when no theme stored', () => {
      dom.initializeTheme(button);
      
      expect(document.documentElement.getAttribute('data-theme')).toBe('');
      expect(button.innerText).toBe('D');
    });

    it('should work without button parameter', () => {
      localStorage.setItem('theme', 'dark');
      
      expect(() => dom.initializeTheme(null)).not.toThrow();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });
});