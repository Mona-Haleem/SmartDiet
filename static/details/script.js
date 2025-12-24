import Paginator from "../scripts_module/ComponentsClasses/Paginator.js";
import Plan from "../scripts_module/ComponentsClasses/Plan.js";
import Recipe from "../scripts_module/ComponentsClasses/Recipe.js";
import { createSectionDetailsEditor } from "../scripts_module/ComponentsClasses/sectionDetailsEditor.js";

window.Paginator = Paginator;
window.Plan = Plan;
window.Recipe = Recipe;
window.createSectionDetailsEditor = createSectionDetailsEditor;
window.addEventListener("keydown", (event) => {
  if (event.target.isContentEditable) {
    const div = event.target;
    if (event.key === "Enter") {
      if (event.shiftKey) {
        event.preventDefault();
        div.execCommand("insertText", false, "\n");
      } else {
        event.preventDefault();
        div.blur();
      }
    }
  }
  if(window.paginator){
    if(event.key == "ArrowLeft" && window.paginator.data.prev)
      window.paginator.paginateTo("prev")
    if(event.key == "ArrowRight"&& window.paginator.data.next)
      window.paginator.paginateTo("next")

  }
});

window.dragEle = null;
const btn = document.querySelector("#deletbtn");

window.addEventListener("dragstart", (event) => {
  const section = event.target.closest(".section");
  const img = event.target.closest(".viewer-img");
  console.log("dragstart", section, event.target);
  if (!section || img) return;
  console.log("dragstarted");
  event.stopPropagation();

  dragEle = section || img;
  if (section) section.querySelector("i").style.display = "none";

  if (btn) btn.style.opacity = "0.8";

});

let dropPoint = null;
window.addEventListener("dragend", (event) => {
  if (!dragEle ) return;
  console.log("dragended");
  if(dragEle?.classList.contains("section")){
    dragEle.querySelector("i").style.display = "";
    clearDargEffects();
  }
  dragEle = "";
  if (btn) btn.style.opacity = "0";
});

window.addEventListener("dragover", (event) => {
  const addbtn = event.target.closest(".addBtn");
  if (!addbtn) return;
  dropPoint = addbtn;
  event.preventDefault();
  addbtn.style.opacity = "0.8";
  addbtn.style.height = "25px";
});

window.addEventListener("dragleave", clearDargEffects);

function clearDargEffects(){
if (!dropPoint) return;
  dropPoint.style.opacity = "";
  dropPoint.style.height = "";
  dropPoint = null;

}

const container = document.querySelector(".paginator-container");
let autoPaginateTimeout = null;

container.addEventListener("dragover", (event) => {
  const rect = container.getBoundingClientRect();
  const edgeThreshold = 50; // px

  // Determine direction
  let direction = null;
  if (event.clientX - rect.left < edgeThreshold) direction = "prev";
  else if (rect.right - event.clientX < edgeThreshold) direction = "next";

  // Only start Timeout if not already running in that direction
  if (direction) {
    if (!autoPaginateTimeout) {
      autoPaginateTimeout = setTimeout(() => {
        if (window.paginator && window.paginator.data[direction]) window.paginator.paginateTo(direction);
      }, 200);
    }
  } else {
    // If cursor moves away from edge, stop auto-pagination
    clearTimeout(autoPaginateTimeout);
    autoPaginateTimeout = null;
  }
});

container.addEventListener("dragleave", () => {
  clearTimeout(autoPaginateTimeout);
  autoPaginateTimeout = null;
});

container.addEventListener("drop", () => {
  clearTimeout(autoPaginateTimeout);
  autoPaginateTimeout = null;
});



function renderBlock(block) {
  if (!block || !block.type) return "";

  const tag = block.type; // "p", "ul", "ol"
  const effects = normalizeEffects(block.effect);
  const content = renderContent(block.content);

  return `<${tag} class="${effects}">${content}</${tag}>`;
}

/* Normalize effects into a space-separated class string */
function normalizeEffects(effect) {
  if (!effect || effect === "default") return "";
  return Array.isArray(effect) ? effect.join(" ") : effect;
}

/* Render either string content or an array of text fragments */
function renderContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((fragment) => {
        const fragEffects = normalizeEffects(fragment.effect);
        return `<span class="${fragEffects}">${fragment.text}</span>`;
      })
      .join("");
  }

  return "";
}
