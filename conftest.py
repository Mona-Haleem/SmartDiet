"""Fixtures use real models and block accidental calls to external services."""

from datetime import date, datetime, timedelta, timezone as datetime_timezone
from itertools import count

import cloudinary.uploader
import pytest
import requests
from django.conf import settings
from django.utils import timezone
from rest_framework.test import APIClient

from healthHub.models import UserCreation
from core.models import Metric, TrackedMetrics


def pytest_sessionstart(session):
    if settings.SETTINGS_MODULE != "config.test_settings":
        raise pytest.UsageError(
            "Use --ds=config.test_settings: this suite must not use application/production database settings"
        )


@pytest.fixture(autouse=True)
def block_external_services(monkeypatch):
    def unexpected_call(*args, **kwargs):
        raise AssertionError("External service call: mock Requests or Cloudinary in this test")

    monkeypatch.setattr(requests.sessions.Session, "request", unexpected_call)
    monkeypatch.setattr(cloudinary.uploader, "upload", unexpected_call)
    monkeypatch.setattr(cloudinary.uploader, "destroy", unexpected_call)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_factory(db, django_user_model):
    sequence = count(1)

    def create_user(**overrides):
        index = next(sequence)
        values = {
            "username": f"test-user-{index}",
            "email": f"user-{index}@example.test",
            "password": "TestPassword1!",
            "birth_date": date(2000, 1, 1),
        }
        values.update(overrides)
        user = django_user_model.objects.create_user(**values)
        user.refresh_from_db()
        return user

    return create_user


@pytest.fixture
def user(user_factory):
    return user_factory()


@pytest.fixture
def plan_factory(db, user_factory):
    sequence = count(1)

    def create_plan(*, creator=None, category="diet", **overrides):
        values = {
            "creator": creator or user_factory(),
            "name": f"Test plan {next(sequence)}",
            "type": "plan",
            "category": category,
            "media": [],
            "duration": timedelta(days=7),
            "create_default_sections": False,
        }
        values.update(overrides)
        return UserCreation.objects.create(**values).plan

    return create_plan


@pytest.fixture
def recipe_factory(db, user_factory):
    sequence = count(1)

    def create_recipe(*, creator=None, **overrides):
        values = {
            "creator": creator or user_factory(),
            "name": f"Test recipe {next(sequence)}",
            "type": "recipe",
            "category": "Dinner",
            "media": [],
            "ingredients": [],
            "directions": [],
        }
        values.update(overrides)
        return UserCreation.objects.create(**values).recipe

    return create_recipe


@pytest.fixture
def metric_factory(db, user_factory):
    sequence = count(1)

    def create_metric(*, user=None, type="daily", options=None, **overrides):
        metric = Metric.objects.create(
            user=user or user_factory(),
            name=f"Metric {next(sequence)}",
            type=type,
            options=options or [],
        )
        return TrackedMetrics.objects.create(
            metric=metric, **{"target": 100, "start": 0, **overrides}
        )

    return create_metric


@pytest.fixture
def freeze_time(monkeypatch):
    """Freeze wall-clock time while respecting Django's active user timezone."""
    import core.helpers.assigned_plans as assignments
    import core.views as views
    import users.models as user_models

    def freeze(instant):
        if isinstance(instant, str):
            instant = datetime.fromisoformat(instant)
        if instant.tzinfo is None:
            instant = instant.replace(tzinfo=datetime_timezone.utc)

        class ServerDate(date):
            @classmethod
            def today(cls):
                # The test server's day is UTC; localdate uses the active timezone.
                return instant.astimezone(datetime_timezone.utc).date()

        monkeypatch.setattr(timezone, "now", lambda: instant)
        for module in (assignments, views, user_models):
            monkeypatch.setattr(module, "date", ServerDate)
        return instant

    return freeze
