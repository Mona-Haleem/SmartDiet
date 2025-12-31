/**
 * IngredientInput - Reusable ingredient input component
 */
export default class IngredientInput {
  constructor(data, refs,startVal) {
    this.data = data;
    this.refs = refs;
    console.log(startVal)
    if(startVal){
      this.data.ingredients = startVal
    }
    // Common cooking units
    this.units = [
      "piece",
      "pieces",
      "cup",
      "cups",
      "tbsp",
      "tablespoon",
      "tablespoons",
      "tsp",
      "teaspoon",
      "teaspoons",
      "oz",
      "ounce",
      "ounces",
      "lb",
      "pound",
      "pounds",
      "g",
      "gram",
      "grams",
      "kg",
      "kilogram",
      "kilograms",
      "ml",
      "milliliter",
      "milliliters",
      "l",
      "liter",
      "liters",
      "pinch",
      "dash",
      "slice",
      "slices",
      "clove",
      "cloves",
      "can",
      "cans",
      "package",
      "packages",
      "bunch",
      "bunches",
      "handful",
      "stick",
      "sticks",
    ];
  }

 
  addIngredient() {
    const ing = this.data.current;

    if (!ing.name?.trim()) {
      return; // Don't add empty ingredients
    }

    // Default to 1 if amount is empty or invalid
    const amount = ing.amount || 1;

    // Default to 'piece' if unit is empty or not in list
    let unit = ing.unit?.trim() || "piece";
    if (!this.units.includes(unit.toLowerCase())) {
      unit = "piece";
    }

    this.data.ingredients.push({
      amount: amount,
      unit: unit,
      name: ing.name.trim(),
    });

    // Reset current ingredient
    this.data.current = {
      amount: 1,
      unit: "",
      name: "",
    };

    // Focus back on name input
    setTimeout(() => {
      const inputRow = this.refs.ingridentInputRow;
      const ingList = this.refs.ingredientList
      if (inputRow) {
        requestAnimationFrame(() => {
          this.refs.ingridentInputRow?.scrollIntoView({
            behavior: "smooth",
          });
          if (ingList) ingList.scrollTop = ingList.scrollHeight

        });
      }

      this.refs.ingredientAmount?.focus();
    }, 0);
  }

  removeIngredient(index) {
    this.data.ingredients.splice(index, 1);
  }

  filterUnits() {
    const input = this.data.current.unit?.toLowerCase() || "";

    if (!input) {
      this.data.filteredUnits = this.units;
      return;
    }

    this.data.filteredUnits = this.units.filter((unit) =>
      unit.toLowerCase().startsWith(input)
    );
  }

  moveDown() {
    if (!this.data.filteredUnits) return;
    this.data.activeUnit =
      (this.data.activeUnit + 1) % this.data.filteredUnits.length;
    console.log(this.data.activeUnit);
  }

  moveUp() {
    if (!this.data.filteredUnits) return;
    this.data.activeUnit =
      (this.data.activeUnit - 1 + this.data.filteredUnits.length) %
      this.data.filteredUnits.length;
    console.log(this.data.activeUnit);
  }

  selectUnit(unit) {
    this.data.current.unit = unit;
    this.data.showUnitSuggestions = false;
    this.refs.ingredientName?.focus();
  }

  serialize() {
    return this.data.ingredients
      .map((ing) => `${ing.amount} ${ing.unit} ${ing.name}`)
      .join("\n");
  }

  loadFromText(text) {
    if (!text?.trim()) return;

    const lines = text.split("\n").filter((line) => line.trim());
    this.data.ingredients = [];

    lines.forEach((line) => {
      // Simple parsing: first number is amount, next word is unit, rest is name
      const match = line.match(/^([\d.]+)\s+(\S+)\s+(.+)$/);
      if (match) {
        this.data.ingredients.push({
          amount: parseFloat(match[1]),
          unit: match[2],
          name: match[3],
        });
      } else {
        // Fallback: treat entire line as ingredient name
        this.data.ingredients.push({
          amount: 1,
          unit: "piece",
          name: line.trim(),
        });
      }
    });
  }
}

// Make it globally accessible
window.IngredientInput = IngredientInput;
