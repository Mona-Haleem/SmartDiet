import { validators } from "../../validators.js";
/**
 * domUtils.js
 * A collection of pure utility functions for DOM manipulation.
 * Follows SRP by separating DOM updates from component logic or data fetching.
 */

/**
 * Creates and displays an error message within a parent element.
 * @param {string} message - The error message to display.
 * @param {HTMLElement} parentElement - The element to append the error message to.
 * @param {boolean} [all=false] - If true, appends a new error instead of replacing.
 */
export function showError(message, parentElement, all = false) {
  if (!parentElement) return;
  let errorEl = parentElement.querySelector(".input-error");
  console.log(errorEl,'-----create new ');
  if (!errorEl || all) {
    errorEl = document.createElement("p");
    errorEl.className = "input-error";
    errorEl.style.color = "red"; // TODO: Move to CSS
    parentElement.appendChild(errorEl);
  }
  errorEl.textContent = message;
}

/**
 * Removes the first error message found within a parent element.
 * @param {HTMLElement} parentElement - The element to remove the error from.
 */
export function removeError(parentElement) {
  if (!parentElement) return;
  const errorEl = parentElement.querySelector(".input-error");
  if (errorEl) errorEl.remove();
}

/**
 * Fades out an element.
 * @param {HTMLElement} element - The element to fade out.
 * @param {number} [duration=300] - Animation duration in ms.
 * @returns {Promise<void>}
 */
export function fadeOut(element, duration = 300) {
  return new Promise((resolve) => {
    element.style.transition = `opacity ${duration}ms ease`;
    element.style.opacity = "0";
    setTimeout(resolve, duration);
  });
}

/**
 * Fades in an element.
 * @param {HTMLElement} element - The element to fade in.
 * @param {number} [duration=300] - Animation duration in ms.
 * @returns {Promise<void>}
 */
export function fadeIn(element, duration = 300) {
  return new Promise((resolve) => {
    element.style.transition = `opacity ${duration}ms ease`;
    element.style.opacity = "1";
    setTimeout(resolve, duration);
  });
}

/**
 * Swaps the content of a target element, with animations.
 * @param {HTMLElement} targetElement - The element to update.
 * @param {string} newContent - The new HTML string.
 * @param {boolean} [replace=false] - If true, replaces the targetElement itself.
 * @returns {Promise<HTMLElement>} The new or updated element.
 */
export async function swapContent(targetElement, newContent, replace = true) {
  await fadeOut(targetElement);

  let newNode = targetElement;

  if (replace) {
    const range = document.createRange();
    const fragment = range.createContextualFragment(newContent.trim());
    newNode = fragment.firstElementChild;
    if (!newNode) throw new Error("Invalid HTML content for replacement");

    targetElement.replaceWith(newNode);
  } else {
    targetElement.innerHTML = newContent;
  }

  await fadeIn(newNode);
  return newNode;
}

/**
 * Displays a loading spinner inside a target element.
 * @param {HTMLElement} targetElement - The element to show loading in.
 */
export function showLoading(targetElement) {
  if (!targetElement) return;
  // Prevent duplicate loaders
  if (targetElement.querySelector(".loader")) return;

  const loader = document.createElement("div");
  loader.className = "loader"; // Assumes CSS for .loader exists
  loader.innerHTML = `<div class="spinner"></div>`; // Assumes CSS for .spinner
  targetElement.appendChild(loader);
}

/**
 * Hides the loading spinner from a target element.
 * @param {HTMLElement} targetElement - The element to hide loading from.
 */
export function hideLoading(targetElement) {
  if (!targetElement) return;
  const loader = targetElement.querySelector(".loader");
  if (loader) loader.remove();
}

/**
 * Parses an HTML string into a DOM node or document fragment.
 * @param {string} htmlText - The HTML string to parse.
 * @returns {Node} The first element or text node from the parsed string.
 */
export function parseHTML(htmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, "text/html");
  return doc.body.firstChild || doc.body;
}


export function validateInput(input, msg, targetElement) {
  const validator = validators[input.name];
  let secParam;
  if (input.name == "confirmation"){
    secParam = document.querySelector('[name="password"]').value;
   }
  console.log(validator ,input.value == secParam);
  if (!validator.validate(input.value,secParam)) {
    input.classList.add("isInvalid");
    showError(msg, targetElement);
  }
}

export function toggleTheme(e) {
  console.log("theme toggle");
  const theme = localStorage.getItem("theme") === "dark" ? "" : "dark";
  e.target.innerText = theme === "dark" ? "L" : "D";
  localStorage.setItem("theme", theme);
  document.documentElement.setAttribute("data-theme", theme);
}

// Push a new URL (adds to browser history)
export function pushUrl(url, state = {}) {
  if (typeof url !== "string" || !url.trim()) return;
  const cleanUrl = new URL(`diet/${url}`, window.location.origin).toString();
  if (window.location.href !== cleanUrl) {
    window.history.pushState(state, "", cleanUrl);
  }
}

// Replace the current URL (does NOT add to history)
export function replaceUrl(url, state = {}) {
  if (typeof url !== "string" || !url.trim()) return;
  const cleanUrl = new URL(`diet/${url}`, window.location.origin).toString();
  if (window.location.href !== cleanUrl) {
    window.history.replaceState(state, "", cleanUrl);
  }
}

// Listen for browser back/forward navigation
export function onPopState(callback) {
  if (typeof callback !== "function") return;
  window.addEventListener("popstate", (event) => {
    event.preventDefault()
    console.log(this.$el)
    callback({
      state: event.state,
      url: window.location.href,
      path: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    });
  });
}
