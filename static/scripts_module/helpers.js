export function toggel_theme(btn) {
  const theme = localStorage.getItem("theme") === "dark" ? "" : "dark";
  btn.innerText = theme === "dark" ? "L" : "D";
  localStorage.setItem("theme", theme);
  document.documentElement.setAttribute("data-theme", theme);
}

export function showError(msg, parentEle) {
  let errorEl = parentEle.querySelector(".input-error");
  if (!errorEl) {
    errorEl = document.createElement("p");
    errorEl.classList.add("input-error");
    errorEl.style.color = "red";
    parentEle.appendChild(errorEl);
  }
  errorEl.textContent = msg;
}

export function removeError(parentEle) {
  const errorEl = parentEle.querySelector(".input-error"); //.invalid-feedback
  if (errorEl) errorEl.remove();
}

export function attachValidation(input, validateFn, errorMsg) {
  input.addEventListener("blur", () => {
    if (!validateFn(input.value)) {
      input.classList.add("isInvalid");
      showError(errorMsg, input.parentElement);
    }
  });

  input.addEventListener("focus", () => {
    input.classList.remove("isInvalid");
    removeError(input.parentElement);
  });
}
