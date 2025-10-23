# # register fun
# """
#     on valid form :
#     1- create new user
#     2- return sucess response
# """

# """
#     on invalid form :
#     1 - return accurate error message
# """


# # login fun 
# """
#     on valid form :
#     1- return sucesses responcse
# """

# """
#     on invalid form :
#     2- return failed response with accurate error message
# """

# from django.test import TestCase
# from users.models import User
# from users.helpers.authentication import EmailOrUsernameBackend


# class test_authentication(TestCase):
    
#     def setUp(self):
#         self.backend = EmailOrUsernameBackend()
#         self.user = User.objects.create_user(
#             username='testuser', 
#             email='test@example.com', 
#             password='StrongPassword1!'
#         )

#     def test_auth_with_username_success(self):
#         user = self.backend.authenticate(None, username='testuser', password='StrongPassword1!')
#         self.assertEqual(user, self.user)
        
#     def test_auth_with_email_success(self):
#         user = self.backend.authenticate(None, username='test@example.com', password='StrongPassword1!')
#         self.assertEqual(user, self.user)
        
#     def test_auth_with_wrong_password(self):
#         user = self.backend.authenticate(None, username='testuser', password='wrong')
#         self.assertIsNone(user)
        
#     def test_auth_with_nonexistent_user(self):
#         user = self.backend.authenticate(None, username='nosuchuser', password='123')
#         self.assertIsNone(user)
        
#     def test_auth_with_inactive_user(self):
#         self.user.is_active = False
#         self.user.save()
#         # ModelBackend (which we extend) checks is_active, so this should fail
#         user = self.backend.authenticate(None, username='testuser', password='StrongPassword1!')
#         self.assertIsNone(user)
        
#     def test_get_user(self):
#         user = self.backend.get_user(self.user.pk)
#         self.assertEqual(user, self.user)
        
#     def test_get_user_nonexistent(self):
#         user = self.backend.get_user(999)
#         self.assertIsNone(user)
