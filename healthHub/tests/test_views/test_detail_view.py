from django.test import TestCase, Client
from django.urls import reverse

from users.models import User
from healthHub.models import Plan , Recipe , UserCreation 
from healthHub.models import serializers as serializer

from datetime import timedelta

class DetailViewsTests(TestCase):
    def setUp(self):
        # Users
        self.owner = User.objects.create_user(username="owner", password="Pass123*",email='owner@test.com')
        self.other = User.objects.create_user(username="other", password="Pass456*",email='other@test.com')

        # recipe instance
        self.recipe = UserCreation.objects.create(
                creator=self.owner,
                name="Test Recipe",
                type="recipe",
                category="Dinner",  
                media=[],
                notes="some notes",
                prep_time=timedelta(minutes=30),
                serv=2,
                ingredients=[{"name": "Salt"}],
                directions="Cook it",
                nutrients={"calories": 200},        
            )
      

        # Plan instance
        self.plan = UserCreation.objects.create(
                creator=self.owner,
                name="Test Plan",
                type="plan",
                category="diet",  
                media=[],
                notes="some notes",
                duration=timedelta(hours=1),
                goal="Lose weight",
               
        )
        
        self.client = Client()

    def test_recipe_details_ok(self):
        self.client.login(username="owner", password="Pass123*")

        response = self.client.get(
            reverse("recipes", args=[self.recipe.recipe.id, "Test Recipe"])
        )

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "details.html")
    
    def test_recipe_details_context_data(self):
        self.client.login(username="owner", password="Pass123*")

        response = self.client.get(
            reverse("recipes", args=[self.recipe.recipe.id, "Test Recipe"])
        )

        data = response.context["data"]

        self.assertIsInstance(data, dict)
        self.assertEqual(data["id"], self.recipe.recipe.id)
        self.assertEqual(data["name"], self.recipe.name)
        self.assertTrue(data["isOwner"])
        self.assertEqual(data["media"], ['/static/images/logo.png'])
        self.assertEqual(data["prep_time"], "0:30:00")

    def test_recipe_details_is_owner_false(self):
        self.client.login(username="other", password="Pass456*")

        response = self.client.get(
            reverse("recipes", args=[self.recipe.recipe.id, "Test Recipe"])
        )

        self.assertFalse(response.context["data"]["isOwner"])

    def test_recipe_details_404(self):
        self.client.login(username="owner", password="Pass123*")

        response = self.client.get(
            reverse("recipes", args=[9999, "x"])
        )

        self.assertEqual(response.status_code, 404)

    def test_plan_details_ok(self):
        self.client.login(username="owner", password="Pass123*")

        response = self.client.get(
            reverse("plans", args=[self.plan.plan.id, "Test Plan"])
        )

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "details.html")
    
    def test_plan_details_context_data(self):
        self.client.login(username="owner", password="Pass123*")

        response = self.client.get(
            reverse("plans", args=[self.plan.plan.id, "Test Plan"])
        )

        data = response.context["data"]

        self.assertIsInstance(data, dict)
        self.assertEqual(data["id"], self.plan.plan.id)
        self.assertEqual(data["name"], self.plan.name)
        self.assertTrue(data["isOwner"])
        self.assertEqual(data["media"], ['/static/images/logo.png'])
        self.assertEqual(data["duration"], "1:00:00")

    def test_plan_details_is_owner_false(self):
        self.client.login(username="other", password="Pass456*")

        response = self.client.get(
            reverse("plans", args=[self.plan.plan.id, "Test Plan"])
        )

        self.assertFalse(response.context["data"]["isOwner"])

    def test_plan_details_404(self):
        self.client.login(username="owner", password="Pass123*")

        response = self.client.get(
            reverse("plans", args=[9999, "x"])
        )

        self.assertEqual(response.status_code, 404)
