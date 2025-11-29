import pytest
from datetime import timedelta
from django.utils import timezone
from users.models import User
# Import your models
from healthHub.models.base import UserCreation, ElementType
from healthHub.models.recipe import Recipe
from healthHub.models.plan import Plan

# Tell pytest this test file needs database access
pytestmark = pytest.mark.django_db

@pytest.fixture
def user():
    """Create a standard test user."""
    return User.objects.create_user(username='testuser', password='password123')

@pytest.fixture
def base_recipe(user):
    """
    Create a UserCreation object of type RECIPE.
    We return the *base* object for flexibility.
    """
    base = UserCreation.objects.create(
        creator=user,
        name='Test Recipe',
        type=ElementType.RECIPE,
        shared=True
    )
    base.edited = timezone.now() - timedelta(days=2)
    base.save()
    
    Recipe.objects.create(base=base, category='Test Category')
    return base

@pytest.fixture
def base_plan(user):
    """
    Create a UserCreation object of type PLAN.
    We return the *base* object.
    """
    base = UserCreation.objects.create(
        creator=user,
        name='Test Plan',
        type=ElementType.PLAN,
        shared=False
    )
    base.edited = timezone.now() - timedelta(days=1)
    base.save()
    
    Plan.objects.create(base=base, duration=timedelta(days=7))
    return base
