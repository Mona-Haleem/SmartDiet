import Component from "../ComponentsClasses/Component.js";
// import * as actions from "../helpers.js";
// import { fetchData } from "./fetchData/fetchData.js";
// const METHODS = ["get", "post", "put", "patch", "delete"];
// const Exclude = [
//   "get",
//   "post",
//   "put",
//   "patch",
//   "delete",
//   "target",
//   "success",
//   "error",
//   "prefetch",
//   "loading",
//   "params",
//   "targetinstance",
//   "instanceid"
// ];

// //sucessful click action

// export function delegateEvents(event) {
//   document.body.addEventListener(
//     event,
//     async (e) => {
      // let target = e.target;
      // while (
      //   target &&
      //   !Array.from(target.attributes).some((attr) =>
      //     attr.name.startsWith(`data-${event}`)
      //   )
      // ) {
      //   target = target.parentElement;
      // }
      // let targetClass;
      // if (!target) return;
      // if (target.dataset.targetInstance){
      //     targetClass = target.closest(`[data-instance-id^="${target.dataset.targetInstance}"]`)
      //   }
      // const instance = Component.instances[targetClass?.dataset.instanceId || target?.dataset.instanceId] || target;
      
      // console.log(instance, instance.constructor.name);
      // //const action = target.dataset.action;
      //if(instance) instance.handleAction(action,event);

//       for (const [key, value] of Object.entries(target.dataset)) {
//       //  console.log(key, value );
//         let funKey = key.replace(new RegExp("^" + event), "");
//         if (Exclude.includes(funKey.toLowerCase())) continue;
//         let fn = instance?.[funKey] || actions[funKey];
//         //console.log("fun to excute", !!fn, funKey, "params", value);
//         if (typeof fn === "function") {
//           try {
//             // Call with event, optional value, and optional target reference
//             fn(e, value, document.querySelector(target.dataset.target));
//           } catch (err) {
//             console.error(`Error calling ${funKey} on component`, err);
//           }
//         }
//       }

//       for (const method of METHODS) {
//         if (!target.dataset[`${event}${capitalize(method)}`]) continue;
//         const url = target.dataset[`${event}${capitalize(method)}`];
//         console.log("handelers",target.dataset,instance );

//         const success = 
//           instance?.[target.dataset.success]?.bind(instance)  || window[target.dataset.success];
//         const error = 
//           instance?.[target.dataset.error]?.bind(instance)  || window[target.dataset.error];
//         const loading = 
//           instance?.[target.dataset.loading]?.bind(instance)  || window[target.dataset.loading];
//         const prefetch = 
//           instance?.[target.dataset.prefetch]?.bind(instance)  ||
//           window[target.dataset.prefetch];
//         console.log("handelers", { success, error, prefetch, loading });
//         fetchData(
//           e,
//           url,
//           method,
//           target.dataset.params,
//           target.dataset.target,
//           { success, error, prefetch, loading }
//         );
//       }
//     },
//     true
//   );
// }
// function capitalize(str) {
//   return str.replace(/\b\w/g, (char) => char.toUpperCase());
// }


/**
 * EventDelegator.js
 * Main event handling system. Listens for events on `document.body`
 * and delegates them to components or services based on data- attributes.
 * This is the "Controller" of the application.
 */

export class EventDelegator {
  /**
   * @param {QueryService} queryService - The service for data fetching.
   * @param {object} componentRegistry - The `Component.instances` map.
   * @param {object} [actionRegistry={}] - A map of simple, non-fetch actions.
   */
  constructor(queryService, componentRegistry, actionRegistry = {}) {
    this.queryService = queryService;
    this.componentRegistry = componentRegistry;
    this.actionRegistry = actionRegistry;
    // Use lowercase for easier matching with dataset keys
    this.httpMethods = ["get", "post", "put", "patch", "delete"];
    this.boundHandleEvent = this.handleEvent.bind(this);
  }

  /**
   * Attaches a global event listener for a specific event type.
   * @param {string} eventType - e.g., "click", "submit", "blur".
   */
  listen(eventType) {
    document.body.addEventListener(eventType, this.boundHandleEvent, true);
  }

  /**
   * The core event handler.
   * @param {Event} event - The DOM event.
   */
  handleEvent(event) {
    const eventType = event.type; // 'click', 'blur', etc.
    const prefix = `data-${eventType}-`;

    // 1. Find the target element with a data- attribute for this event
    let target = event.target;
    while (target && target.attributes) {
      const hasMatchingAttr = Array.from(target.attributes).some((attr) =>
        attr.name.startsWith(prefix)
      );
      if (hasMatchingAttr) {
        break; // Found the target
      }
      target = target.parentElement;
    }

    if (!target) return; // No target found

    // 2. Find the associated component instance
    const componentInstance = Component.findInstance?.(target) ||
      this.componentRegistry?.get?.(target) ||
      null;

    const dataset = target.dataset;

    let httpActionFound = false;

    // 3. Check for HTTP Actions first (e.g., data-click-get, data-submit-post)
    for (const httpMethod of this.httpMethods) {
      // e.g., key = 'clickGet' from data-click-get
      const key =
        eventType + httpMethod.charAt(0).toUpperCase() + httpMethod.slice(1);
        if (dataset[key]) {
          const url = dataset[key];
        this.handleHttpAction(target, event, componentInstance, httpMethod, url);
        httpActionFound = true;
        break; // Handle one HTTP action at a time
      }
    }

    // 4. If not an HTTP action, check for simple actions
    if (httpActionFound) return;

    for (const key in dataset) {
      if (key.startsWith(eventType)) {
        // key is e.g., 'clickToggelTheme'
        const actionNameRaw = key.substring(eventType.length); // 'ToggelTheme'
        if (!actionNameRaw) continue; // Skip if key is just the event (e.g., data-click)
        const lower = actionNameRaw.toLowerCase();
        if (this.httpMethods.includes(lower)) continue; 
         // It's a simple action
        // 'ToggelTheme' -> 'toggelTheme'
        // 'ValidateInput' -> 'validateInput'
        const actionName =
          actionNameRaw.charAt(0).toLowerCase() + actionNameRaw.slice(1);
        const payload = dataset[key];

        this.handleSimpleAction(actionName, event, payload, componentInstance);
        // We don't break, allowing multiple simple actions (like user's original)
      }
    }
  }

  /**
   * Handles non-fetch actions.
   * @param {string} actionName - The name of the action (e.g., "toggleTheme").
   * @param {Event} event - The DOM event.
   * @param {string} [payload] - Optional payload from `data-payload`.
   * @param {Component} [component] - The associated component instance.
   */
  handleHttpAction(target, event, component, httpMethod, url) {
    const dataset = target.dataset;
    const method = httpMethod.toUpperCase();
    const queryKey = dataset.queryKey || url;

    if (!url) {
      console.error("No URL provided for HTTP action", target);
      return;
    }

    // --- Wire up callbacks ---
    // These functions resolve a method name (from data- attribute)
    // to an actual function bound to the component instance.

    const resolveCallback = (name) => {
      const methodName = dataset[name];
      if (component && methodName && typeof component[methodName] === "function") {
        return component[methodName].bind(component);
      }
      return null;
    };

    const prefetch = resolveCallback("prefetch");
    const onLoading = resolveCallback("loading");
    const onSuccess = resolveCallback("success");
    const onError = resolveCallback("error");
    // --- Create Query Function ---
    // The prefetch function (e.g., validateForm) might return the body (FormData)
    // const queryFn = async () => {
    //   let body = null;
    //   if (method !== "GET" && method !== "DELETE") {
    //     // If no prefetch, default to FormData from the component's element
    //     if (event.type === "submit" && component && component.element.tagName === "FORM") {
    //        body = new FormData(component.element);
    //     }
    //   }
      
    //   // If a prefetch function exists (like validateForm), it runs *inside*
    //   // the QueryService. We pass a function that *gets* the body.
    //   // But for simplicity here, we'll assume prefetch *validates* and
    //   // *provides* the body.
    //   // *** MODIFICATION ***: We let prefetch run *first* in QueryService.
    //   // The queryFn itself will just get the data.
      
    //   let requestBody = null;
      
    //   if (event.type === "submit") {
    //     event.preventDefault(); // Stop default submission
    //     if (prefetch) {
    //        // We expect prefetch to throw on error or return the body
    //        try {
    //          requestBody = await prefetch(event);
    //        } catch(e) {
    //          // Validation failed, throw to QueryService
    //          throw e;
    //        }
    //     } else if (component && component.element.tagName === "FORM") {
    //         requestBody = new FormData(component.element);
    //     }
    //   }
      
    //   return this.queryService.createQueryFn(url, method, requestBody)();
    // };
    const queryFn = async () => {
      let requestBody = null;

      if (event.type === "submit") {
        event.preventDefault();
      }

      if (prefetch) {
        try {
          const result = await prefetch(event);
          if (result instanceof FormData || typeof result === "object") {
            requestBody = result;
          }
        } catch (e) {
          throw e;
        }
      } else if (
        (method !== "GET" && method !== "DELETE") &&
        event.type === "submit" &&
        component?.element?.tagName === "FORM"
      ) {
        requestBody = new FormData(component.element);
      }

      // Delegate to query service
      return this.queryService.createQueryFn(url, method, requestBody)();
    };


    // --- Execute Query ---
    this.queryService.query(queryKey, {
      queryFn: queryFn, // Use the more complex queryFn
      prefetch: prefetch && event.type !== 'submit' ? prefetch : null, // Prefetch runs inside queryFn for submit
      onLoading: onLoading,
      onSuccess: onSuccess,
      onError: onError,
      force: dataset.force === "true",
      ttl: dataset.ttl ? parseInt(dataset.ttl, 10) : undefined,
    });
  }

  /**
   * Handles non-fetch (simple) actions.
   */
  handleSimpleAction(actionName, event, payload, component) {
    // 1. Check component instance for method
    console.log(actionName)
    if (component && typeof component[actionName] === "function") {
      component[actionName](event, payload);
      return;
    }

    // 2. Check global action registry
    if (typeof this.actionRegistry[actionName] === "function") {
      this.actionRegistry[actionName](event, payload, component);
      return;
    }

    console.warn(`Action "${actionName}" not found on component or registry.`);
  }


}

