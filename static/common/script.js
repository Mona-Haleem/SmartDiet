import { toggel_theme } from "../scripts_module/helpers.js";
document.addEventListener("DOMContentLoaded", () => {   
//    const csrfTokenInput = document.querySelector("#csrf_token,[name=csrfmiddlewaretoken]");
//   if (csrfTokenInput) csrfToken = csrfTokenInput.value;
//   else console.log("no token found");
//   // resize and position a div to avoid to much nesting
//   set_main_dim();
  
// togel theme
  const toggleButton = document.getElementById("theme-toggle");
  toggleButton.addEventListener("click", function () {
    toggel_theme(toggleButton);
  });

  const theme = localStorage.getItem("theme");
  document.documentElement.setAttribute("data-theme", theme);
  toggleButton.innerText = theme === "dark" ? "L" : "D";

//   // active nav
//   set_active_item();
//   console.log(active);

//   // responsive nav icons
//   handleResize();

//   //set the current page onload
//   set_page();
});


document.body.addEventListener("htmx:afterSwap", () => {
  if (window.Alpine) Alpine.flushAndStopDeferringMutations();
});
document.body.addEventListener("htmx:afterSettle", () => {
  if (window.Alpine) Alpine.start();
});
