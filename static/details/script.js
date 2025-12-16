import Paginator from "../scripts_module/ComponentsClasses/Paginator.js";
import Plan from "../scripts_module/ComponentsClasses/Plan.js";
import Recipe from "../scripts_module/ComponentsClasses/Recipe.js";

window.Paginator = Paginator;
window.Plan = Plan;
window.Recipe = Recipe;

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
});

window.dragEle = null;
const container = document.querySelector("#details");
if (container) {
  window.addEventListener("dragstart", (event) => {
    const section = event.target.closest(".section");
    console.log("dragstart", section, event.target);
    if (!section) return;
    console.log("dragstarted");
    event.stopPropagation();

    dragEle = section;
    section.querySelector("i").style.display = "none";

    const btn = document.querySelector("#deletbtn");
    if (btn) btn.style.opacity = "0.8";

    section.querySelector("input")?.blur();
  });

  window.addEventListener("dragend", (event) => {
    const section = event.target.closest(".section");
    if (!section) return;
    console.log("dragended");
    dragEle = "";
    section.querySelector("i").style.display = "";

    const btn = document.querySelector("#deletbtn");
    if (btn) btn.style.opacity = "0";

  });

  window.addEventListener("dragover", (event) => {
    const addbtn = event.target.closest(".addBtn");
    if (!addbtn) return;

    event.preventDefault();
    addbtn.style.opacity = "0.8";
    addbtn.style.height = "25px";
  });

  window.addEventListener("dragleave", (event) => {
    const addbtn = event.target.closest(".addBtn");
    if (!addbtn) return;

    addbtn.style.opacity = "";
    addbtn.style.height = "";
  });
}

const btn = document.querySelector("#deletbtn");

  window.addEventListener("dragstart", (event) => {
    dragEle = event.target.closest(".viewer-img");
    console.log("dragstart");
    if (!dragEle) return;
    console.log("dragstarted");
    event.stopPropagation();
    btn.style.opacity = "0.8";

  });

  window.addEventListener("dragend", (event) => {
     btn.style.opacity = "0";
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
