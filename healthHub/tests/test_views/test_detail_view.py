from django.test import TestCase, Client
from django.urls import reverse

from users.models import User
from healthHub.models import Plan , Recipe , UserCreation 
from healthHub.models import serializers as serializer

from datetime import timedelta
import json

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
                directions=[{"type": "p", "content": "Cook it", "effects": []}],
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
                duration=timedelta(days=7),
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

        data = response.context["ele"]

        self.assertIsInstance(data, dict)
        self.assertEqual(data["id"], self.recipe.recipe.id)
        self.assertEqual(data["name"], self.recipe.name)
        self.assertTrue(json.loads(data["isOwner"]))
        self.assertEqual(data["media"], ['/static/assets/logo.png'])
        self.assertEqual(data["prep_time"], {"h": 0, "m": 30})

    def test_recipe_details_is_owner_false(self):
        self.recipe.shared = True
        self.recipe.save()
        self.client.login(username="other", password="Pass456*")

        response = self.client.get(
            reverse("recipes", args=[self.recipe.recipe.id, "Test Recipe"])
        )

        self.assertFalse(json.loads(response.context["ele"]["isOwner"]))

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

        data = response.context["ele"]

        self.assertIsInstance(data, dict)
        self.assertEqual(data["id"], self.plan.plan.id)
        self.assertEqual(data["name"], self.plan.name)
        self.assertTrue(json.loads(data["isOwner"]))
        self.assertEqual(data["media"], ['/static/assets/logo.png'])
        self.assertEqual(data["duration"], 7)

    def test_plan_details_is_owner_false(self):
        self.plan.shared = True
        self.plan.save()
        self.client.login(username="other", password="Pass456*")

        response = self.client.get(
            reverse("plans", args=[self.plan.plan.id, "Test Plan"])
        )

        self.assertFalse(json.loads(response.context["ele"]["isOwner"]))

    def test_plan_details_404(self):
        self.client.login(username="owner", password="Pass123*")

        response = self.client.get(
            reverse("plans", args=[9999, "x"])
        )

        self.assertEqual(response.status_code, 404)
