from io import BytesIO
from unittest.mock import Mock

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client
from django.urls import reverse
from PIL import Image

from healthHub.models import PlanDetail
from users.models import UserRestriction

pytestmark = [pytest.mark.django_db, pytest.mark.integration, pytest.mark.security]


@pytest.mark.parametrize("field,value", [
    ("is_staff", True), ("is_superuser", True),
    ("is_active", False), ("password", "unhashed-attacker-password"),
])
def test_profile_cannot_change_privileged_account_fields(client, user, field, value):
    client.force_login(user)
    original = getattr(user, field)
    response = client.patch(reverse("profileUpdate"), {field: value}, content_type="application/json")
    user.refresh_from_db()
    assert getattr(user, field) == original, f"Profile PATCH changed protected field {field}"
    assert response.status_code in {400, 403}


def test_profile_updates_approved_health_fields(client, user):
    client.force_login(user)
    response = client.patch(reverse("profileUpdate"), {"weight": 72.5}, content_type="application/json")
    assert response.status_code == 200
    user.refresh_from_db()
    assert float(user.weight) == 72.5


def test_profile_does_not_expose_another_users_restrictions(client, user, user_factory):
    own = UserRestriction.objects.create(user=user, name="Own allergy", type="other")
    foreign = UserRestriction.objects.create(user=user_factory(), name="Private diagnosis", type="other")
    client.force_login(user)
    response = client.get(reverse("profile"))
    assert response.status_code == 200
    ids = {item["id"] for item in response.context["user"]["restrictions"]}
    assert own.id in ids
    assert foreign.id not in ids
    assert "Own allergy" in response.content.decode()
    assert "Private diagnosis" not in response.content.decode()


@pytest.mark.parametrize("method", ["put", "delete"])
def test_restriction_mutations_enforce_owner(client, user, user_factory, method):
    restriction = UserRestriction.objects.create(user=user_factory(), name="Private allergy", type="other")
    client.force_login(user)
    response = getattr(client, method)(
        reverse("restrictions", args=[restriction.id]),
        {"name": "Changed by stranger", "type": "other", "remark": "changed"},
        content_type="application/json",
    )
    assert UserRestriction.objects.filter(pk=restriction.pk, name="Private allergy").exists()
    assert response.status_code in {403, 404}


def test_owner_can_create_update_and_delete_a_restriction(client, user):
    client.force_login(user)
    response = client.post(reverse("restrictions", args=["new"]),
        {"name": "Peanuts", "type": "other"}, content_type="application/json")
    assert response.status_code == 200
    restriction = UserRestriction.objects.get(pk=response.json()["restriction"]["id"])
    assert restriction.user_id == user.id
    response = client.put(reverse("restrictions", args=[restriction.pk]),
        {"name": "Peanuts", "type": "other", "remark": "avoid"}, content_type="application/json")
    assert response.status_code == 200
    restriction.refresh_from_db()
    assert restriction.remark == "avoid"
    assert client.delete(reverse("restrictions", args=[restriction.pk])).status_code == 200
    assert not UserRestriction.objects.filter(pk=restriction.pk).exists()


@pytest.mark.parametrize("shared", [False, True], ids=["private", "shared"])
@pytest.mark.parametrize("method,payload", [
    ("patch", {"section": "Foreign rename"}),
    ("delete", {}),
    ("post", {"section": "Foreign child", "targetRelation": "parent", "order": 1}),
])
def test_section_mutations_enforce_plan_owner(client, user, plan_factory, shared, method, payload):
    plan = plan_factory(shared=shared)
    root = PlanDetail.objects.create(plan=plan, section="Private root", order=1)
    client.force_login(user)
    response = getattr(client, method)(reverse("sections", args=[root.pk]), payload,
        content_type="application/json")
    assert PlanDetail.objects.filter(pk=root.pk, section="Private root").exists()
    assert list(plan.details.values_list("section", flat=True)) == ["Private root"]
    assert response.status_code in {403, 404}


def test_reparenting_cannot_target_a_foreign_plan(client, user, plan_factory):
    own = plan_factory(creator=user)
    foreign = plan_factory()
    child = PlanDetail.objects.create(plan=own, section="Own section")
    target = PlanDetail.objects.create(plan=foreign, section="Foreign section")
    client.force_login(user)
    response = client.patch(reverse("sections", args=[child.pk]),
        {"order": 1, "parentId": target.pk}, content_type="application/json")
    child.refresh_from_db()
    assert child.parent_section_id is None
    assert response.status_code in {400, 403, 404}


@pytest.mark.parametrize("method", ["post", "patch"])
def test_media_mutations_reject_foreign_owner_before_cloud_calls(
    client, user, plan_factory, monkeypatch, method
):
    url = "https://res.cloudinary.com/test/image/upload/v1/test/photo.png"
    plan = plan_factory(media=[url])
    upload = Mock(return_value={"secure_url": url, "public_id": "test/photo"})
    destroy = Mock(return_value={"result": "ok"})
    monkeypatch.setattr("healthHub.views.cloudinary.uploader.upload", upload)
    monkeypatch.setattr("healthHub.views.cloudinary.uploader.destroy", destroy)
    client.force_login(user)
    endpoint = reverse("media", kwargs={"type": "plan", "id": plan.base_id})
    if method == "post":
        image = BytesIO()
        Image.new("RGB", (2, 2), "white").save(image, format="PNG")
        response = client.post(endpoint, {"media": SimpleUploadedFile("pixel.png", image.getvalue(), content_type="image/png")})
    else:
        response = client.patch(endpoint, {"mediaUrl": url}, content_type="application/json")
    upload.assert_not_called()
    destroy.assert_not_called()
    plan.base.refresh_from_db()
    assert plan.base.media == [url]
    assert response.status_code in {403, 404}


@pytest.mark.parametrize("endpoint,method", [
    ("profile", "get"), ("profileUpdate", "patch"),
    ("create-metric", "post"), ("set-current-plan", "post"),
    ("dayData", "get"), ("period-progress", "get"), ("assignedPlans", "get"),
])
def test_protected_routes_redirect_anonymous_users(client, endpoint, method):
    response = getattr(client, method)(reverse(endpoint))
    assert response.status_code == 302
    assert "/diet/users/login" in response["Location"]


def test_profile_patch_requires_csrf_even_for_authenticated_users(user):
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)
    response = client.patch(reverse("profileUpdate"), {"weight": 75}, content_type="application/json")
    assert response.status_code == 403
    user.refresh_from_db()
    assert float(user.weight) == 50


def test_valid_csrf_token_allows_profile_patch(user):
    client = Client(enforce_csrf_checks=True)
    client.force_login(user)
    assert client.get(reverse("profile")).status_code == 200
    token = client.cookies["csrftoken"].value
    response = client.patch(reverse("profileUpdate"), {"weight": 75},
        content_type="application/json", HTTP_X_CSRFTOKEN=token)
    assert response.status_code == 200
    user.refresh_from_db()
    assert float(user.weight) == 75
