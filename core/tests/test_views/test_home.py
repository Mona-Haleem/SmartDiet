from django.test import TestCase, Client
from django.urls import reverse
from users.models import User
from users.forms import login_form , register_form

class ViewTests(TestCase):
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser', 
            email='test@example.com', 
            password='StrongPassword1!'
        )
        self.register_url = reverse('index',args=["register"])
        self.login_url = reverse('index',args=["login"])
        self.index_url = reverse('index')

    def test_index_authenticated_user(self):
        self.client.login(username='testuser', password='StrongPassword1!')
        response = self.client.get(self.index_url)
        print("respons ----------------:",response)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'index.html')

    def test_index_unauthenticated_user_default_or_login_param(self):
        response = self.client.get(self.index_url)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'auth.html')
        self.assertIn('form', response.context)
        self.assertIsInstance(response.context['form'], login_form.LoginForm)
        self.assertEqual(response.context['slug'], 'login')

    def test_index_unauthenticated_user_register_param(self):
        response = self.client.get(self.register_url)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'auth.html')
        self.assertIn('form', response.context)
        self.assertIsInstance(response.context['form'], register_form.RegisterForm)
        self.assertEqual(response.context['slug'], 'register')
