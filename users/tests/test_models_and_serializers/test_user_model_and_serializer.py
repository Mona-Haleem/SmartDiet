from django.test import TestCase #dbtesting
from django.contrib.auth import get_user_model
User = get_user_model()

class UserTestCase(TestCase):
    def setUp(self):

        return
    def test_age_calculated_correctly(self):
        return
    
    def test_user_serialized_correctly(self):
        return
    # def test_create_user_with_email(self):
    #     """Test creating a user with email is successful"""
    #     email = 'test@example.com'
    #     password = 'TestPass123!'
    #     user = User.objects.create_user(
    #         username='testuser',
    #         email=email,
    #         password=password
    #     )
        
    #     self.assertEqual(user.email, email)
    #     self.assertTrue(user.check_password(password))
    #     self.assertTrue(user.is_active)
    #     self.assertFalse(user.is_staff)


    # def test_user_string_representation(self):
    #     """Test the user string representation"""
    #     user = User.objects.create_user(
    #         username='testuser',
    #         email='test@example.com'
    #     )
    #     self.assertEqual(str(user), 'testuser')


    # def test_User_email_unique(self):
    #     self.assertEqual(2,2,"setuo sucess")

    # def test_User_created_with_email(self):
    #     self.assertEqual(2,2,"setuo sucess")