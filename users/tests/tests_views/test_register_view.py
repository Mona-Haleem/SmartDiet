from django.test import TestCase, Client
from django.urls import reverse
from users.models import User

class RegisterViewPostTests(TestCase):

    def setUp(self):
        self.client = Client()
        self.register_url = reverse('register')
        self.index_url = reverse('index')
        User.objects.create_user(
            username='existing', 
            email='existing@example.com', 
            password='StrongPassword1!'
        )

    def test_get_register_redirects_to_index_with_param(self):
        response = self.client.get(self.register_url)
        self.assertRedirects(response, self.index_url + 'register/', status_code=302)

   
    def test_register_success(self):
        response = self.client.post(self.register_url, {
            'email': 'newuser@example.com',
            'password': 'NewStrongPassword1!',
            'confirmation': 'NewStrongPassword1!'
        })
        self.assertRedirects(response, self.index_url, status_code=302)
        self.assertTrue(User.objects.filter(email='newuser@example.com').exists())
        user = User.objects.get(email='newuser@example.com')
        self.assertEqual(user.username, 'newuser') 
        response = self.client.get(self.index_url)
        self.assertTemplateUsed(response, 'index.html')
        self.assertEqual(response.context['user'].email, 'newuser@example.com')

    def test_register_password_mismatch(self):
        """
        POST /register: Password mismatch renders auth.html with error.
        """
        response = self.client.post(self.register_url, {
            'email': 'newuser@example.com',
            'password': 'NewStrongPassword1!',
            'confirmation': 'MISMATCH'
        })
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "components/errorMsg.html")
        form = response.context["form"]
        self.assertTrue(form.has_error("confirmation"))
        self.assertFalse(User.objects.filter(email='newuser@example.com').exists())

    def test_register_duplicate_email(self):
        response = self.client.post(self.register_url, {
            'email': 'existing@example.com', 
            'password': 'NewStrongPassword1!',
            'confirmation': 'NewStrongPassword1!'
        })
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "components/errorMsg.html")
        form = response.context["form"]
        self.assertTrue(form.has_error("email"))
        
    def test_register_weak_password(self):
        response = self.client.post(self.register_url, {
            'email': 'newuser@example.com',
            'password': 'abc',
            'confirmation': 'abc'
        })
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "components/errorMsg.html")
        form = response.context["form"]
        self.assertTrue(form.has_error("password"))
        self.assertFalse(User.objects.filter(email='newuser@example.com').exists())
        self.assertIn('at least 8 characters', str(form.errors['password']))
        self.assertIn('one uppercase letter', str(form.errors['password']))
        self.assertIn('one special character', str(form.errors['password']))
        self.assertFalse(User.objects.filter(email='newuser@example.com').exists())

