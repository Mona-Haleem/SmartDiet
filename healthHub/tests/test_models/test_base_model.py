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
            media=[],
            category='Test Category',
            shared=True
        )
        UserCreation.objects.filter(pk=self.base_recipe.pk).update(edited=timezone.now() - timedelta(days=2))

        # Create base Plan
        self.base_plan = UserCreation.objects.create(
            creator=self.user,
            name='Test Plan',
            type=ElementType.PLAN,
            media=[],
            category='diet',
            shared=False
        )
        UserCreation.objects.filter(pk=self.base_plan.pk).update(edited=timezone.now() - timedelta(days=1))

    def test_get_concrete_property(self):
        """Test that .get_concrete() returns correct subtype."""
        concrete_recipe = self.base_recipe.get_concrete()
        self.assertIsInstance(concrete_recipe, Recipe)
        self.assertEqual(concrete_recipe, self.base_recipe.recipe)
        self.assertEqual(concrete_recipe.base.category, 'Test Category')

        concrete_plan = self.base_plan.get_concrete()
        self.assertIsInstance(concrete_plan, Plan)
        self.assertEqual(concrete_plan, self.base_plan.plan)
        self.assertEqual(concrete_plan.duration, timedelta(days=7))

    def test_get_concrete_edge_case(self):
        """Test get_concrete() returns None if subclass missing."""
        base_only = UserCreation(
            creator=self.user,
            name='Orphan Recipe',
            type=ElementType.RECIPE
        )
        base_only.save()
        self.assertIsNone(base_only.get_concrete())

    def test_relationship_access_correct(self):
        """Accessing .recipe/.plan returns correct related object."""
        self.assertIsNotNone(self.base_recipe.recipe)
        self.assertEqual(self.base_recipe.recipe.base.category, 'Test Category')

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

    def test_explicit_recently_edited_ordering(self):
        """The browse ordering places recently edited content first."""
        all_creations = UserCreation.objects.order_by('-edited')
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
            media=[],
            shared=True
        )
        base_recipe_2.edited = timezone.now() - timedelta(days=1)
        base_recipe_2.save()

        self.assertEqual(UserCreation.objects.count(), 3)

        query = UserCreation.objects.filter(shared=True).order_by('-edited')
        results = list(query)

        # Expect newest first
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0], base_recipe_2)
        self.assertEqual(results[1], self.base_recipe)

"""
UserCreation (Base model)
🧪 Creation & Attributes

✅ Can create a new UserCreation record directly.

✅ created and edited timestamps are set correctly.

✅ Default values (e.g., is_public=False) are applied.


🧪 Manager / Factory (create_element)

✅ Creates a UserCreation and corresponding subtype (Recipe or Plan).

✅ Raises error or handles invalid element_type gracefully.

✅ Creates minimal valid base data when only basic fields are provided.

🧪 Relationships

✅ Subtype (e.g., .recipe or .plan) exists after creation.



🧪 Updates

✅ Can update single fields (name, is_public, etc.) without affecting subtype.

✅ edited field updates automatically on save.

🧪 Deletion

✅ Deleting UserCreation cascades and deletes its subtype (Recipe/Plan).

✅ Deleting via queryset (UserCreation.objects.filter(...).delete()) also cascades properly.

✅ Deleting a subtype (e.g., Recipe) also deletes its base.


🧪 Collections (many-to-many)

✅ Can assign a UserCreation to one or more collections.

✅ Can query all elements in a collection via collection.elements.all().

✅ Removing a collection does not delete the element (and vice versa).

✅ Elements can belong to multiple collections.

🍳 2. Recipe (Subtype)
🧪 Creation & Linkage

✅ Created automatically via UserCreation.create_element('recipe').

✅ Manually creating Recipe with an existing UserCreation works.


🧪 Data Fields

✅ Can store and retrieve category, ingredients, directions, nutrients.

✅ nutrients JSON field can handle arbitrary structures (e.g., dict, list).

🧪 Deletion

✅ Deleting the base record deletes the recipe.

✅ Deleting the recipe deletes the base record.

🏋️ 3. Plan (Subtype)
🧪 Creation & Linkage

✅ Created automatically via UserCreation.create_element('plan').

✅ plan_type, period, and goal fields can be set and retrieved.

🧪 Plan Details (one-to-many)

✅ Can create PlanDetail linked to a plan.

✅ Accessing plan.details.all() returns all related details.

✅ Deleting a Plan cascades and deletes all PlanDetails.

✅ PlanDetail fields (title, day_number, data) store correctly.

✅ JSON field data handles flexible structures.

📁 4. Collection (Groups)
🧪 Creation & Hierarchy

✅ Can create a root collection (no parent).

✅ Can create nested collections (with parent).

✅ unique_together (user, title) is enforced.

✅ String representation shows title and user.

✅ .is_root property correctly identifies top-level collections.

🧪 Relationships

✅ Can add multiple UserCreation elements to a collection.

✅ Can add a single element to multiple collections.

✅ Removing a collection unlinks elements, does not delete them.

✅ Deleting a parent collection does not delete children (since SET_NULL).

✅ Querying nested collections (e.g., collection.sub_collections.all()) returns correct children.

🧪 Filtering with Collections

✅ Filter all UserCreation objects belonging to a specific collection.

✅ Filter elements in nested collections (if implemented).

✅ Ordering by title works

Integration & Functional Behavior
🧪 Combined Scenarios

✅ Creating elements and assigning them to multiple collections works seamlessly.


✅ Lazy loading of subtype data only happens when accessed (.plan or .recipe).

🧪 Edge Cases

✅ Attempting to create a second subtype for the same base raises an integrity error.

✅ Deleting an unrelated object does not affect others.

✅ Null/blank optional fields save correctly.
Performance / Query Sanity (optional, but valuable)

These aren’t unit tests per se, but smoke tests or benchmarks:

✅ Listing 1000+ elements doesn’t trigger unexpected JOINs.

✅ Accessing .plan or .recipe doesn’t prefetch unnecessary data.

✅ Query counts for typical list views stay within expected bounds (use Django’s assertNumQueries).
"""
