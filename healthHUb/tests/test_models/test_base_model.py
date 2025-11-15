from datetime import timedelta
from django.utils import timezone
from django.test import TestCase

from users.models import User
from healthHub.models.base import UserCreation, ElementType
from healthHub.models.recipe import Recipe
from healthHub.models.plan import Plan, PlanType


class UserCreationModelTest(TestCase):
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            email='testuser@example.com',
            username='testuser',
            password='password123'
        )

        # Create base Recipe
        self.base_recipe = UserCreation.objects.create(
            creator=self.user,
            name='Test Recipe',
            type=ElementType.RECIPE,
            shared=True
        )
        self.base_recipe.edited = timezone.now() - timedelta(days=2)
        self.base_recipe.save()
        Recipe.objects.create(base=self.base_recipe, category='Test Category')

        # Create base Plan
        self.base_plan = UserCreation.objects.create(
            creator=self.user,
            name='Test Plan',
            type=ElementType.PLAN,
            shared=False
        )
        self.base_plan.edited = timezone.now() - timedelta(days=1)
        self.base_plan.save()
        Plan.objects.create(base=self.base_plan, duration=timedelta(days=7))

    def test_get_concrete_property(self):
        """Test that .get_concrete() returns correct subtype."""
        concrete_recipe = self.base_recipe.get_concrete()
        self.assertIsInstance(concrete_recipe, Recipe)
        self.assertEqual(concrete_recipe, self.base_recipe.recipe)
        self.assertEqual(concrete_recipe.category, 'Test Category')

        concrete_plan = self.base_plan.get_concrete()
        self.assertIsInstance(concrete_plan, Plan)
        self.assertEqual(concrete_plan, self.base_plan.plan)
        self.assertEqual(concrete_plan.duration, timedelta(days=7))

    def test_get_concrete_edge_case(self):
        """Test get_concrete() returns None if subclass missing."""
        base_only = UserCreation.objects.create(
            creator=self.user,
            name='Orphan Recipe',
            type=ElementType.RECIPE
        )
        self.assertIsNone(base_only.get_concrete())

    def test_relationship_access_correct(self):
        """Accessing .recipe/.plan returns correct related object."""
        self.assertIsNotNone(self.base_recipe.recipe)
        self.assertEqual(self.base_recipe.recipe.category, 'Test Category')

        self.assertIsNotNone(self.base_plan.plan)
        self.assertEqual(self.base_plan.plan.duration, timedelta(days=7))

    def test_relationship_access_mismatched(self):
        """Accessing mismatched subtype raises RelatedObjectDoesNotExist."""
        RecipeDoesNotExist = UserCreation.recipe.RelatedObjectDoesNotExist
        PlanDoesNotExist = UserCreation.plan.RelatedObjectDoesNotExist

        # Now test that accessing the missing related object raises the exception
        with self.assertRaises(RecipeDoesNotExist):
            _ = self.base_plan.recipe  # Plan does not have a recipe

        with self.assertRaises(PlanDoesNotExist):
            _ = self.base_recipe.plan  

    def test_filter_by_type(self):
        """Filtering by type works correctly."""
        self.assertEqual(UserCreation.objects.count(), 2)

        recipes = UserCreation.objects.filter(type=ElementType.RECIPE)
        self.assertEqual(recipes.count(), 1)
        self.assertEqual(recipes.first(), self.base_recipe)

        plans = UserCreation.objects.filter(type=ElementType.PLAN)
        self.assertEqual(plans.count(), 1)
        self.assertEqual(plans.first(), self.base_plan)

    def test_default_ordering(self):
        """Default ordering by -edited works."""
        all_creations = UserCreation.objects.all()
        self.assertEqual(all_creations.first(), self.base_plan)
        self.assertEqual(all_creations.last(), self.base_recipe)

    def test_list_all_includes_both_types(self):
        """All elements are included in the default manager."""
        self.assertEqual(UserCreation.objects.count(), 2)

    def test_combined_filter_and_order(self):
        """Filtering and ordering combined behaves correctly."""
        # Add a new shared recipe
        base_recipe_2 = UserCreation.objects.create(
            creator=self.user,
            name='New Recipe',
            type=ElementType.RECIPE,
            shared=True
        )
        base_recipe_2.edited = timezone.now() - timedelta(days=1)
        base_recipe_2.save()
        Recipe.objects.create(base=base_recipe_2)

        self.assertEqual(UserCreation.objects.count(), 3)

        query = UserCreation.objects.filter(shared=True).order_by('-edited')
        results = list(query)

        # Expect newest first
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0], base_recipe_2)
        self.assertEqual(results[1], self.base_recipe)
