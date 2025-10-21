import pytest
import django
from django.conf import settings

if not settings.configured:
    import os
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()

from rest_framework.test import APIClient

@pytest.fixture
def api_client():
    return APIClient()
# ✅ Prefix test functions and files with test_ so pytest finds them automatically.

# ✅ Use @pytest.mark.django_db for any test that interacts with the database.

# ✅ Use pytest.ini (which you already have) to configure Django settings and options.

# ✅ Optional: Add a conftest.py in the project root (not per app) for shared fixtures like your api_client.

# use ptw for watch mode