from datetime import date
from unittest.mock import Mock

import pytest
import requests
from django.urls import reverse

from core.models import UserLog
from healthHub.helpers.nurtientCalculator import get_nutrition_info_usda
from healthHub.models import PlanDetail, UserCreation

pytestmark = [pytest.mark.django_db, pytest.mark.integration]


@pytest.mark.parametrize("kind", ["plans", "recipes"])
def test_missing_content_returns_404(client, user, kind):
    client.force_login(user)
    assert client.get(reverse(kind, args=[999999, "missing"])).status_code == 404


@pytest.mark.parametrize("kind", ["plan", "recipe"])
@pytest.mark.parametrize("shared,expected", [(False, 404), (True, 200)])
def test_non_owner_can_only_read_shared_content(client, user, plan_factory, recipe_factory, kind, shared, expected):
    item = (plan_factory if kind == "plan" else recipe_factory)(shared=shared)
    client.force_login(user)
    response = client.get(reverse(kind + "s", args=[item.pk, item.base.name]))
    assert response.status_code == expected
    if expected == 200:
        import json
        assert json.loads(response.context["ele"]["isOwner"]) is False


def test_top_level_section_creation_does_not_reorder_another_plan(client, user, plan_factory):
    own = plan_factory(creator=user)
    unrelated = plan_factory()
    target = PlanDetail.objects.create(plan=own, section="Own root", order=1)
    other = PlanDetail.objects.create(plan=unrelated, section="Unrelated root", order=1)
    client.force_login(user)
    response = client.post(reverse("sections", args=[target.pk]),
        {"section": "New root", "targetRelation": "before", "order": 1}, content_type="application/json")
    assert response.status_code == 201
    other.refresh_from_db()
    assert other.order == 1
    assert own.details.filter(section="New root", parent_section=None).exists()


def test_cloning_shared_plan_preserves_an_independent_section_tree(client, user, plan_factory):
    # Offset base/concrete IDs: a route must not accidentally rely on their equality.
    from healthHub.models import Recipe
    filler = UserCreation(creator=user, name="Recipe ID offset", type="recipe", category="Dinner", media=[])
    filler.save(); Recipe.objects.create(base=filler)
    source = plan_factory(shared=True)
    root = PlanDetail.objects.create(plan=source, section="Day 1", order=1)
    child = PlanDetail.objects.create(plan=source, parent_section=root, section="Breakfast", detail=[
        {"type": "p", "content": "Oats", "effects": []}
    ])
    client.force_login(user)
    response = client.post(reverse("plans", args=[source.pk, source.base.name]))
    assert response.status_code == 200
    clone = UserCreation.objects.get(creator=user, type="plan").plan
    assert clone.pk != source.pk
    cloned_root = clone.details.get(section="Day 1")
    cloned_child = clone.details.get(section="Breakfast")
    assert cloned_root.pk != root.pk
    assert cloned_child.pk != child.pk
    assert cloned_child.parent_section_id == cloned_root.pk
    assert cloned_child.detail == child.detail
    cloned_child.detail = []
    cloned_child.save()
    child.refresh_from_db()
    assert child.detail[0]["content"] == "Oats"


@pytest.mark.parametrize("title,day,matched", [
    ("Day 1", 1, True), ("Days 1-3", 2, True),
    ("Day 1, 3, 5", 3, True), ("Week 1 Day 3", 1, False),
])
def test_daily_schedule_matches_day_numbers_not_week_numbers(plan_factory, title, day, matched):
    plan = plan_factory()
    candidate = PlanDetail.objects.create(plan=plan, section=title, order=1)
    exact = PlanDetail.objects.create(plan=plan, section=f"Day {day} exact", order=2)
    ids = {item["id"] for item in plan.get_daily_schedule(day)}
    assert exact.pk in ids
    assert (candidate.pk in ids) is matched


def test_exercise_only_plan_appears_on_home(client, user, plan_factory, freeze_time):
    freeze_time("2026-11-16T12:00:00+00:00")
    plan = plan_factory(creator=user, category="exercise")
    UserLog.objects.create(user=user, plan=plan, date=date(2026, 11, 16))
    client.force_login(user)
    response = client.get(reverse("index"))
    assert response.status_code == 200
    assert response.context["todayPlans"]["exercise"]["id"] == plan.pk
    assert response.context["todayPlans"]["diet"] == {}


def test_ingredient_edit_calculates_and_persists_nutrition(client, user, recipe_factory, monkeypatch):
    recipe = recipe_factory(creator=user)
    ingredients = [{"name": "apple", "amount": 100, "unit": "g"}]
    calculate = Mock(return_value={"calories": 52, "protein": 0.3})
    monkeypatch.setattr("healthHub.views.get_nutrition_info_usda", calculate)
    client.force_login(user)
    response = client.patch(reverse("recipes", args=[recipe.pk, recipe.base.name]),
        {"ingredients": ingredients}, content_type="application/json")
    assert response.status_code == 200
    calculate.assert_called_once_with(ingredients)
    recipe.refresh_from_db()
    assert recipe.ingredients == ingredients
    assert recipe.nutrients == {"calories": 52, "protein": 0.3}


def usda_response(foods):
    response = Mock()
    response.json.return_value = {"foods": foods}
    return response


def test_nutrition_uses_stubbed_usda_data_and_timeout(monkeypatch):
    get = Mock(return_value=usda_response([{
        "fdcId": 123, "description": "Plain oats", "foodNutrients": [
            {"nutrientNumber": "208", "unitName": "KCAL", "value": 380},
            {"nutrientNumber": "203", "unitName": "G", "value": 12},
        ]
    }]))
    monkeypatch.setattr("healthHub.helpers.nurtientCalculator.requests.get", get)
    result = get_nutrition_info_usda([{"name": "oats", "amount": 50, "unit": "g"}])
    assert result["calories"] == 190
    assert result["protein"] == 6
    get.assert_called_once()
    assert get.call_args.kwargs["params"]["query"] == "oats"
    assert 0 < get.call_args.kwargs["timeout"] <= 10


@pytest.mark.parametrize("failure", [
    requests.Timeout("Timed out"), requests.HTTPError("429 Too Many Requests"),
    requests.HTTPError("503 Service Unavailable"),
])
def test_nutrition_failure_is_not_reported_as_complete_zero_totals(monkeypatch, failure):
    get = Mock(side_effect=failure)
    monkeypatch.setattr("healthHub.helpers.nurtientCalculator.requests.get", get)
    result = get_nutrition_info_usda([{"name": "oats", "amount": 50, "unit": "g"}])
    assert result.get("success") is False or result.get("incomplete") is True
    get.assert_called_once()


def test_unknown_food_is_reported_as_incomplete(monkeypatch):
    monkeypatch.setattr("healthHub.helpers.nurtientCalculator.requests.get", Mock(return_value=usda_response([])))
    result = get_nutrition_info_usda([{"name": "unmatched food", "amount": 50, "unit": "g"}])
    assert result.get("success") is False or result.get("incomplete") is True
