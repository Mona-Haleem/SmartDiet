"""
Context processor to provide recipe categories to all templates
Add this to settings.py TEMPLATES context_processors
"""
import json
from healthHub.models.base import UserCreation

def creation_categories(request):
    """
    Provide recipe category suggestions based on user's existing recipes
    """
    recipe_categories = [
        'Breakfast', 'Lunch', 'Dinner', 'Snack', 
        'Dessert', 'Beverage', 'Appetizer', 'Side Dish'
    ]
    
    # If user is authenticated, add their custom categories
    if request.user.is_authenticated:
        user_categories = (
            UserCreation.objects
            .filter(creator=request.user, type='recipe')
            .exclude(category='')
            .values_list('category', flat=True)
            .distinct()
        )
        
        # Merge with defaults, keeping order
        for cat in user_categories:
            if cat and cat not in recipe_categories:
                recipe_categories.append(cat)
    
    return {
        'recipe_categories': json.dumps(recipe_categories),
        'alpine_loaded': False,  # Set to True if Alpine is already loaded globally
        'show_trigger_button': False,  # Set to True to show example buttons
    }