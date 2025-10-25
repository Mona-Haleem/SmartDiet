from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()

class UserModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="StrongPass!1"
        )

    def test_serialize_returns_expected_fields(self):
        data = self.user.serialize()
        self.assertIn("username", data)
        self.assertIn("email", data)
        self.assertEqual(data["username"], "testuser")
        self.assertEqual(data["email"], "test@example.com")

    def test_str_method_returns_username(self):
        self.assertEqual(str(self.user), "testuser")

 