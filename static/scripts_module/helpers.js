import { validators } from "./validators.js";



//to do
//make a generic function that works with form validation 


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
