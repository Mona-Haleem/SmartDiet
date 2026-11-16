"""Isolated defaults for pytest. Never use DATABASE_URL or cloud storage here."""

from .settings import *  # noqa: F403

SECRET_KEY = "smartdiet-tests-only-not-a-deployment-secret"
DEBUG = False
ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
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
