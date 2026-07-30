from django.test import TestCase, RequestFactory
from users.models import User
from healthHub.helpers.construct_query import construct_query



class TestConstructQuery(TestCase):

    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create(username='testuser')

    def test_basic_filters(self):
        request = self.factory.get("/?q=hello&type=plan")
        request.user = self.user

        filters, order = construct_query(request, mode='user')

        self.assertEqual(filters, {
            "name__icontains": "hello",
            "type": "plan",
            "creator": self.user
        })
        self.assertEqual(order, "-edited")

    def test_categories_split(self):
        request = self.factory.get("/?categories=a,b,c")
        request.user = self.user

        filters, order = construct_query(request, mode='user')

        self.assertEqual(filters["category__in"], ["a", "b", "c"])

    def test_order_override(self):
        request = self.factory.get("/?order=created")
        request.user = self.user

        filters, order = construct_query(request, mode='user')

        self.assertEqual(order, "created")

    def test_shared_mode(self):
        request = self.factory.get("/")
        request.user = self.user

        filters, order = construct_query(request, mode='shared')

        self.assertIn("shared", filters)
        self.assertTrue(filters["shared"])

    def test_ignores_unknown_params(self):
        request = self.factory.get("/?foo=bar&x=123")
        request.user = self.user

        filters, order = construct_query(request, mode='user')

        # only creator should be included
        self.assertEqual(filters, {"creator": self.user})
