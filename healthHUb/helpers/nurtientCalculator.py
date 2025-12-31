import requests
from typing import List, Dict
import logging
from django.conf import settings


logger = logging.getLogger(__name__)

NUTRIENT_MAPPING = {
       # ─── Energy & Macronutrients ─────────────────────────────
    '208': {'key': 'calories', 'unit': 'KCAL'},        # Energy
    '203': {'key': 'protein', 'unit': 'G'},            # Protein
    '204': {'key': 'fat', 'unit': 'G'},                # Total lipid (fat)
    '205': {'key': 'carbs', 'unit': 'G'},              # Carbohydrates
    '291': {'key': 'fiber', 'unit': 'G'},              # Dietary fiber
    '269': {'key': 'sugar', 'unit': 'G'},              # Total sugars
    '255': {'key': 'water', 'unit': 'G'},              # Water

    # ─── Fat Quality ─────────────────────────────────────────
    '606': {'key': 'sat_fat', 'unit': 'G'},            # Saturated fat
    '645': {'key': 'mono_fat', 'unit': 'G'},           # Monounsaturated fat
    '646': {'key': 'poly_fat', 'unit': 'G'},           # Polyunsaturated fat
    '601': {'key': 'cholesterol', 'unit': 'MG'},       # Cholesterol

    # ─── Minerals (Electrolytes & Bone Health) ───────────────
    '301': {'key': 'calcium', 'unit': 'MG'},           # Calcium
    '303': {'key': 'iron', 'unit': 'MG'},              # Iron
    '304': {'key': 'magnesium', 'unit': 'MG'},         # Magnesium
    '306': {'key': 'potassium', 'unit': 'MG'},         # Potassium
    '307': {'key': 'sodium', 'unit': 'MG'},            # Sodium
    '309': {'key': 'zinc', 'unit': 'MG'},              # Zinc
    '317': {'key': 'selenium', 'unit': 'UG'},          # Selenium
    '312': {'key': 'copper', 'unit': 'MG'},            # Copper
    '315': {'key': 'manganese', 'unit': 'MG'},         # Manganese
    '305': {'key': 'phosphorus', 'unit': 'MG'},        # Phosphorus

    # ─── Vitamins ────────────────────────────────────────────
    '320': {'key': 'vitamin_a', 'unit': 'UG'},         # Vitamin A (RAE)
    '401': {'key': 'vitamin_c', 'unit': 'MG'},         # Vitamin C
    '328': {'key': 'vitamin_d', 'unit': 'UG'},         # Vitamin D
    '323': {'key': 'vitamin_e', 'unit': 'MG'},         # Vitamin E
    '430': {'key': 'vitamin_k', 'unit': 'UG'},         # Vitamin K
    '404': {'key': 'vitamin_b1', 'unit': 'MG'},        # Thiamin
    '405': {'key': 'vitamin_b2', 'unit': 'MG'},        # Riboflavin
    '406': {'key': 'vitamin_b3', 'unit': 'MG'},        # Niacin
    '410': {'key': 'vitamin_b5', 'unit': 'MG'},        # Pantothenic acid
    '415': {'key': 'vitamin_b6', 'unit': 'MG'},        # Vitamin B6
    '418': {'key': 'vitamin_b12', 'unit': 'UG'},       # Vitamin B12
    # '435': {'key': 'folate', 'unit': 'UG'},            # Folate (DFE)

    # ─── Performance / Metabolism ────────────────────────────
    # '421': {'key': 'choline', 'unit': 'MG'},           # Choline
    # '454': {'key': 'betaine', 'unit': 'MG'},           # Betaine

    # ─── Omega-3s (Advanced / Athlete) ───────────────────────
    # '629': {'key': 'epa', 'unit': 'G'},                # EPA
    # '621': {'key': 'dha', 'unit': 'G'},                # DHA
    # '631': {'key': 'dpa', 'unit': 'G'},                # DPA
}


def extract_nutrients(nutrients, amount_in_grams):
    """
    Generic nutrient extraction from USDA API response.
    
    Args:
        nutrients: List of nutrient dicts from USDA API
        amount_in_grams: Amount of ingredient in grams
    
    Returns:
        Dict with extracted nutrition values
    """
    multiplier = amount_in_grams / 100  # USDA values are per 100g
    
    # Initialize with zeros
    extracted = {mapping['key']: 0 for mapping in NUTRIENT_MAPPING.values()}
    
    # Extract nutrients
    for nutrient in nutrients:
        nutrient_number = nutrient.get('nutrientNumber', '')
        
        # Check if this is a nutrient we care about
        if nutrient_number in NUTRIENT_MAPPING:
            mapping = NUTRIENT_MAPPING[nutrient_number]
            unit_name = nutrient.get('unitName', '').upper()
            
            # Verify unit matches (safety check)
            if unit_name == mapping['unit']:
                value = nutrient.get('value', 0)
                extracted[mapping['key']] = round(value * multiplier, 2)
    
    return extracted


def get_nutrition_info_usda(ingredients: List[Dict[str, str]]) -> Dict:
    """Get nutritional information using USDA FoodData Central API."""
    
    print("\n" + "="*60)
    print("STARTING USDA NUTRITION CALCULATION")
    print("="*60)
    
    # Get API key from settings
    api_key = getattr(settings, 'USDA_API_KEY', None)
    
    print(f"\n[STEP 1] Checking USDA API credentials...")
    if not api_key:
        error_msg = "USDA API key not found in settings"
        print(f"❌ ERROR: {error_msg}")
        return {'error': error_msg, 'success': False}
    
    print(f"✓ API key found: {api_key[:10]}...")
    print(f"\n[STEP 2] Received {len(ingredients)} ingredients to process")
    
    # Initialize totals
    total_nutrition = {
        'calories':0,
        'protein':0,
        'fat':0,
        'carbs':0,
        'fiber':0,
        'sugar':0,
        'water':0,
        'sat_fat':0,
        'mono_fat':0,
        'poly_fat':0,
        'cholesterol':0,
        'calcium':0,
        'iron':0,
        'magnesium':0,
        'potassium':0,
        'sodium':0,
        'zinc':0,
        'selenium':0,
        'copper':0,
        'manganese':0,
        'phosphorus':0,
        'vitamin_a':0,
        'vitamin_c':0,
        'vitamin_d':0,
        'vitamin_e':0,
        'vitamin_k':0,
        'vitamin_b1':0,
        'vitamin_b2':0,
        'vitamin_b3':0,
        'vitamin_b5':0,
        'vitamin_b6':0,
        'vitamin_b12':0,
        }
    
    base_url = "https://api.nal.usda.gov/fdc/v1/foods/search"
    
    # Process each ingredient separately
    for idx, ingredient in enumerate(ingredients):
        ingredient_name = ingredient['name']
        amount = float(ingredient['amount'])
        unit = ingredient['unit'].lower()
        print(f"\n[STEP {idx+3}] Processing '{ingredient_name}'...")
        
        try:
            # Make individual API request for each ingredient
            params = {
                'api_key': api_key,
                'query': ingredient_name,  # Simple query, no OR operator
                'pageSize': 5,  # Get top 5 results
                'dataType': 'Foundation,SR Legacy'
            }
            
            print(f"  → Searching USDA database...")
            response = requests.get(base_url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            foods = data.get('foods', [])
            
            if not foods:
                # print(f"  ❌ No results found for '{ingredient_name}'")
                # total_nutrition['ingredients_detail'].append({
                #     'name': ingredient_name,
                #     'amount': amount,
                #     'unit': unit,
                #     'error': 'Not found in USDA database'
                # })
                continue
            
            # Use the first (best) match
            best_match = foods[0]
            food_description = best_match.get('description', 'Unknown')
            print(f"  ✓ Matched: {food_description}")
            amount_in_grams = convert_ingredient_to_grams(ingredient)
            multiplier = amount_in_grams / 100
            print(f"  → Calculating for {amount_in_grams}g (x{multiplier:.2f})")
            
            # Get nutrients
            nutrients = best_match.get('foodNutrients', [])
            nutrition = extract_nutrients(nutrients, amount_in_grams)

            ingredient_nutrition = {
                'name': ingredient_name,
                'matched_food': food_description,
                'amount': round(amount,2),
                'unit': unit,
                'fdc_id': best_match.get('fdcId'),
                **nutrition
            }
            for nutrient, value in nutrition.items():
                total_nutrition[nutrient] = round(total_nutrition[nutrient] + value, 2)

            print(ingredient_nutrition)
            print(f"  ✓ {ingredient_nutrition['calories']}cal, {ingredient_nutrition['protein']}g protein")
            # total_nutrition['ingredients_detail'].append(ingredient_nutrition)
            
        except requests.exceptions.RequestException as e:
            print(f"  ❌ API error for '{ingredient_name}': {str(e)}")
            # total_nutrition['ingredients_detail'].append({
            #     'name': ingredient_name,
            #     'amount': round(amount,2),
            #     'unit': unit,
            #     'error': f'API error: {str(e)}'
            # })
            continue
    
   
    
    print(f"\n{'='*60}")
    print("TOTAL NUTRITION SUMMARY")
    print('='*60)
    print(f"Calories:      {total_nutrition['calories']} kcal")
    print(f"Protein:       {total_nutrition['protein']} g")
    print(f"Carbs:         {total_nutrition['carbs']} g")
    print(f"Fat:           {total_nutrition['fat']} g")
    print('='*60 + "\n")
    
    return total_nutrition

"""
Comprehensive unit conversion for USDA nutrition calculations.
Many units require ingredient-specific conversions.
"""

# Standard weight conversions (reliable)
WEIGHT_CONVERSIONS = {
    'g': 1,
    'gram': 1,
    'grams': 1,
    'kg': 1000,
    'kilogram': 1000,
    'kilograms': 1000,
    'oz': 28.35,
    'ounce': 28.35,
    'ounces': 28.35,
    'lb': 453.592,
    'pound': 453.592,
    'pounds': 453.592,
}

# Volume conversions (approximate - density varies by ingredient)
VOLUME_CONVERSIONS = {
    'ml': 1,  # Assume water density (1g/ml) as baseline
    'milliliter': 1,
    'milliliters': 1,
    'l': 1000,
    'liter': 1000,
    'liters': 1000,
    'cup': 240,  # US cup
    'cups': 240,
    'tbsp': 15,
    'tablespoon': 15,
    'tablespoons': 15,
    'tsp': 5,
    'teaspoon': 5,
    'teaspoons': 5,
}

# Ingredient-specific volume-to-weight conversions (grams per cup)
INGREDIENT_DENSITIES = {
    # Flours and grains
    'flour': 120,
    'all-purpose flour': 120,
    'wheat flour': 120,
    'rice': 185,
    'pasta': 100,
    'spaghetti': 100,
    'oats': 80,
    
    # Sugars
    'sugar': 200,
    'granulated sugar': 200,
    'brown sugar': 220,
    'powdered sugar': 120,
    
    # Liquids (already handled by volume = weight assumption)
    'water': 240,
    'milk': 245,
    'oil': 220,
    'olive oil': 216,
    'vegetable oil': 220,
    
    # Produce (highly variable - these are estimates)
    'spinach': 30,  # Raw, loosely packed
    'lettuce': 40,
    'tomato': 180,
    'onion': 160,
    'carrot': 128,
    'potato': 150,
    
    # Proteins
    'chicken': 140,
    'beef': 150,
    'ground beef': 225,
    'pork': 140,
    
    # Dairy
    'cheese': 113,
    'butter': 227,
    'yogurt': 245,
    
    # Nuts
    'almonds': 143,
    'walnuts': 120,
    'peanuts': 146,
}

# Imprecise units that need ingredient context
IMPRECISE_CONVERSIONS = {
    'piece': 'varies',  # Need to know: apple? cookie? chicken breast?
    'pieces': 'varies',
    'slice': 'varies',
    'slices': 'varies',
    'clove': 'varies',  # Garlic clove ~3g
    'cloves': 'varies',
    'pinch': 0.5,  # Approximate
    'dash': 0.6,   # Approximate
    'can': 'varies',  # Need to know can size
    'cans': 'varies',
    'package': 'varies',
    'packages': 'varies',
    'bunch': 'varies',
    'bunches': 'varies',
    'handful': 'varies',  # Very imprecise
    'stick': 'varies',  # Butter stick = 113g, but celery stick?
    'sticks': 'varies',
}

# Common specific conversions
SPECIFIC_CONVERSIONS = {
    ('garlic', 'clove'): 3,
    ('garlic', 'cloves'): 3,
    ('butter', 'stick'): 113,
    ('butter', 'sticks'): 113,
    ('onion', 'piece'): 150,
    ('onion', 'pieces'): 150,
    ('apple', 'piece'): 182,
    ('apple', 'pieces'): 182,
    ('banana', 'piece'): 118,
    ('banana', 'pieces'): 118,
    ('egg', 'piece'): 50,
    ('egg', 'pieces'): 50,
    ('tomato', 'slice'): 20,
    ('tomato', 'slices'): 20,
    ('bread', 'slice'): 30,
    ('bread', 'slices'): 30,
    ('cheese', 'slice'): 28,
    ('cheese', 'slices'): 28,
}


def convert_to_grams(amount: float, unit: str, ingredient_name: str) -> tuple[float, str]:
    """
    Convert any unit to grams.
    
    Args:
        amount: Numeric amount
        unit: Unit of measurement
        ingredient_name: Name of ingredient (for context-specific conversions)
    
    Returns:
        tuple: (grams, warning_message or None)
    """
    unit = unit.lower().strip()
    ingredient_name = ingredient_name.lower().strip()
    
    # 1. Direct weight conversions (most reliable)
    if unit in WEIGHT_CONVERSIONS:
        return amount * WEIGHT_CONVERSIONS[unit], None
    
    # 2. Check for specific ingredient + unit combinations
    for key_words in ingredient_name.split():
        lookup_key = (key_words, unit)
        if lookup_key in SPECIFIC_CONVERSIONS:
            return amount * SPECIFIC_CONVERSIONS[lookup_key], None
    
    # 3. Volume conversions with ingredient-specific density
    if unit in VOLUME_CONVERSIONS:
        base_ml = amount * VOLUME_CONVERSIONS[unit]
        
        # Try to find ingredient-specific density
        for key, density_per_cup in INGREDIENT_DENSITIES.items():
            if key in ingredient_name:
                # Convert ml to grams using specific density
                grams = base_ml * (density_per_cup / 240)  # 240ml per cup
                return grams, f"Using approximate density for {key}"
        
        # Default: assume water density (1 g/ml)
        return base_ml, "Using water density (1g/ml) - may be inaccurate"
    
    # 4. Imprecise units
    if unit in IMPRECISE_CONVERSIONS:
        conversion = IMPRECISE_CONVERSIONS[unit]
        if conversion == 'varies':
            # Try some common defaults
            if unit in ['piece', 'pieces']:
                return amount * 100, f"⚠️ WARNING: '{unit}' is imprecise, assuming 100g per piece"
            elif unit in ['slice', 'slices']:
                return amount * 25, f"⚠️ WARNING: '{unit}' is imprecise, assuming 25g per slice"
            elif unit in ['clove', 'cloves']:
                return amount * 3, f"⚠️ WARNING: Assuming garlic clove (~3g)"
            elif unit in ['can', 'cans']:
                return amount * 400, f"⚠️ WARNING: Assuming standard 400g can"
            elif unit in ['stick', 'sticks']:
                return amount * 113, f"⚠️ WARNING: Assuming butter stick (113g)"
            elif unit in ['bunch', 'bunches']:
                return amount * 100, f"⚠️ WARNING: '{unit}' is very imprecise, assuming 100g"
            elif unit in ['handful']:
                return amount * 50, f"⚠️ WARNING: '{unit}' is very imprecise, assuming 50g"
            elif unit in ['package', 'packages']:
                return amount * 250, f"⚠️ WARNING: Assuming 250g package"
            else:
                return amount * 100, f"⚠️ WARNING: Unknown unit '{unit}', assuming 100g"
        else:
            return amount * conversion, None
    
    # 5. Unknown unit - make best guess
    return amount, f"⚠️ WARNING: Unknown unit '{unit}', treating as grams"


def format_unit_warning(warnings: list[str]) -> str:
    """Format multiple warnings into user-friendly message."""
    if not warnings:
        return ""
    
    unique_warnings = list(set(warnings))
    if len(unique_warnings) == 1:
        return f"\n⚠️  {unique_warnings[0]}"
    
    return "\n⚠️  Note: Some conversions are approximate:\n   - " + "\n   - ".join(unique_warnings)


# Example usage in your function:
def convert_ingredient_to_grams(ingredient):
    """Example integration."""
    amount = float(ingredient['amount'])
    unit = ingredient['unit']
    name = ingredient['name']
    
    grams, warning = convert_to_grams(amount, unit, name)
    
    if warning:
        print(f"    {warning}")
    
    return grams




    
