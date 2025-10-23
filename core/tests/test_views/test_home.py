# from django.test import TestCase, Client
# from django.urls import reverse
# from django.contrib.auth import get_user_model


# User = get_user_model()

# class ViewTests(TestCase):
    
#     def setUp(self):
#         self.client = Client()
#         self.user = User.objects.create_user(
#             username='testuser', 
#             email='test@example.com', 
#             password='StrongPassword1!'
#         )
#         self.register_url = reverse('register')
#         self.login_url = reverse('login')
#         self.logout_url = reverse('logout')
#         self.index_url = reverse('index')

#     def test_index_authenticated_user(self):
#         """
#         GET /: Authenticated users should see index.html.
#         """
#         self.client.login(username='testuser', password='StrongPassword1!')
#         response = self.client.get(self.index_url)
#         self.assertEqual(response.status_code, 200)
#         self.assertTemplateUsed(response, 'diet/index.html')

#     def test_index_unauthenticated_user_default(self):
#         """
#         GET /: Unauthenticated users should see auth.html with the login form.
#         """
#         response = self.client.get(self.index_url)
#         self.assertEqual(response.status_code, 200)
#         self.assertTemplateUsed(response, 'diet/auth.html')
#         self.assertIn('login_form', response.context)
#         self.assertIsInstance(response.context['login_form'], LoginForm)
#         self.assertEqual(response.context['show_form'], 'login')

#     def test_index_unauthenticated_user_register_param(self):
#         """
#         GET /?form=register: Should show auth.html with the register form.
#         """
#         response = self.client.get(self.index_url + '?form=register')
#         self.assertEqual(response.status_code, 200)
#         self.assertTemplateUsed(response, 'diet/auth.html')
#         self.assertIn('register_form', response.context)
#         self.assertIsInstance(response.context['register_form'], RegisterForm)
#         self.assertEqual(response.context['show_form'], 'register')

