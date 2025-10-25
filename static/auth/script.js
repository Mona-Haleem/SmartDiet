import {
  isValidEmail,
  isValidPassword,
  isPasswordMatching,
  validators,
} from "../scripts_module/validators.js";

import { attachValidation } from "../scripts_module/helpers.js";
export function validateLoginForm(form) {
  let valid = true;

  const loginInput = form.querySelector('input[name="login"]');
  const passwordInput = form.querySelector('input[name="password"]');

  // Username
  if (!loginInput.value) {
    showError("please enter your email or username ", loginInput.parentElement);
    valid = false;
  }

  // Password
  if (!passwordInput.value) {
    showError("please enter your password", passwordInput.parentElement);
    valid = false;
  }

  return valid;
}

export function validateRegisterForm(form) {
  let valid = true;

  const emailInput = form.querySelector('input[name="email"]');
  const passwordInput = form.querySelector('input[name="password"]');
  const confirmPasswordInput = form.querySelector(
    'input[name="confirm_password"]'
  );

  // Email
  if (!isValidEmail(emailInput.value)) {
    showError("Enter a valid email", emailInput.parentElement);
    valid = false;
  }

  // Password
  if (!isValidPassword(passwordInput.value)) {
    showError(
      "Password must be at least 8 chars, include upper, lower & symbol",
      passwordInput.parentElement
    );
    valid = false;
  }

  // Confirm password
  if (!isPasswordMatching(passwordInput.value, confirmPasswordInput.value)) {
    showError("Passwords do not match", confirmPasswordInput.parentElement);
    valid = false;
  }

  return valid;
}

function initFormValidation(root = document) {
  const form = root.querySelector("form");
  if (!form) return;

  form.querySelectorAll("input[name]").forEach((input) => {
    const validator = validators[input.name];
    if (validator)
      attachValidation(input, validator.validate, validator.errorMsg);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let valid;
    if (form.name === "login") valid = validateLoginForm(form);
    else valid = validateRegisterForm(form);
   // if (valid) form.submit();
  });
}

document.addEventListener("DOMContentLoaded", () => initFormValidation());

document.body.addEventListener("htmx:afterSwap", (e) => {
  initFormValidation(e.target);
});

document.addEventListener("alpine:init", () => {
  document.addEventListener("alpine:initialized", () => initFormValidation());
});

document.addEventListener("alpine:refresh", () => initFormValidation());
