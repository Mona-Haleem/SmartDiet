# #register view : 
# """
#     test on GET request:
#     1 - redirect to / 
#     2 - with register form
# """

# """
#     test on sucesseful register:
#     1- a new user created in the DB 
#     2- redirect to / with login form and username/email field is filled
# """

# """
#     test on failur register:
#      1- return error message fragrment displayed 
# """

# from django.test import TestCase, Client
# from django.urls import reverse
# from django.contrib.auth import get_user_model

# User = get_user_model()

# class RegisterViewPostTests(TestCase):

#     def setUp(self):
#         self.client = Client()
#         self.register_url = reverse('register')
#         self.index_url = reverse('index')
#         # Create a user to test collisions
#         User.objects.create_user(
#             username='existing', 
#             email='existing@example.com', 
#             password='StrongPassword1!'
#         )

#     def test_get_register_redirects_to_index_with_param(self):
#         """
#         GET /register: Should redirect to /?form=register.
#         """
#         response = self.client.get(self.register_url)
#         self.assertRedirects(response, self.index_url + '?form=register', status_code=302)

   
#     def test_register_success(self):
#         """
#         POST /register: Successful registration creates user, logs in, and redirects.
#         """
#         response = self.client.post(self.register_url, {
#             'email': 'newuser@example.com',
#             'password': 'NewStrongPassword1!',
#             'confirmation': 'NewStrongPassword1!'
#         })
#         self.assertRedirects(response, self.index_url, status_code=302)
#         # Check user was created
#         self.assertTrue(User.objects.filter(email='newuser@example.com').exists())
#         user = User.objects.get(email='newuser@example.com')
#         self.assertEqual(user.username, 'newuser') # Based on view logic
#         # Check user is logged in
#         response = self.client.get(self.index_url)
#         self.assertTemplateUsed(response, 'diet/index.html')
#         self.assertEqual(response.context['user'].email, 'newuser@example.com')

#     def test_register_password_mismatch(self):
#         """
#         POST /register: Password mismatch renders auth.html with error.
#         """
#         response = self.client.post(self.register_url, {
#             'email': 'newuser@example.com',
#             'password': 'NewStrongPassword1!',
#             'confirmation': 'MISMATCH'
#         })
#         self.assertEqual(response.status_code, 200)
#         self.assertTemplateUsed(response, 'diet/auth.html')
#         self.assertIn('register_form', response.context)
#         self.assertTrue(response.context['register_form'].has_error('confirmation'))
#         self.assertEqual(response.context['show_form'], 'register')
#         self.assertFalse(User.objects.filter(email='newuser@example.com').exists())

#     def test_register_duplicate_email(self):
#         """
#         POST /register: Duplicate email renders auth.html with error.
#         """
#         response = self.client.post(self.register_url, {
#             'email': 'existing@example.com', # This email already exists
#             'password': 'NewStrongPassword1!',
#             'confirmation': 'NewStrongPassword1!'
#         })
#         self.assertEqual(response.status_code, 200)
#         self.assertTemplateUsed(response, 'diet/auth.html')
#         self.assertIn('register_form', response.context)
#         self.assertTrue(response.context['register_form'].has_error('email'))
#         self.assertEqual(response.context['show_form'], 'register')

#     def test_register_weak_password(self):
#         """
#         POST /register: Weak password (no special char) renders auth.html with error.
#         """
#         response = self.client.post(self.register_url, {
#             'email': 'newuser@example.com',
#             'password': 'weakpassword', # Fails multiple checks
#             'confirmation': 'weakpassword'
#         })
#         self.assertEqual(response.status_code, 200)
#         self.assertTemplateUsed(response, 'diet/auth.html')
#         self.assertIn('register_form', response.context)
#         self.assertTrue(response.context['register_form'].has_error('password'))
#         self.assertIn('at least 8 characters', str(response.context['register_form'].errors['password']))
#         self.assertIn('one uppercase letter', str(response.context['register_form'].errors['password']))
#         self.assertIn('one special character', str(response.context['register_form'].errors['password']))
#         self.assertEqual(response.context['show_form'], 'register')
#         self.assertFalse(User.objects.filter(email='newuser@example.com').exists())

#     def test_register_username_collision_handling(self):
#         """
#         POST /register: Test username collision (e.g., existing@a.com and existing@b.com)
#         """
#         # 'existing' username is already taken by 'existing@example.com'
#         response = self.client.post(self.register_url, {
#             'email': 'existing@newdomain.com', # This will also generate 'existing'
#             'password': 'StrongPassword1!',
#             'confirmation': 'StrongPassword1!'
#         })
#         self.assertRedirects(response, self.index_url, status_code=302)
#         # Check that the new user was created with a modified username
#         self.assertTrue(User.objects.filter(email='existing@newdomain.com').exists())
#         user = User.objects.get(email='existing@newdomain.com')
#         self.assertEqual(user.username, 'existing1') # View logic appends '1'
