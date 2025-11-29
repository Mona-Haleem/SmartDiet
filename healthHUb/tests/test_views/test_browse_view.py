from django.test import TestCase, Client
from django.utils import timezone
from users.models import User
from healthHub.models.base import UserCreation
from healthHub.models.plan import PlanType
from django.urls import reverse
import json

class MyTestSetup(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            username='user1', password='Password1*', email='test1@test.com'
        )
        self.user2 = User.objects.create_user(
            username='user2', password='Password2*', email='test2@test.com'
        )

        recipe_categories = ['drinks', 'meat', 'side dishes', 'soup', 'full meal']
        for i in range(15):
            UserCreation.objects.create(
                creator=self.user1,
                name=f"recipe {i}",
                type="recipe",
                category=recipe_categories[i % len(recipe_categories)],  # Cycle through categories
                shared=(i % 2 == 0),
                media=[],
                notes="Test note",
                created=timezone.now(),
                edited=timezone.now(),
            )

        plan_categories = [PlanType.DIET, PlanType.FULL, PlanType.EXERCISE]
        for i in range(10):
            UserCreation.objects.create(
                creator=self.user2,
                name=f"Plan {i}",
                type="plan",
                category=plan_categories[i % len(plan_categories)],  # Cycle through categories
                shared=True,
                media=[],
                notes="Test note",
                created=timezone.now(),
                edited=timezone.now(),
            )

        self.client = Client()
      
    def test_login_required_redirect(self):
        """Ensure view redirects unauthenticated users to login"""
        response = self.client.get(reverse('browse'))
        self.assertEqual(response.status_code, 302)
        self.assertIn('/login', response.url)

    def test_render_template_for_authenticated_user(self):
        """Authenticated user gets rendered template on normal GET"""
        self.client.login(username='user1', password='Password1*')
        response = self.client.get(reverse('browse'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'browser.html')
        # Check 
        context_data = response.context[-1]  
        self.assertIn('result', context_data)
        self.assertIn('items', context_data['result'])


    def test_json_response_for_fetch_request(self):
        """GET with fetch header returns JSON"""
        self.client.login(username='user1', password='Password1*')
        response = self.client.get(reverse('browse'), HTTP_SEC_FETCH_MODE='cors')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        result = json.loads(response.content)
        data = result["result"]
        self.assertIn('items', data)
        self.assertIn('page', data)
        self.assertIn('next', data)
        self.assertIn('prev', data)

    def test_user_mode_browse(self):
        """Browse view returns only user's own items"""
        self.client.login(username='user1', password='Password1*')
        response = self.client.get(reverse('browse'))
        result = response.context[-1]
        data = result["result"]
        items = data['items']
        for item in items:
            self.assertEqual(item.creator, self.user1)

    def test_shared_mode_discover(self):
        """Discover view returns only shared items"""
        self.client.login(username='user1', password='Password1*')
        response = self.client.get(reverse('discover'))
        result = response.context[-1]
        data = result["result"]
        items = data['items']
        for item in items:
            self.assertTrue(item.shared)

    def test_pagination_and_ordering(self):
        """Check pagination works with query params"""
        self.client.login(username='user1', password='Password1*')
        response = self.client.get(reverse('browse'), {'pageNumber': 1, 'order': 'name'})
        self.assertEqual(response.status_code, 200)
        result = response.context[-1]
        data = result["result"]
        items = data['items'] 
        self.assertTrue(len(items) > 0)
        # Ensure ordering ascending by 'edited'
        names = [item.name for item in items]
        self.assertEqual(names, sorted(names))

    def test_search_query_param(self):
        """Test filtering by name using 'q'"""
        self.client.login(username='user1', password='Password1*')
        response = self.client.get(reverse('browse'), {'q': 'Plan'})
        result = response.context[-1]
        data = result["result"]
   
        items = data['items']
        for item in items:
            self.assertIn('Plan', item.name)

    def test_category_filter_param(self):
        """Check filtering by categoryList"""
        self.client.login(username='user1', password='Password1*')
        response = self.client.get(reverse('browse'), {'categories': 'diet,full,drinks'})
        result = response.context[-1]
        data = result["result"]
   
        items = data['items']
        for item in items:
            self.assertIn(item.category, ['diet', 'full', 'drinks'])

    def test_type_filter_param(self):
        """Check filtering by type"""
        self.client.login(username='user1', password='Password1*')
        response = self.client.get(reverse('browse'), {'type': 'recipe'})
        result = response.context[-1]
        data = result["result"]
   
        items = data['items']
        for item in items:
            self.assertEqual(item.type, 'recipe')

