# class LoginViewTests(TestCase):
#     def setUp(self):
#         self.user = User.objects.create_user(username="john", email="john@example.com", password="testpass123")

#     def test_get_login_page(self):
#         response = self.client.get(reverse("login"))
#         self.assertEqual(response.status_code, 200)
#         self.assertTemplateUsed(response, "diet/login.html")

#     def test_valid_login_redirects_to_index(self):
#         response = self.client.post(reverse("login"), {
#             "username": "john",
#             "password": "testpass123"
#         })
#         self.assertRedirects(response, reverse("index"))

#     def test_invalid_login_shows_error(self):
#         response = self.client.post(reverse("login"), {
#             "username": "john",
#             "password": "wrongpass"
#         })
#         self.assertEqual(response.status_code, 200)
#         self.assertContains(response, "Invalid username and/or password.")

#login view : 
"""
    test on GET request:
    1 - redirect to / 
    2 - with Login form
"""
"""
    test on success login:
    1- login in user:
    2- redirect to home page with index.html template rendered
"""
"""
    test on fail login:
    1- return error message fragment with correct message
"""
"""
    test on logout :
    1- logout user 
    2- redirect to / with index.html rendered
"""

from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()

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
        """
        GET /login: Should redirect to /?form=login.
        """
        response = self.client.get(self.login_url)
        self.assertRedirects(response, self.index_url + '?form=login', status_code=302)
   

    def test_login_with_username_success(self):
        """
        POST /login: Successful login with username redirects to index.
        """
        response = self.client.post(self.login_url, {
            'login': 'testuser',
            'password': 'StrongPassword1!'
        })
        self.assertRedirects(response, self.index_url, status_code=302)
        # Check user is logged in
        response = self.client.get(self.index_url)
        self.assertTemplateUsed(response, 'diet/index.html')

    def test_login_with_email_success(self):
        """
        POST /login: Successful login with email redirects to index.
        """
        response = self.client.post(self.login_url, {
            'login': 'test@example.com',
            'password': 'StrongPassword1!'
        })
        self.assertRedirects(response, self.index_url, status_code=302)
        # Check user is logged in
        response = self.client.get(self.index_url)
        self.assertTemplateUsed(response, 'diet/index.html')

    def test_login_invalid_credentials(self):
        """
        POST /login: Invalid password renders auth.html with error.
        """
        response = self.client.post(self.login_url, {
            'login': 'testuser',
            'password': 'WrongPassword!'
        })
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'diet/auth.html')
        self.assertIn('login_form', response.context)
        self.assertTrue(response.context['login_form'].has_error(None, code=None)) # Checks for non-field error
        self.assertEqual(response.context['show_form'], 'login')

    def test_login_nonexistent_user(self):
        """
        POST /login: Nonexistent user renders auth.html with error.
        """
        response = self.client.post(self.login_url, {
            'login': 'nosuchuser',
            'password': 'StrongPassword1!'
        })
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'diet/auth.html')
        self.assertTrue(response.context['login_form'].has_error(None, code=None))
        self.assertEqual(response.context['show_form'], 'login')

    def test_login_empty_form(self):
        """
        POST /login: Empty form renders auth.html with field errors.
        """
        response = self.client.post(self.login_url, {})
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'diet/auth.html')
        self.assertIn('login_form', response.context)
        self.assertTrue(response.context['login_form'].has_error('login'))
        self.assertTrue(response.context['login_form'].has_error('password'))
        self.assertEqual(response.context['show_form'], 'login')

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
        response = self.client.post(self.logout_url) # Use POST for logout
        self.assertRedirects(response, self.index_url, status_code=302)
        # Check user is logged out by accessing index again
        response = self.client.get(self.index_url)
        self.assertTemplateUsed(response, 'diet/auth.html')
