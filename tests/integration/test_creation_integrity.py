from datetime import timedelta
from unittest.mock import Mock

import pytest
from django.urls import reverse

from healthHub.models import UserCreation

pytestmark = [pytest.mark.django_db, pytest.mark.integration]


@pytest.mark.parametrize("kind", ["recipe", "plan"])
def test_manager_uses_the_model_default_for_omitted_media(user, kind):
    creation = UserCreation.objects.create(
        creator=user, name="Default media", type=kind,
        category="diet" if kind == "plan" else "Dinner",
    )
    assert creation.media == []
    assert creation.get_concrete() is not None


@pytest.mark.parametrize("kind", ["recipe", "plan"])
def test_valid_creation_persists_base_and_specific_fields(client, user, kind):
    client.force_login(user)
    payload = {
        "type": kind, "name": "Created via API", "category": "diet" if kind == "plan" else "Dinner",
        "serv": 2, "ingredients": [], "prep_time_hours": 0, "prep_time_minutes": 30,
        "duration_days": 3, "create_default_sections": False,
    }
    response = client.post(reverse(kind + "s", args=["new", "new"]), payload, content_type="application/json")
    assert response.status_code == 200
    base = UserCreation.objects.get(creator=user, name=payload["name"])
    specific = base.get_concrete()
    assert base.type == kind
    assert specific.pk == response.json()["id"]
    if kind == "recipe":
        assert specific.serv == 2
        assert specific.prep_time == timedelta(minutes=30)
    else:
        assert specific.duration == timedelta(days=3)


def test_failed_recipe_creation_does_not_leave_an_orphan_base(client, user, monkeypatch):
    client.force_login(user)
    client.raise_request_exception = False
    monkeypatch.setattr("healthHub.models.recipe.Recipe.objects.create", Mock(side_effect=RuntimeError("Storage failed")))
    response = client.post(reverse("recipes", args=["new", "new"]), {
        "type": "recipe", "name": "Must roll back", "category": "Dinner",
        "serv": 1, "ingredients": [],
    }, content_type="application/json")
    assert not UserCreation.objects.filter(creator=user, name="Must roll back").exists()
    assert response.status_code >= 400


def test_full_plan_cannot_reference_another_users_private_plan(client, user, plan_factory):
    private = plan_factory()
    own_exercise = plan_factory(creator=user, category="exercise")
    client.force_login(user)
    response = client.post(reverse("plans", args=["new", "new"]), {
        "type": "plan", "name": "Foreign link", "category": "full",
        "diet_plan_id": private.pk, "exercise_plan_id": own_exercise.pk,
        "duration_days": 7, "create_default_sections": False,
    }, content_type="application/json")
    assert not UserCreation.objects.filter(creator=user, name="Foreign link").exists()
    assert response.status_code in {400, 403, 404}
