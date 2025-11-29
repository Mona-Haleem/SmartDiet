import Paginator from "../scripts_module/ComponentsClasses/Paginator.js";
import Plan from "../scripts_module/ComponentsClasses/Plan.js"; 
import Recipe from "../scripts_module/ComponentsClasses/Recipe.js";

window.Paginator = Paginator;
window.Plan = Plan;
window.Recipe = Recipe;








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
            .map(fragment => {
                const fragEffects = normalizeEffects(fragment.effect);
                return `<span class="${fragEffects}">${fragment.text}</span>`;
            })
            .join("");
    }

    return "";
}