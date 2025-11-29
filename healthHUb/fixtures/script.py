"""
Django management command to populate the database with recipe and plan data.

Usage:
    python manage.py shell < populate_db.py

Or interactively in Django shell:
    python manage.py shell
    >>> exec(open('populate_db.py').read())
"""

import json
from datetime import timedelta
from users.models import User
from healthHub.models.base import UserCreation
from healthHub.models.recipe import Recipe
from healthHub.models.plan import Plan, PlanDetail


def parse_duration(duration_str):
    """Convert duration string like '30 00:00:00' to timedelta object"""
    if not duration_str:
        return timedelta(days=0)
    
    parts = duration_str.split()
    if len(parts) == 2:
        days = int(parts[0])
        time_part = parts[1]
        hours, minutes, seconds = map(int, time_part.split(':'))
        return timedelta(days=days, hours=hours, minutes=minutes, seconds=seconds)
    else:
        # Format: HH:MM:SS
        hours, minutes, seconds = map(int, duration_str.split(':'))
        return timedelta(hours=hours, minutes=minutes, seconds=seconds)


def create_plan_details(plan, details_data, parent=None):
    """Recursively create plan details with subsections"""
    for detail_item in details_data:
        # Create the main section
        plan_detail = PlanDetail.objects.create(
            plan=plan,
            parent_section=parent,
            section=detail_item['section'],
            detail=detail_item.get('detail', ''),
            order=detail_item.get('order', 1)
        )
        plan_detail.save()
        # Recursively create subsections if they exist
        if 'subsections' in detail_item:
            create_plan_details(plan, detail_item['subsections'], parent=plan_detail)




def populate_database(json_file_path, username='testuser'):
    """Main function to populate the database"""
    
    # Get or create a test user
    user = User.objects.get(
        username=username,
    )
    
    print(f"Using existing user: {username}")
    
    # Load JSON data
    print(f"\nLoading data from: {json_file_path}")
    with open(json_file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Create recipes
    print(f"\n{'='*50}")
    print("CREATING RECIPES")
    print('='*50)
    recipes_created = 0
    for recipe_data in data.get('recipes', []):
        try:
            recipe_data["prep_time"] = parse_duration(recipe_data.get("prep_time","0"))
            recipe = UserCreation.objects.create(**recipe_data, creator=user)
            recipes_created += 1
            recipe.save()
        except Exception as e:
            print(f"  ✗ Error creating recipe '{recipe_data.get('name')}': {e}")
    
    # Create plans
    print(f"\n{'='*50}")
    print("CREATING PLANS")
    print('='*50)
    plans_created = 0
    for plan_data in data.get('plans', []):
        try:
            details = plan_data.pop("details", None)   
            plan_data["duration"] = parse_duration(plan_data.get("duration","0"))
            plan = UserCreation.objects.create(**plan_data, creator=user)
            if details:
                 create_plan_details(plan.plan, details)
            plan.save()
            plans_created += 1
        except Exception as e:
            print(f"  ✗ Error creating plan '{plan_data.get('name')}': {e}")
    
    # Summary
    print(f"\n{'='*50}")
    print("SUMMARY")
    print('='*50)
    print(f"Recipes created: {recipes_created}/{len(data.get('recipes', []))}")
    print(f"Plans created: {plans_created}/{len(data.get('plans', []))}")
    print(f"Total UserCreation objects: {UserCreation.objects.filter(creator=user).count()}")
    print(f"Total Recipe objects: {Recipe.objects.filter(base__creator=user).count()}")
    print(f"Total Plan objects: {Plan.objects.filter(base__creator=user).count()}")
    print(f"Total PlanDetail objects: {PlanDetail.objects.count()}")
    

# Execute the population
if __name__ == '__main__':
    # Update this path to your JSON file location
    JSON_FILE_PATH = 'healthHub/fixtures/recipe_data.json'
    
    # Optionally specify a different username
    USERNAME = 'mona'
    
    print("Starting database population...")
    populate_database(JSON_FILE_PATH, USERNAME)
    print("\n✓ Database population completed!")