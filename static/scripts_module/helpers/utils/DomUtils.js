import { validators } from "./validators.js";

export function showError(message, parentElement, all = false) {
  if (!parentElement) return;
  let errorEl = parentElement.querySelector(".input-error");
  console.log(errorEl,'-----create new ');
  if (!errorEl || all) {
    errorEl = document.createElement("p");
    errorEl.className = "input-error";
    parentElement.appendChild(errorEl);
  }
  errorEl.textContent = message;
}

export function removeError(parentElement) {
  if (!parentElement) return;
  const errorEl = parentElement.querySelector(".input-error");
  if (errorEl) errorEl.remove();
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
  }else{
    input.classList.remove("isInvalid");
  }
}

// export function fadeOut(element, duration = 300) {
//   return new Promise((resolve) => {
//     element.style.transition = `opacity ${duration}ms ease`;
//     element.style.opacity = "0";
//     setTimeout(resolve, duration);
//   });
// }

// export function fadeIn(element, duration = 300) {
//   return new Promise((resolve) => {
//     element.style.transition = `opacity ${duration}ms ease`;
//     element.style.opacity = "1";
//     setTimeout(resolve, duration);
//   });
// }

// export async function swapContent(targetElement, newContent, replace = true) {
//   await fadeOut(targetElement);

//   let newNode = targetElement;

//   if (replace) {
//     const range = document.createRange();
//     const fragment = range.createContextualFragment(newContent.trim());
//     newNode = fragment.firstElementChild;
//     if (!newNode) throw new Error("Invalid HTML content for replacement");

//     targetElement.replaceWith(newNode);
//   } else {
//     targetElement.innerHTML = newContent;
//   }

//   await fadeIn(newNode);
//   return newNode;
// }

export function showLoading(targetElement) {
  if (!targetElement) return;
  // Prevent duplicate loaders
  if (targetElement.querySelector(".loader")) return;

  const loader = document.createElement("div");
  loader.className = "loader"; // Assumes CSS for .loader exists
  loader.innerHTML = `<div class="spinner"></div>`; // Assumes CSS for .spinner
  targetElement.appendChild(loader);
}

export function hideLoading(targetElement) {
  if (!targetElement) return;
  const loader = targetElement.querySelector(".loader");
  if (loader) loader.remove();
}

export function parseHTML(htmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, "text/html");
  return doc.body.firstChild || doc.body;
}


export function toggleTheme(e) {
  console.log("theme toggle");
  const theme = localStorage.getItem("theme") === "dark" ? "" : "dark";
  e.target.innerText = theme === "dark" ? "L" : "D";
  localStorage.setItem("theme", theme);
  document.documentElement.setAttribute("data-theme", theme);
}

export function initializeTheme(btn) {
  const theme = localStorage.getItem("theme") || "";
  document.documentElement.setAttribute("data-theme", theme);
  if (btn) {
    btn.innerText = theme === "dark" ? "L" : "D";
  }
}
