"""Persisted content contracts, including malformed writes and hierarchy copying."""
from datetime import timedelta
from unittest.mock import Mock

import pytest
from django.urls import reverse

from healthHub.models import Plan, PlanDetail, Recipe, UserCreation

pytestmark = [pytest.mark.django_db, pytest.mark.integration]


@pytest.fixture(autouse=True)
def authenticated(client, user):
    client.force_login(user)
    client.raise_request_exception = False


@pytest.fixture(params=["recipe", "plan"])
def content(request, user, recipe_factory, plan_factory):
    item = (recipe_factory if request.param == "recipe" else plan_factory)(creator=user)
    return item, reverse(request.param + "s", args=[item.pk, item.base.name])


@pytest.mark.parametrize("field,value", [("name", "Renamed"), ("notes", "Updated notes"),
    ("notes", ""), ("shared", True), ("shared", False), ("favorite", True), ("favorite", False)])
def test_owner_content_edits_persist_and_appear_on_reload(client, content, field, value):
    item, url = content
    response = client.patch(url, {field: value}, content_type="application/json")
    assert response.status_code == 200
    item.base.refresh_from_db(); assert getattr(item.base, field) == value
    response = client.get(reverse(item.base.type + "s", args=[item.pk, item.base.name]))
    assert response.status_code == 200
    if field in {"name", "notes"}: assert response.context["ele"][field] == value


@pytest.mark.parametrize("payload", [{}, [], "{", {"name": ""}, {"name": "x" * 101},
    {"shared": "false"}, {"favorite": "true"}, {"media": "not-a-list"}, {"unknown": "value"}])
def test_invalid_content_patches_leave_both_records_unchanged(client, content, payload):
    item, url = content
    before = UserCreation.objects.filter(pk=item.base_id).values().get()
    response = client.patch(url, payload, content_type="application/json")
    assert UserCreation.objects.filter(pk=item.base_id).values().get() == before
    assert response.status_code == 400


@pytest.mark.parametrize("shared", [False, True])
def test_non_owner_cannot_edit_or_delete_content_even_when_shared(client, user_factory, content, shared):
    item, url = content; item.base.shared = shared; item.base.save()
    client.force_login(user_factory())
    response = client.patch(url, {"notes": "Intrusion"}, content_type="application/json")
    assert response.status_code in {403, 404}
    assert client.delete(url).status_code in {403, 404}
    item.base.refresh_from_db(); assert item.base.notes == ""


def test_owner_delete_removes_the_base_and_specific_record(client, content):
    item, url = content; base_id = item.base_id; item_id = item.pk
    assert client.delete(url).status_code == 200
    assert not UserCreation.objects.filter(pk=base_id).exists()
    assert not type(item).objects.filter(pk=item_id).exists()


@pytest.mark.parametrize("kind", ["recipe", "plan"])
@pytest.mark.parametrize("method", ["get", "patch", "delete"])
def test_missing_content_ids_have_a_not_found_response(client, kind, method):
    response = getattr(client, method)(reverse(kind + "s", args=[999999, "Missing"]),
        {"notes": "No change"}, content_type="application/json")
    assert response.status_code == 404


@pytest.mark.parametrize("method", ["post", "patch", "delete"])
def test_content_mutations_require_authentication(client, content, method):
    item, _ = content
    client.logout()
    response = getattr(client, method)(reverse(item.base.type + "s", args=[item.pk, item.base.name]),
        {"name": "Anonymous write", "notes": "No change"}, content_type="application/json")
    assert response.status_code in {302, 401, 403, 404}
    item.base.refresh_from_db(); assert item.base.notes == ""


@pytest.mark.parametrize("serv", [0, -1, "bad"])
def test_recipe_servings_are_validated_at_the_write_boundary(client, user, recipe_factory, serv):
    recipe = recipe_factory(creator=user, serv=2)
    response = client.patch(reverse("recipes", args=[recipe.pk, recipe.base.name]), {"serv": serv}, content_type="application/json")
    recipe.refresh_from_db(); assert recipe.serv == 2
    assert response.status_code == 400


@pytest.mark.parametrize("minutes", [-1, "bad"])
def test_recipe_preparation_time_rejects_invalid_values(client, user, recipe_factory, minutes):
    recipe = recipe_factory(creator=user, prep_time=timedelta(minutes=15))
    response = client.patch(reverse("recipes", args=[recipe.pk, recipe.base.name]), {"prep_time": minutes}, content_type="application/json")
    recipe.refresh_from_db(); assert recipe.prep_time == timedelta(minutes=15)
    assert response.status_code == 400


@pytest.mark.parametrize("field,value,expected", [("serv", 3, 3), ("prep_time", 125, timedelta(minutes=125))])
def test_recipe_specific_edits_keep_their_units(client, user, recipe_factory, field, value, expected):
    recipe = recipe_factory(creator=user)
    response = client.patch(reverse("recipes", args=[recipe.pk, recipe.base.name]), {field: value}, content_type="application/json")
    recipe.refresh_from_db(); assert response.status_code == 200 and getattr(recipe, field) == expected


def test_structured_recipe_directions_are_saved_and_rendered(client, user, recipe_factory):
    recipe = recipe_factory(creator=user)
    directions = [{"type": "p", "content": "Cook slowly", "effects": []}]
    response = client.patch(reverse("recipes", args=[recipe.pk, recipe.base.name]), {"directions": directions}, content_type="application/json")
    assert response.status_code == 200
    assert "Cook slowly" in response.content.decode()
    recipe.refresh_from_db(); assert recipe.directions == directions


@pytest.mark.parametrize("field,value", [("goal", "Build strength"), ("goal", ""), ("duration", 4320)])
def test_plan_specific_edits_persist(client, user, plan_factory, field, value):
    plan = plan_factory(creator=user)
    response = client.patch(reverse("plans", args=[plan.pk, plan.base.name]), {field: value}, content_type="application/json")
    plan.refresh_from_db(); assert response.status_code == 200
    assert getattr(plan, field) == (timedelta(minutes=value) if field == "duration" else value)


@pytest.mark.parametrize("payload", [{"duration": 0}, {"duration": -1440}, {"type": "recipe"}, {"base_id": 999999}])
def test_invalid_plan_edits_are_rejected_without_changing_relations(client, user, plan_factory, recipe_factory, payload):
    plan = plan_factory(creator=user)
    if "base_id" in payload:
        payload = {"base_id": recipe_factory().base_id}
    before = Plan.objects.filter(pk=plan.pk).values().get()
    response = client.patch(reverse("plans", args=[plan.pk, plan.base.name]), payload, content_type="application/json")
    assert Plan.objects.filter(pk=plan.pk).values().get() == before
    assert response.status_code == 400


def test_clone_copies_a_nested_plan_tree_with_independent_ids_and_content(client, user, plan_factory):
    source = plan_factory(shared=True)
    root = PlanDetail.objects.create(plan=source, section="Week", order=1)
    child = PlanDetail.objects.create(plan=source, parent_section=root, section="Day", order=1,
        detail=[{"type": "p", "content": "Original", "effects": []}])
    grandchild = PlanDetail.objects.create(plan=source, parent_section=child, section="Meal", order=1)
    response = client.post(reverse("plans", args=[source.pk, source.base.name]))
    assert response.status_code == 200
    clone = Plan.objects.get(pk=response.json()["id"])
    assert clone.base.creator_id == user.pk
    sections = {section.section: section for section in clone.details.all()}
    assert len(sections) == 3
    assert sections["Day"].parent_section_id == sections["Week"].pk
    assert sections["Meal"].parent_section_id == sections["Day"].pk
    assert {section.pk for section in sections.values()}.isdisjoint({root.pk, child.pk, grandchild.pk})
    sections["Day"].detail[0]["content"] = "Changed"; sections["Day"].save()
    child.refresh_from_db(); assert child.detail[0]["content"] == "Original"


def test_repeated_clones_use_distinct_names_and_leave_the_source_unchanged(client, user, recipe_factory):
    source = recipe_factory(shared=True, ingredients=[{"name": "Rice", "amount": 1, "unit": "cup"}])
    url = reverse("recipes", args=[source.pk, source.base.name])
    first = client.post(url); second = client.post(url)
    assert first.status_code == second.status_code == 200
    copies = Recipe.objects.filter(base__creator=user)
    assert copies.count() == 2
    assert len(set(copies.values_list("base__name", flat=True))) == 2
    source.refresh_from_db(); assert source.ingredients[0]["name"] == "Rice"


def test_clone_failure_rolls_back_every_new_base_and_section(client, plan_factory, monkeypatch):
    source = plan_factory(shared=True)
    PlanDetail.objects.create(plan=source, section="Root")
    before = (UserCreation.objects.count(), PlanDetail.objects.count())
    monkeypatch.setattr("healthHub.helpers.creationManage.CreationHelper.clone_plan_details", Mock(side_effect=RuntimeError("copy failed")))
    response = client.post(reverse("plans", args=[source.pk, source.base.name]))
    assert response.status_code == 500
    assert (UserCreation.objects.count(), PlanDetail.objects.count()) == before


def test_section_edit_and_delete_use_the_owned_plan_tree(client, user, plan_factory):
    plan = plan_factory(creator=user)
    root = PlanDetail.objects.create(plan=plan, section="Root")
    child = PlanDetail.objects.create(plan=plan, parent_section=root, section="Child")
    url = reverse("sections", args=[child.pk])
    assert client.patch(url, {"section": "Renamed"}, content_type="application/json").status_code == 200
    detail = [{"type": "p", "content": "Structured detail", "effects": []}]
    assert client.patch(url, {"detail": detail}, content_type="application/json").status_code == 200
    child.refresh_from_db(); assert child.section == "Renamed" and child.detail == detail
    assert client.delete(reverse("sections", args=[root.pk])).status_code == 200
    assert not plan.details.exists()


def test_section_reparenting_rejects_an_ancestor_cycle(client, user, plan_factory):
    plan = plan_factory(creator=user)
    root = PlanDetail.objects.create(plan=plan, section="Root")
    child = PlanDetail.objects.create(plan=plan, parent_section=root, section="Child")
    response = client.patch(reverse("sections", args=[root.pk]), {"order": 1, "parentId": child.pk}, content_type="application/json")
    assert response.status_code == 400
    root.refresh_from_db(); assert root.parent_section_id is None


@pytest.mark.parametrize("payload", [{"order": 0}, {"order": -1}, {"section": ""}, {"detail": "not structured"}, {}, "{"])
def test_invalid_section_edits_leave_the_tree_unchanged(client, user, plan_factory, payload):
    plan = plan_factory(creator=user)
    root = PlanDetail.objects.create(plan=plan, section="Root", order=1)
    before = PlanDetail.objects.filter(pk=root.pk).values().get()
    response = client.patch(reverse("sections", args=[root.pk]), payload, content_type="application/json")
    assert PlanDetail.objects.filter(pk=root.pk).values().get() == before
    assert response.status_code == 400
