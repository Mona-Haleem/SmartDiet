from django.test import TestCase
from users.forms.register_form import  RegisterForm
from users.models import User

# class RegisterFormTests(TestCase):
#     def test_valid_form(self):
#         form_data = {
#             "email": "newuser@example.com",
#             "password": "StrongPass!1",
#             "confirmation": "StrongPass!1",
#         }
#         form = RegisterForm(data=form_data)
#         self.assertTrue(form.is_valid())

#     def test_password_mismatch(self):
#         form = RegisterForm(data={
#             "email": "user@example.com",
#             "password": "StrongPass!1",
#             "confirmation": "StrongPass!2"
#         })
#         self.assertFalse(form.is_valid())

#     def test_duplicate_email(self):
#         User.objects.create_user(username="dupe", email="dupe@example.com", password="StrongPass!1")
#         form = RegisterForm(data={
#             "email": "dupe@example.com",
#             "password": "StrongPass!1",
#             "confirmation": "StrongPass!1"
#         })
#         self.assertFalse(form.is_valid())

#     def test_weak_password(self):
#         form = RegisterForm(data={
#             "email": "weak@example.com",
#             "password": "12345",
#             "confirmation": "12345"
#         })
#         self.assertFalse(form.is_valid())

class RegisterFormTests(TestCase):
    def test_register_form_valid(self):
        form = RegisterForm(data={
            'email': 'test@example.com',
            'password': 'StrongPassword1!',
            'confirmation': 'StrongPassword1!'
        })
        self.assertTrue(form.is_valid())

    def test_register_form_password_mismatch(self):
        form = RegisterForm(data={
            'email': 'test@example.com',
            'password': 'StrongPassword1!',
            'confirmation': 'MISMATCH'
        })
        self.assertFalse(form.is_valid())
        self.assertIn('confirmation', form.errors)
        self.assertEqual(form.errors['confirmation'][0], 'Passwords must match.')

    def test_register_form_weak_password_length(self):
        form = RegisterForm(data={
            'email': 'test@example.com',
            'password': 'Short1!',
            'confirmation': 'Short1!'
        })
        self.assertFalse(form.is_valid())
        self.assertIn('password', form.errors)
        self.assertIn('at least 8 characters', form.errors['password'][0])

    def test_register_form_weak_password_no_upper(self):
        form = RegisterForm(data={
            'email': 'test@example.com',
            'password': 'nouppercase1!',
            'confirmation': 'nouppercase1!'
        })
        self.assertFalse(form.is_valid())
        self.assertIn('password', form.errors)
        self.assertIn('one uppercase letter', form.errors['password'][0])
        
    def test_register_form_weak_password_no_lower(self):
        form = RegisterForm(data={
            'email': 'test@example.com',
            'password': 'NOLOWERCASE1!',
            'confirmation': 'NOLOWERCASE1!'
        })
        self.assertFalse(form.is_valid())
        self.assertIn('password', form.errors)
        self.assertIn('one lowercase letter', form.errors['password'][0])

    def test_register_form_weak_password_no_special(self):
        form = RegisterForm(data={
            'email': 'test@example.com',
            'password': 'NoSpecial1',
            'confirmation': 'NoSpecial1'
        })
        self.assertFalse(form.is_valid())
        self.assertIn('password', form.errors)
        self.assertIn('one special character', form.errors['password'][0])

    def test_register_form_duplicate_email(self):
        User.objects.create_user('test', 'test@example.com', 'Pass123!')
        form = RegisterForm(data={
            'email': 'test@example.com',
            'password': 'StrongPassword1!',
            'confirmation': 'StrongPassword1!'
        })
        self.assertFalse(form.is_valid())
        self.assertIn('email', form.errors)
        self.assertIn('email already exists', form.errors['email'][0])
