import Paginator from "../scripts_module/ComponentsClasses/Paginator.js";
import CardList from "../scripts_module/ComponentsClasses/CardList.js";
import NavigationManager from "../scripts_module/helpers/utils/NavigationManager.js";
import CreationForm from "../scripts_module/ComponentsClasses/creationForm.js";
import IngredientInput from "../scripts_module/ComponentsClasses/ingredientsInput.js"
window.CreationForm = CreationForm;
window.IngredientInput = IngredientInput
window.Paginator = Paginator;
window.CardList = CardList;
let isUpdating;
function updateFilters(data) {
  if (isUpdating) clearTimeout(isUpdating);
  isUpdating = setTimeout(() => {
      const { searchInput, order, filters, type, favFilter, shareFilter } =
        data;
      const url = new URL(window.location.href);
      addOnlyOnValue(url,order,"order")
      addOnlyOnValue(url,filters?.join(","),"categories")
      addOnlyOnValue(url,type,"type")
      addOnlyOnValue(url,searchInput,"q")
      addOnlyOnValue(url, favFilter, "favorite");
      addOnlyOnValue(url, shareFilter, "shared");
      url.searchParams.set("page", "1");

      NavigationManager.pushUrl(
        url.pathname.replace("/diet/", "") + url.search
      );

      console.log(data);
      window.cardList?.onPaginate();
    }, 100);
}

function addOnlyOnValue(url, value, key) {
  if (value) {
    url.searchParams.set(key, value);
  } else {
    url.searchParams.delete(key);
  }
}
function setParams(dataObj) {
  const url = new URL(window.location.href);
  const filters = url.searchParams.get("categories");
  const order = url.searchParams.get("order");
  const q = url.searchParams.get("q");
  const type = url.searchParams.get("type");
  const fav = url.searchParams.get("favorite");
  const shared = url.searchParams.get("shared");
  dataObj.searchInput = q || "";
  dataObj.type = type || "";
  dataObj.order = order || "-edited";
  dataObj.filters = filters?.split(",") || [];
  dataObj.openFilters = false;
  dataObj.favFilter = fav;
  dataObj.shareFilter = shared;
}
window.updateFilters = updateFilters;
window.setParams = setParams;
