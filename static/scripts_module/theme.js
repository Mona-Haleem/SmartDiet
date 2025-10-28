/**
 * theme.js
 * Manages the light/dark theme state.
 */

const themeToggleBtn = document.getElementById("theme-toggle");

/**
 * Toggles the theme between 'light' and 'dark' and saves to localStorage.
 * Renamed to 'toggelTheme' to match your template 'data-click-toggel-theme'.
 */
export function toggelTheme() {
  const currentTheme =
    document.documentElement.getAttribute("data-theme") === "dark" ? "" : "dark";
  localStorage.setItem("theme", currentTheme);
  document.documentElement.setAttribute("data-theme", currentTheme);
  if (themeToggleBtn) {
    themeToggleBtn.innerText = currentTheme === "dark" ? "L" : "D";
  }
}

/**
 * Initializes the theme from localStorage on page load.
 */
export function initializeTheme() {
  const theme = localStorage.getItem("theme") || "";
  document.documentElement.setAttribute("data-theme", theme);
  if (themeToggleBtn) {
    themeToggleBtn.innerText = theme === "dark" ? "L" : "D";
  }
}

