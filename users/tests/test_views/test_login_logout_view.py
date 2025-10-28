from django.test import TestCase, Client
from django.urls import reverse
from users.models import User
import json 

class LoginViewTests(TestCase):

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser', 
            email='test@example.com', 
            password='StrongPassword1!'
        )
        self.login_url = reverse('login')
        self.index_url = reverse('index')

    def test_get_login_redirects_to_index_with_param(self):
        response = self.client.get(self.login_url)
        self.assertRedirects(response, self.index_url + 'login/', status_code=302)
   

    def test_login_with_username_success(self):
        response = self.client.post(self.login_url, {
            'login': 'testuser',
            'login_password': 'StrongPassword1!'
        })
        self.assertIn("X-Redirect", response)
        self.assertEqual(response["X-Redirect"], '/diet/')
        response = self.client.get(self.index_url)
        self.assertTemplateUsed(response, 'index.html')

    def test_login_with_email_success(self):
        response = self.client.post(self.login_url, {
            'login': 'test@example.com',
            'login_password': 'StrongPassword1!'
        })
        self.assertIn("X-Redirect", response)
        self.assertEqual(response["X-Redirect"], '/diet/')
        response = self.client.get(self.index_url)
        self.assertTemplateUsed(response, 'index.html')

    def test_login_invalid_credentials(self):
        response = self.client.post(self.login_url, {
            'login': 'testuser',
            'login_password': 'WrongPassword!'
        })
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertIn('errors', data)
        self.assertIn('login', data['errors'])
 

    def test_login_nonexistent_user(self):
        response = self.client.post(self.login_url, {
            'login': 'nosuchuser',
            'login_password': 'AnyPassword123!'
        })
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertIn('errors', data)
        self.assertIn('login', data['errors'])

    def test_login_empty_form(self):
        """POST /login with empty data should show field errors."""
        response = self.client.post(self.login_url, {})
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertIn('errors', data)
        self.assertIn('login', data['errors'])
        self.assertIn('login_password', data['errors'])


class LogoutView(TestCase):
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser', 
            email='test@example.com', 
            password='StrongPassword1!'
        )
        self.register_url = reverse('register')
        self.login_url = reverse('login')
        self.logout_url = reverse('logout')
        self.index_url = reverse('index')
        
    def test_logout_view(self):
        """
        GET /logout: Should log the user out and redirect to index.
        """
        self.client.login(username='testuser', password='StrongPassword1!')
        response = self.client.post(self.logout_url) 
        self.assertRedirects(response, self.index_url, status_code=302)
        response = self.client.get(self.index_url)
        self.assertTemplateUsed(response, 'auth.html')
