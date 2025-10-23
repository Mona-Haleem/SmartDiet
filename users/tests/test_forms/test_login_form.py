# from django.test import TestCase
# from forms import LoginForm
# from django.contrib.auth import get_user_model

# User = get_user_model()

# class LoginFormTests(TestCase):
#     def setUp(self):
#         self.user = User.objects.create_user(username="testuser", email="test@example.com", password="StrongPass!1")

#     def test_valid_login_with_username(self):
#         form = LoginForm(data={
#             "username": "testuser",
#             "password": "StrongPass!1"
#         })
#         self.assertTrue(form.is_valid())

#     def test_valid_login_with_email(self):
#         form = LoginForm(data={
#             "username": "test@example.com",
#             "password": "StrongPass!1"
#         })
#         self.assertTrue(form.is_valid())

#     def test_invalid_login_wrong_password(self):
#         form = LoginForm(data={
#             "username": "test@example.com",
#             "password": "WrongPass!1"
#         })
#         self.assertFalse(form.is_valid())

#     def test_invalid_login_unsaved_email(self):
#         form = LoginForm(data={
#             "username": "ghost@example.com",
#             "password": "StrongPass!1"
#         })
#         self.assertFalse(form.is_valid())

from django.test import TestCase
from users.forms.login_form import LoginForm
class LoginFormTests(TestCase):
    
    def test_login_form_valid(self):
        form = LoginForm(data={'login': 'test', 'password': '123'})
        self.assertTrue(form.is_valid())
        
    def test_login_form_empty(self):
        form = LoginForm(data={})
        self.assertFalse(form.is_valid())
        self.assertIn('login', form.errors)
        self.assertIn('password', form.errors)

