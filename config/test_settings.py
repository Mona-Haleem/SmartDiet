"""Isolated defaults for pytest. Never use DATABASE_URL or cloud storage here."""

import os

from .settings import *  # noqa: F403

SECRET_KEY = "smartdiet-tests-only-not-a-deployment-secret"
DEBUG = False
ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
# Explicit opt-in for an isolated local test server. Host, role, and database
# names are fixed so application DATABASE_URL credentials cannot be reused.
if os.environ.get("SMARTDIET_TEST_POSTGRES_PORT"):
    test_port = int(os.environ["SMARTDIET_TEST_POSTGRES_PORT"])
    if not 1024 <= test_port <= 65535:
        raise ValueError("Test PostgreSQL port must be between 1024 and 65535")
    DATABASES = {"default": {
        "ENGINE": "django.db.backends.postgresql",
        "HOST": "127.0.0.1", "PORT": test_port,
        "NAME": "smartdiet_tests", "USER": "smartdiet_tests",
        "PASSWORD": os.environ.get("SMARTDIET_TEST_POSTGRES_PASSWORD", ""),
        "TEST": {"NAME": "test_smartdiet_tests"},
    }}
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
USDA_API_KEY = "test-key-never-sent-to-usda"
CLOUDINARY_CLOUD_NAME = ""
CLOUDINARY_API_KEY = ""
CLOUDINARY_API_SECRET = ""
WHITENOISE_AUTOREFRESH = True
WHITENOISE_USE_FINDERS = True
