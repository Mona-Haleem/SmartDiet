from datetime import timedelta

import pytest
from django.test import RequestFactory
from django.urls import reverse

from healthHub.helpers.helpers import getLinksData, remove_Orphaned_refs
from healthHub.models import Plan, PlanDetail

pytestmark = [pytest.mark.django_db, pytest.mark.integration]


def test_cloning_a_shared_full_plan_copies_private_children_for_the_new_owner(client, user, user_factory, plan_factory):
    owner = user_factory()
    diet = plan_factory(creator=owner)
    exercise = plan_factory(creator=owner, category="exercise")
    full = plan_factory(creator=owner, category="full", shared=True, diet_plan_id=diet.pk, exercise_plan_id=exercise.pk)
    original = PlanDetail.objects.create(plan=diet, section="Private schedule", detail=[{"type": "p", "content": "Keep", "effects": []}])
    client.force_login(user)
    response = client.post(reverse("plans", args=[full.pk, full.base.name]))
    assert response.status_code == 200
    clone = Plan.objects.get(pk=response.json()["id"])
    linked = clone.linked_plan
    assert clone.base.creator_id == linked.diet_plan.base.creator_id == linked.exercise_plan.base.creator_id == user.pk
    assert linked.diet_plan_id != diet.pk and linked.exercise_plan_id != exercise.pk
    copied = linked.diet_plan.details.get(section=original.section)
    copied.detail = []; copied.save(); original.refresh_from_db()
    assert original.detail[0]["content"] == "Keep"
    diet.base.refresh_from_db(); assert diet.base.shared is False


def test_full_plan_clone_can_recover_a_legacy_missing_link_record(client, user, plan_factory):
    source = plan_factory(category="full", shared=True); source.linked_plan.delete()
    client.force_login(user)
    response = client.post(reverse("plans", args=[source.pk, source.base.name]))
    assert response.status_code == 200
    copied = Plan.objects.get(pk=response.json()["id"])
    assert copied.base.creator_id == user.pk
    assert copied.linked_plan.diet_plan_id is None and copied.linked_plan.exercise_plan_id is None


def test_clone_name_collisions_across_content_types_do_not_cause_a_server_error(client, user, plan_factory, recipe_factory):
    source = plan_factory(name="Shared name", shared=True)
    existing = recipe_factory(creator=user, name="Shared name")
    client.force_login(user); client.raise_request_exception = False
    response = client.post(reverse("plans", args=[source.pk, source.base.name]))
    assert response.status_code == 200
    clone = Plan.objects.get(pk=response.json()["id"])
    assert clone.base.name != existing.base.name


def test_cloned_internal_section_references_target_the_new_tree(client, user, plan_factory):
    source = plan_factory(shared=True)
    target = PlanDetail.objects.create(plan=source, section="Target", detail=[])
    PlanDetail.objects.create(plan=source, section="Reference", order=2, detail=[{
        "type": "ref", "refType": "detail", "eleId": target.pk, "planId": source.pk,
        "href": reverse("plans", args=[source.pk, source.base.name]) + f"#section-{target.pk}",
        "content": "Go to target", "effects": [], "color": "#333333",
    }])
    client.force_login(user)
    response = client.post(reverse("plans", args=[source.pk, source.base.name]))
    assert response.status_code == 200
    clone = Plan.objects.get(pk=response.json()["id"])
    ref = clone.details.get(section="Reference").detail[0]
    copied_target = clone.details.get(section="Target")
    assert ref["eleId"] == copied_target.pk and ref["planId"] == clone.pk
    assert ref["href"].endswith(f"#section-{copied_target.pk}")


@pytest.mark.parametrize("days,expected_sections", [(1, 2), (14, 17), (30, 31)])
def test_default_plan_sections_have_the_requested_number_of_days_and_valid_parents(user, plan_factory, days, expected_sections):
    plan = plan_factory(creator=user, duration=timedelta(days=days), create_default_sections=True)
    sections = list(plan.details.all())
    assert len(sections) == expected_sections
    assert all(section.parent_section is None or section.parent_section.plan_id == plan.pk for section in sections)
    assert len(plan.get_details()) == 1


def test_deleted_references_become_readable_text_without_mutating_the_source_document():
    original = {"type": "ref", "refType": "recipe", "eleId": 999999, "href": "/diet/collections/recipes/999999/Missing/",
                "content": "Original label", "effects": ["fw-bold"], "color": "#333333"}
    result = remove_Orphaned_refs([original])
    assert result[0]["type"] == "p" and result[0]["content"] == "Original label"
    assert original["type"] == "ref"


def test_reference_suggestions_include_only_owned_content_and_matching_plan_categories(user, plan_factory, recipe_factory):
    own_recipe = recipe_factory(creator=user)
    foreign_recipe = recipe_factory(shared=True)
    diet = plan_factory(creator=user)
    exercise = plan_factory(creator=user, category="exercise")
    own_detail = PlanDetail.objects.create(plan=diet, section="Diet")
    PlanDetail.objects.create(plan=exercise, section="Exercise")
    foreign = PlanDetail.objects.create(plan=plan_factory(), section="Foreign")
    request = RequestFactory().get("/"); request.user = user
    choices = getLinksData(request, diet)
    recipe_ids = {r["id"] for group in choices["recipe"].values() for r in group}
    detail_ids = {r["id"] for plan in choices["detail"] for r in plan["details"]}
    assert recipe_ids == {own_recipe.pk} and foreign_recipe.pk not in recipe_ids
    assert detail_ids == {own_detail.pk} and foreign.pk not in detail_ids


@pytest.mark.parametrize("href", ["javascript:alert(1)", "data:text/html,<script>alert(1)</script>"])
def test_section_writes_reject_executable_reference_urls(client, user, plan_factory, href):
    section = PlanDetail.objects.create(plan=plan_factory(creator=user), section="Safe", detail=[])
    client.force_login(user)
    response = client.patch(reverse("sections", args=[section.pk]), {"detail": [{
        "type": "ref", "refType": "link", "href": href, "content": "Click", "effects": [], "color": "#333333",
    }]}, content_type="application/json")
    assert response.status_code == 400
    section.refresh_from_db(); assert section.detail == []
