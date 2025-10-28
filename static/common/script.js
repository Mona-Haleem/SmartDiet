/**
 * main.js
 * The main entry point for the application.
 * Initializes services, components, and the event delegator.
 * This is where all dependencies are injected (Dependency Injection).
 */
import QueryCache from "../scripts_module/helpers/fetchData/QueryCache.js"
import { ApiService } from "../scripts_module/helpers/fetchData/ApiService.js";
import { QueryService } from "../scripts_module/helpers/fetchData/QueryService.js";
import { EventDelegator } from "../scripts_module/helpers/eventDelegations.js";
import Component from "../scripts_module/ComponentsClasses/Component.js";
import AuthForm from "../scripts_module/ComponentsClasses/AuthForm.js";
import {  initializeTheme } from "../scripts_module/theme.js";
import * as dom from "../scripts_module/helpers/utils/DomUtils.js";
 

// 1. Initialize Services
  const cache = new QueryCache({ defaultTTL: 5 * 60 * 1000 }); // 5 min TTL
  const apiService = new ApiService();
  export const queryService = new QueryService(apiService, cache);

document.addEventListener("DOMContentLoaded", () => {
  

  // 2. Define Simple (non-fetch) Actions
  const simpleActions = {
    // Matches 'data-click-toggel-theme' from your template
    toggleTheme: dom.toggleTheme,
  };

  // 3. Initialize Event Delegator
  // We pass it the services and the *live* component registry
  const delegator = new EventDelegator(
    queryService,
    Component.instances,
    simpleActions
  );

  // 4. Start Listeners
  delegator.listen("click");
 // delegator.listen("submit");
 // delegator.listen("blur");
 // delegator.listen("focus");

  // 5. Initialize Components
  // Find all components on the page and instantiate them
  const authFormElement = document.getElementById("auth_form");
  if (authFormElement) {
    new AuthForm(authFormElement);
  }
  // ... you could add more component initializers here
  // e.g., document.querySelectorAll('[data-component="profile-editor"]')
  //          .forEach(el => new ProfileEditor(el));

  // 6. Run initial setup
  initializeTheme();
});

// Handle Alpine.js re-initialization after htmx swaps (if needed)
document.body.addEventListener("htmx:afterSwap", () => {
  if (window.Alpine) {
    window.Alpine.flushAndStopDeferringMutations();
    window.Alpine.start();
  }
});



document.body.addEventListener("htmx:afterSwap", () => {
  if (window.Alpine) Alpine.flushAndStopDeferringMutations();
});
document.body.addEventListener("htmx:afterSettle", () => {
  if (window.Alpine) Alpine.start();
});
