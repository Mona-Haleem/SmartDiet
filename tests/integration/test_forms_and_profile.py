from datetime import date, timedelta
from io import BytesIO
from unittest.mock import Mock

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image

from healthHub.forms import BaseCreationForm, PlanForm, RecipeForm
from users.models import MedicalIssues, UserRestriction

pytestmark = [pytest.mark.django_db, pytest.mark.integration]


@pytest.mark.parametrize("hours,minutes,serv", [(0, 0, 1), (2, 59, 3), (None, None, 1)])
def test_recipe_form_preserves_preparation_units_and_defaults(hours, minutes, serv):
    form = RecipeForm({"prep_time_hours": hours, "prep_time_minutes": minutes, "serv": serv, "ingredients": []})
    assert form.is_valid(), form.errors
    assert form.cleaned_data["prep_time"] == timedelta(hours=hours or 0, minutes=minutes or 0)
    assert form.cleaned_data["ingredients"] == [] and form.cleaned_data["directions"] == []


@pytest.mark.parametrize("payload", [{"serv": 0}, {"serv": -1}, {"prep_time_hours": -1},
    {"prep_time_minutes": 60}, {"ingredients": {}}, {"ingredients": "not JSON"},
    {"ingredients": [{"name": "Rice", "amount": "bad", "unit": "g"}]}])
def test_recipe_form_reports_invalid_fields_without_raising(payload):
    form = RecipeForm({"serv": 1, "ingredients": [], **payload})
    assert not form.is_valid()
    assert form.errors


def test_ingredient_deduplication_is_case_insensitive_and_uses_structured_values(monkeypatch):
    nutrition = Mock(return_value={"calories": 100})
    monkeypatch.setattr("healthHub.forms.get_nutrition_info_usda", nutrition)
    form = RecipeForm({"serv": 1, "ingredients": [
        {"name": "Rice", "unit": "g", "amount": 10}, {"name": "rice", "unit": "G", "amount": 10},
        {"name": "Rice", "unit": "g", "amount": 20},
    ]})
    assert form.is_valid(), form.errors
    assert [item["amount"] for item in form.cleaned_data["ingredients"]] == [10, 20]
    nutrition.assert_called_once_with(form.cleaned_data["ingredients"])
    assert form.cleaned_data["nutrients"]["calories"] == 100


@pytest.mark.parametrize("ingredients", [["invalid"], [{"unit": "g", "amount": 2}],
    [{"name": "Rice", "unit": "g", "amount": -1}], [{"name": "Rice", "unit": "g", "amount": "NaN"}]])
def test_malformed_ingredient_items_cannot_be_silently_saved(monkeypatch, ingredients):
    monkeypatch.setattr("healthHub.forms.get_nutrition_info_usda", Mock(return_value={}))
    form = RecipeForm({"serv": 1, "ingredients": ingredients})
    assert not form.is_valid()


@pytest.mark.parametrize("data,days", [({}, 7), ({"duration_days": 3}, 3),
    ({"duration_preset": "14", "duration_days": 3}, 14), ({"duration_preset": "30"}, 30)])
def test_plan_duration_form_uses_custom_days_or_the_selected_preset(data, days):
    form = PlanForm(data); assert form.is_valid(), form.errors
    assert form.cleaned_data["duration"] == timedelta(days=days)


@pytest.mark.parametrize("data", [{"duration_days": 0}, {"duration_days": -1},
    {"duration_days": "bad"}, {"duration_preset": "999"}, {"diet_plan_id": "bad"}])
def test_plan_duration_and_link_fields_reject_invalid_values(data):
    form = PlanForm(data); assert not form.is_valid()


def test_duplicate_creation_names_are_resolved_without_overwriting_an_existing_item(user, recipe_factory):
    original = recipe_factory(creator=user, name="Evening meal")
    recipe_factory(creator=user, name="Evening (0)")
    form = BaseCreationForm({"name": "Evening meal", "type": "recipe", "category": "Dinner"}, user=user)
    assert form.is_valid(), form.errors
    assert form.cleaned_data["name"] not in {"Evening meal", "Evening (0)"}
    original.base.refresh_from_db(); assert original.base.name == "Evening meal"


@pytest.mark.parametrize("payload", [{"name": ""}, {"name": "x" * 101}, {"type": "bad"},
    {"type": "plan", "category": "Breakfast"}])
def test_base_creation_form_rejects_invalid_contract_fields(user, payload):
    form = BaseCreationForm({"name": "Created", "type": "recipe", "category": "Dinner", **payload}, user=user)
    assert not form.is_valid()


@pytest.mark.parametrize("field,value", [("weight", -1), ("height", 0), ("fluid_intake", "NaN"),
    ("sleep_duration", "Infinity"), ("gender", "invalid"), ("activity_level", "invalid"),
    ("sleep_quality", 9), ("birth_date", "2026-02-30"), ("birth_date", "2026-11-18")])
def test_invalid_profile_fields_do_not_partially_apply_other_valid_fields(client, user, freeze_time, field, value):
    freeze_time("2026-11-17T12:00:00+00:00"); client.force_login(user)
    before = user.__class__.objects.filter(pk=user.pk).values().get()
    payload = {"weight": 72, field: value}
    response = client.patch(reverse("profileUpdate"), payload, content_type="application/json")
    assert response.status_code == 400
    assert user.__class__.objects.filter(pk=user.pk).values().get() == before


@pytest.mark.parametrize("username", ["", "x" * 151, "bad/name", None])
def test_username_validation_does_not_persist_invalid_values(client, user, username):
    client.force_login(user); original = user.username; client.raise_request_exception = False
    response = client.patch(reverse("profileUpdate"), {"username": username}, content_type="application/json")
    user.refresh_from_db(); assert user.username == original
    assert response.status_code == 400


def test_username_update_rejects_collisions_and_preserves_health_fields(client, user, user_factory):
    other = user_factory(username="AlreadyTaken"); client.force_login(user)
    assert client.patch(reverse("profileUpdate"), {"username": other.username}, content_type="application/json").status_code == 400
    response = client.patch(reverse("profileUpdate"), {"username": "Renamed", "weight": 70}, content_type="application/json")
    assert response.status_code == 400
    user.refresh_from_db(); assert user.weight == 50
    assert client.patch(reverse("profileUpdate"), {"username": "Renamed"}, content_type="application/json").status_code == 200
    user.refresh_from_db(); assert user.username == "Renamed"


def test_valid_avatar_upload_is_persisted_in_the_configured_storage(client, user):
    client.force_login(user)
    image = BytesIO(); Image.new("RGB", (2, 2), "white").save(image, format="PNG")
    response = client.post(reverse("profileUpdate"), {"avatar_img": SimpleUploadedFile("avatar.png", image.getvalue(), content_type="image/png")})
    assert response.status_code == 200
    user.refresh_from_db(); assert user.avatar_img.storage.exists(user.avatar_img.name)
    assert response.json()["image_url"] == user.avatar_img.url


def test_profile_uses_storage_existence_instead_of_local_disk_for_avatar_display(client, user):
    client.force_login(user)
    image = BytesIO(); Image.new("RGB", (2, 2), "white").save(image, format="PNG")
    user.avatar_img.save("stored.png", SimpleUploadedFile("stored.png", image.getvalue()), save=True)
    response = client.get(reverse("profile"))
    assert response.status_code == 200
    assert response.context["user"]["avatar_img"] == user.avatar_img.url


def test_profile_reload_preserves_choice_values_used_by_the_forms(client, user):
    client.force_login(user)
    response = client.patch(reverse('profileUpdate'), {'activity_level': 'active', 'sleep_quality': 3}, content_type='application/json')
    assert response.status_code == 200
    profile = client.get(reverse('profile')).context['user']
    assert (profile['activity_level'], profile['sleep_quality']) == ('active', 3)


def test_an_image_mime_type_does_not_make_arbitrary_bytes_a_valid_avatar(client, user):
    client.force_login(user)
    response = client.post(reverse("profileUpdate"), {"avatar_img": SimpleUploadedFile("broken.png", b"not an image", content_type="image/png")})
    assert response.status_code == 400
    user.refresh_from_db(); assert not user.avatar_img


def test_medical_restrictions_store_and_update_the_selected_issue(client, user):
    client.force_login(user)
    issue = MedicalIssues.objects.create(name_en="Allergy", name_ar="Allergy", category="Food", description_en="Avoid", description_ar="Avoid")
    url = reverse("restrictions", args=["new"])
    response = client.post(url, {"name": issue.pk, "type": "medical", "remark": "Check"}, content_type="application/json")
    assert response.status_code == 200
    restriction = UserRestriction.objects.get(pk=response.json()["restriction"]["id"])
    assert restriction.ref_id == issue.pk and restriction.name == issue.name_en
    response = client.put(reverse("restrictions", args=[restriction.pk]), {"name": "Budget", "type": "budget", "remark": "Updated"}, content_type="application/json")
    assert response.status_code == 200
    restriction.refresh_from_db(); assert restriction.type == "budget" and restriction.ref_id is None


@pytest.mark.parametrize("payload", [{"name": "", "type": "other"}, {"name": "Bad", "type": "invalid"},
    {"name": 999999, "type": "medical"}, {"name": "bad", "type": "medical"}, []])
def test_invalid_restrictions_have_client_errors_and_do_not_create_rows(client, user, payload):
    client.force_login(user); client.raise_request_exception = False
    response = client.post(reverse("restrictions", args=["new"]), payload, content_type="application/json")
    assert not UserRestriction.objects.filter(user=user).exists()
    assert response.status_code in {400, 404}
