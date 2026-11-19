"""HTTP contracts for metric lifecycle, validation, isolation, and local-day values."""
from datetime import date, timedelta
from unittest.mock import Mock

import pytest
from django.urls import reverse

from core.models import DailyAchivedMetrics, Metric, TrackedMetrics, UserLog

pytestmark = [pytest.mark.django_db, pytest.mark.integration]
TODAY = date(2026, 11, 17)


@pytest.fixture(autouse=True)
def local_day(client, user, freeze_time):
    freeze_time("2026-11-17T12:00:00+00:00")
    client.force_login(user)


def counts():
    return tuple(model.objects.count() for model in (Metric, TrackedMetrics, UserLog, DailyAchivedMetrics))


def create(client, **changes):
    payload = {"name": "Water", "type": "daily", "target": 2000, "start": 0,
               "goal": "Drink regularly", "plan_type": "diet", "date": TODAY.isoformat()}
    return client.post(reverse("create-metric"), {**payload, **changes}, content_type="application/json")


@pytest.mark.parametrize("kind,start,target,options,value", [
    ("daily", 0, 2000, [], 1200),
    ("continues", 80, 70, [], 75),
    ("boolean", False, True, [], True),
    ("scale", 1, 5, [], 4),
    ("category", "Calm", ["Calm"], ["Calm", "Stressed"], "Stressed"),
])
def test_each_metric_type_round_trips_through_real_routes(client, user, plan_factory, kind, start, target, options, value):
    plan = plan_factory(creator=user)
    log = UserLog.objects.create(user=user, plan=plan, date=TODAY)
    response = create(client, type=kind, start=start, target=target, options=options, metricType="toPlan")
    assert response.status_code == 200
    tracker = TrackedMetrics.objects.get(pk=response.json()["metric"]["id"])
    assert tracker.linkedPlan_id == plan.pk
    assert tracker.metric.type == kind
    assert tracker.start == start
    response = client.patch(reverse("update-metric-value", args=[tracker.pk]), {
        "value": value, "date": TODAY.isoformat(), "plan_type": "diet",
    }, content_type="application/json")
    assert response.status_code == 200
    entry = DailyAchivedMetrics.objects.get(log=log, metric=tracker)
    assert entry.value == value
    assert response.json()["score"] == entry.calculate_score()
    day = client.get(reverse("dayData"), {"date": TODAY.isoformat(), "type": "diet"}).json()
    item = next(item for item in day["metrics"] if item["id"] == tracker.pk)
    assert item["value"] == value
    assert item["target"] == target


def test_creating_a_plan_metric_uses_the_requested_slot(client, user, plan_factory):
    exercise = plan_factory(creator=user, category="exercise")
    diet = plan_factory(creator=user)
    wrong_log = UserLog.objects.create(user=user, plan=exercise, date=TODAY)
    right_log = UserLog.objects.create(user=user, plan=diet, date=TODAY)
    response = create(client, metricType="toPlan")
    assert response.status_code == 200
    tracker_id = response.json()["metric"]["id"]
    assert DailyAchivedMetrics.objects.filter(log=right_log, metric_id=tracker_id).exists()
    assert not DailyAchivedMetrics.objects.filter(log=wrong_log, metric_id=tracker_id).exists()


def test_existing_metric_definition_can_be_reused_without_creating_another_base(client, user):
    base = Metric.objects.create(user=user, name="Mood", type="category", options=["Calm", "Stressed"])
    response = create(client, name="Mood", type="category", target=["Calm"], options=base.options,
                      existingMetricId=base.pk)
    assert response.status_code == 200
    assert Metric.objects.filter(user=user, name="Mood").count() == 1
    assert TrackedMetrics.objects.get(pk=response.json()["metric"]["id"]).metric_id == base.pk


@pytest.mark.parametrize("payload", [
    {"name": "", "target": 10}, {"type": "unknown"}, {"type": "daily", "target": -1},
    {"type": "scale", "start": 6}, {"type": "category", "options": "Calm"},
    {"type": "category", "options": ["Calm"], "target": ["Missing"]},
    {"date": "not-a-date"}, {"date": "2026-02-30"}, {"plan_type": "unknown"},
])
def test_invalid_metric_creation_is_a_client_error_and_is_atomic(client, payload):
    before = counts()
    response = create(client, **payload)
    assert counts() == before, "Rejected creation left partial metric/log records"
    assert response.status_code == 400


@pytest.mark.parametrize("age", [31, -1])
def test_creating_metrics_cannot_modify_out_of_window_logs(client, user, plan_factory, age):
    log = UserLog.objects.create(user=user, plan=plan_factory(creator=user), date=TODAY - timedelta(days=age))
    before = counts()
    response = create(client, date=log.date.isoformat())
    assert counts() == before
    assert response.status_code in {400, 403}


def test_new_metric_creation_rolls_back_when_tracking_insert_fails(client, monkeypatch):
    monkeypatch.setattr(TrackedMetrics.objects, "create", Mock(side_effect=RuntimeError("write failed")))
    response = create(client)
    assert response.status_code == 500
    assert not Metric.objects.filter(name="Water").exists()


@pytest.mark.parametrize("method", ["patch", "put"])
def test_metric_configuration_edits_persist_supported_fields(client, user, metric_factory, method):
    tracker = metric_factory(user=user)
    payload = {"name": "Energy", "type": "category", "target": ["High"], "goal": "Recover",
               "start": "Low", "isPositive": False, "options": ["Low", "High"]}
    response = getattr(client, method)(reverse("update-metric", args=[tracker.pk]), payload,
                                      content_type="application/json")
    assert response.status_code == 200
    tracker.refresh_from_db(); tracker.metric.refresh_from_db()
    assert tracker.metric.name == "Energy"
    assert tracker.metric.type == "category"
    assert tracker.metric.options == ["Low", "High"]
    assert (tracker.target, tracker.goal, tracker.start, tracker.isPostive) == (["High"], "Recover", "Low", False)


@pytest.mark.parametrize("payload", [{"type": "invalid"}, {"name": ""}, {"target": -1}, {"isPositive": "false"}])
def test_invalid_configuration_edits_preserve_both_base_and_tracker(client, user, metric_factory, payload):
    tracker = metric_factory(user=user, goal="Original")
    before = (tracker.metric.name, tracker.metric.type, tracker.target, tracker.isPostive)
    response = client.patch(reverse("update-metric", args=[tracker.pk]), {"goal": "Changed", **payload},
                            content_type="application/json")
    tracker.refresh_from_db(); tracker.metric.refresh_from_db()
    assert (tracker.metric.name, tracker.metric.type, tracker.target, tracker.isPostive) == before
    assert tracker.goal == "Original"
    assert response.status_code == 400


@pytest.mark.parametrize("endpoint,method", [
    ("update-metric", "patch"), ("update-metric-value", "patch"),
    ("toggle-metric", "patch"), ("delete-metric", "delete"),
])
def test_missing_metric_ids_return_not_found(client, endpoint, method):
    response = getattr(client, method)(reverse(endpoint, args=[999999]),
        {"value": 20, "plan_type": "diet", "date": TODAY.isoformat()}, content_type="application/json")
    assert response.status_code == 404


@pytest.mark.parametrize("endpoint,method,payload", [
    ("create-metric", "post", []), ("update-feedback", "post", []),
    ("set-current-plan", "post", []), ("create-metric", "post", "{"),
    ("update-feedback", "post", "{"), ("set-current-plan", "post", "{"),
])
def test_malformed_requests_are_client_errors_without_partial_writes(client, endpoint, method, payload):
    before = counts()
    response = getattr(client, method)(reverse(endpoint), payload, content_type="application/json")
    assert counts() == before
    assert response.status_code == 400


@pytest.mark.parametrize("endpoint,method", [
    ("create-metric", "get"), ("update-feedback", "get"), ("set-current-plan", "get"),
    ("inactive-metrics", "post"), ("cleanup-metrics", "get"),
])
def test_metric_routes_reject_unsupported_http_methods(client, endpoint, method):
    assert getattr(client, method)(reverse(endpoint)).status_code == 405


@pytest.mark.parametrize("kind,value", [("daily", "NaN"), ("daily", "Infinity"), ("continues", "bad"),
    ("boolean", "maybe"), ("category", "Missing"), ("category", ["Calm"]), ("scale", 2.5)])
def test_invalid_metric_values_are_rejected_before_creating_logs(client, user, plan_factory, metric_factory, kind, value):
    tracker = metric_factory(user=user, type=kind, linkedPlan=plan_factory(creator=user), options=["Calm"], target=10)
    before = counts()
    response = client.patch(reverse("update-metric-value", args=[tracker.pk]),
        {"value": value, "plan_type": "diet", "date": TODAY.isoformat()}, content_type="application/json")
    assert counts() == before
    assert response.status_code == 400


@pytest.mark.parametrize("payload", [{"plan_type": "diet"}, {"value": 0}, {"value": 0, "plan_type": "bad"}])
def test_metric_value_requires_a_value_and_supported_plan_type(client, user, metric_factory, payload):
    tracker = metric_factory(user=user)
    assert client.patch(reverse("update-metric-value", args=[tracker.pk]), payload,
                        content_type="application/json").status_code == 400
    assert not UserLog.objects.exists()


def test_saving_without_any_matching_plan_returns_not_found(client, user, metric_factory):
    tracker = metric_factory(user=user)
    response = client.patch(reverse("update-metric-value", args=[tracker.pk]),
        {"value": 12, "plan_type": "diet"}, content_type="application/json")
    assert response.status_code == 404
    assert not UserLog.objects.exists()


@pytest.mark.parametrize("linked", [False, True])
def test_value_save_creates_one_log_and_reports_creation_then_update(client, user, plan_factory, metric_factory, linked):
    plan = plan_factory(creator=user)
    tracker = metric_factory(user=user, linkedPlan=plan if linked else None)
    if not linked:
        UserLog.objects.create(user=user, plan=plan, date=TODAY - timedelta(days=1))
    payload = {"value": 12, "plan_type": "diet", "date": TODAY.isoformat()}
    url = reverse("update-metric-value", args=[tracker.pk])
    first = client.patch(url, payload, content_type="application/json")
    second = client.patch(url, {**payload, "value": 15}, content_type="application/json")
    assert first.status_code == second.status_code == 200
    assert first.json()["log_created"] is True
    assert second.json()["log_created"] is False
    assert UserLog.objects.filter(user=user, date=TODAY).count() == 1
    assert DailyAchivedMetrics.objects.get(log__date=TODAY, metric=tracker).value == 15


@pytest.mark.parametrize("kind,value", [("daily", 1234), ("boolean", False), ("scale", 4), ("category", "Calm")])
def test_global_metric_has_one_shared_value_across_plan_views(client, user, plan_factory, metric_factory, kind, value):
    tracker = metric_factory(user=user, type=kind, options=["Calm", "Stressed"])
    for category in ("diet", "exercise"):
        plan = plan_factory(creator=user, category=category)
        log = UserLog.objects.create(user=user, plan=plan, date=TODAY)
        initial = {"daily": 0, "boolean": True, "scale": 1, "category": "Stressed"}[kind]
        DailyAchivedMetrics.objects.create(log=log, metric=tracker, value=initial)
    response = client.patch(reverse("update-metric-value", args=[tracker.pk]),
        {"value": value, "plan_type": "diet", "date": TODAY.isoformat()}, content_type="application/json")
    assert response.status_code == 200
    for category in ("diet", "exercise"):
        day = client.get(reverse("dayData"), {"date": TODAY.isoformat(), "type": category}).json()
        assert next(item for item in day["metrics"] if item["id"] == tracker.pk)["value"] == value


def test_value_failure_rolls_back_a_new_log_and_its_initialized_metrics(client, user, plan_factory, metric_factory, monkeypatch):
    tracker = metric_factory(user=user, linkedPlan=plan_factory(creator=user))
    before = counts()
    monkeypatch.setattr(DailyAchivedMetrics.objects, "get_or_create", Mock(side_effect=RuntimeError("write failed")))
    response = client.patch(reverse("update-metric-value", args=[tracker.pk]),
        {"value": 12, "plan_type": "diet"}, content_type="application/json")
    assert response.status_code == 500
    assert counts() == before


def test_feedback_uses_the_requested_plan_slot(client, user, plan_factory):
    diet = UserLog.objects.create(user=user, plan=plan_factory(creator=user), date=TODAY, feedback="Diet")
    exercise = UserLog.objects.create(user=user, plan=plan_factory(creator=user, category="exercise"), date=TODAY, feedback="Exercise")
    response = client.post(reverse("update-feedback"), {"date": TODAY.isoformat(), "plan_type": "exercise", "feedback": "Updated"}, content_type="application/json")
    assert response.status_code == 200
    diet.refresh_from_db(); exercise.refresh_from_db()
    assert diet.feedback == "Diet"
    assert exercise.feedback == "Updated"


def test_feedback_can_be_cleared_and_saved_on_an_empty_day(client, user):
    payload = {"date": TODAY.isoformat(), "plan_type": "diet", "feedback": "Note"}
    assert client.post(reverse("update-feedback"), payload, content_type="application/json").status_code == 200
    assert client.post(reverse("update-feedback"), {**payload, "feedback": ""}, content_type="application/json").status_code == 200
    assert UserLog.objects.get(user=user, date=TODAY).feedback == ""


def test_toggling_and_listing_inactive_metrics_is_user_scoped(client, user, metric_factory, plan_factory):
    own = metric_factory(user=user, linkedPlan=plan_factory(creator=user))
    foreign = metric_factory(isActive=False)
    url = reverse("toggle-metric", args=[own.pk])
    assert client.patch(url).json()["isActive"] is False
    listed = client.get(reverse("inactive-metrics")).json()["metrics"]
    assert [item["id"] for item in listed] == [own.pk]
    assert listed[0]["linkedPlan"] == own.linkedPlan.base.name
    assert client.patch(url).json()["isActive"] is True
    foreign.refresh_from_db(); assert foreign.isActive is False


def test_deleting_an_unused_tracker_preserves_a_shared_definition(client, user, metric_factory):
    first = metric_factory(user=user)
    second = TrackedMetrics.objects.create(metric=first.metric, target=200)
    base_id = first.metric_id
    response = client.delete(reverse("delete-metric", args=[first.pk]))
    assert response.status_code == 200 and response.json()["deleted"] is True
    assert not TrackedMetrics.objects.filter(pk=first.pk).exists()
    assert Metric.objects.filter(pk=base_id).exists()
    assert client.delete(reverse("delete-metric", args=[second.pk])).status_code == 200
    assert not Metric.objects.filter(pk=base_id).exists()


def test_cleanup_removes_only_unreferenced_inactive_metrics(client, user, metric_factory, plan_factory):
    unused = metric_factory(user=user, isActive=False)
    active = metric_factory(user=user)
    historical = metric_factory(user=user, isActive=False)
    foreign = metric_factory(isActive=False)
    log = UserLog.objects.create(user=user, plan=plan_factory(creator=user), date=TODAY)
    entry = DailyAchivedMetrics.objects.create(log=log, metric=historical, value=20)
    response = client.post(reverse("cleanup-metrics"))
    assert response.status_code == 200 and response.json()["deleted_count"] == 1
    assert not TrackedMetrics.objects.filter(pk=unused.pk).exists()
    assert TrackedMetrics.objects.filter(pk__in=[active.pk, historical.pk, foreign.pk]).count() == 3
    entry.refresh_from_db(); assert entry.value == 20
