"""Settings used exclusively by scripts/run_e2e_server.py."""

from .test_settings import *  # noqa: F403

DEBUG = True
TIME_ZONE = "Africa/Cairo"
STATIC_URL = "/static/"
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / ".test-data" / "e2e.sqlite3",  # noqa: F405
    }
}
USDA_API_KEY = ""
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {"django.server": {"handlers": ["console"], "level": "WARNING", "propagate": False}},
}
