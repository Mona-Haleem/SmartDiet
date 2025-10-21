from django.test import TestCase
from django.urls import reverse
import pytest
# Create your tests here.
class SimpleTest(TestCase):
    def test_homepage_status(self):
        response = self.client.get(reverse('test'))
        self.assertEqual(response.status_code, 200)

def test_test_endpoint(client):
    url = reverse('test')  
    response = client.get(url)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "test" in data["data"]

# @pytest.mark.django_db
# def test_create_post(client):
#     response = client.post('/api/posts/', {'title': 'Hello', 'content': 'World'})
#     assert response.status_code == 201

def test_healthcheck(api_client):
    response = api_client.get('/diet/test/')
    assert response.status_code == 200
