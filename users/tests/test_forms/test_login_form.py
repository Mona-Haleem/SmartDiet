from django.test import TestCase
from users.models import User
from users.forms.login_form import LoginForm


class LoginFormTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="strongpassword123"
        )

    def test_login_form_empty_fields(self):
        """Form should be invalid if required fields are missing"""
        form = LoginForm(data={})
        self.assertFalse(form.is_valid())
        self.assertIn("login", form.errors)
        self.assertIn("login_password", form.errors)

    def test_login_form_invalid_username(self):
        """Form should add error if username does not exist"""
        form = LoginForm(data={"login": "nonexistent", "login_password": "irrelevant"})
        self.assertFalse(form.is_valid())
        self.assertIn("login", form.errors)

    def test_login_form_wrong_password(self):
        """Form should be invalid if password is incorrect"""
        form = LoginForm(data={"login": "testuser", "login_password": "wrongpass"})
        self.assertFalse(form.is_valid())
        self.assertIn("login", form.errors)  

    def test_login_form_valid_username(self):
        """Form should be valid and authenticate correctly using username"""
        form = LoginForm(data={"login": "testuser", "login_password": "strongpassword123"})
        self.assertTrue(form.is_valid())
        self.assertEqual(form.get_user(), self.user)

    def test_login_form_valid_email(self):
        """Form should be valid and authenticate correctly using email"""
        form = LoginForm(data={"login": "test@example.com", "login_password": "strongpassword123"})
        self.assertTrue(form.is_valid())
        self.assertEqual(form.get_user(), self.user)


