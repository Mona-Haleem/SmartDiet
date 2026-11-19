from datetime import date, timedelta

import pytest
from django.urls import reverse

from core.helpers.assigned_plans import set_plan, update_active_metrics
from core.models import DailyAchivedMetrics, UserLog

pytestmark = [pytest.mark.django_db, pytest.mark.integration]
TODAY = date(2026, 11, 17)


@pytest.fixture(autouse=True)
def fixed_day(client, user, freeze_time):
    freeze_time("2026-11-17T12:00:00+00:00"); client.force_login(user)


@pytest.mark.parametrize("kind,start,expected", [("continues", 80, 80), ("daily", 99, 0),
    ("boolean", False, False), ("scale", 3, 3), ("category", "", "no entry")])
def test_an_unassigned_historical_day_has_type_correct_defaults(client, user, metric_factory, kind, start, expected):
    tracker = metric_factory(user=user, type=kind, start=start, options=["Calm", "Stressed"])
    day = TODAY - timedelta(days=2)
    response = client.get(reverse("dayData"), {"date": day.isoformat(), "type": "diet"})
    assert response.status_code == 200
    item = next(item for item in response.json()["metrics"] if item["id"] == tracker.pk)
    assert item["value"] == expected
    if kind in {"scale", "category"}: assert item["options"]
    assert not UserLog.objects.filter(user=user, date=day).exists(), "Reading old history must not create records"


@pytest.mark.parametrize("kind,value", [("daily", 0), ("boolean", False), ("scale", 4), ("category", "Calm")])
def test_global_values_remain_readable_when_only_the_other_plan_slot_exists(client, user, plan_factory, metric_factory, kind, value):
    tracker = metric_factory(user=user, type=kind, options=["Calm", "Stressed"])
    day = TODAY - timedelta(days=1)
    other_log = UserLog.objects.create(user=user, plan=plan_factory(creator=user, category="exercise"), date=day)
    DailyAchivedMetrics.objects.create(log=other_log, metric=tracker, value=value)
    data = client.get(reverse("dayData"), {"date": day.isoformat(), "type": "diet"}).json()
    assert next(item for item in data["metrics"] if item["id"] == tracker.pk)["value"] == value


def test_continuous_defaults_carry_the_latest_earlier_value_without_borrowing_future_data(client, user, metric_factory, plan_factory):
    tracker = metric_factory(user=user, type="continues", start=80)
    plan = plan_factory(creator=user)
    for day, value in ((TODAY - timedelta(days=3), 77), (TODAY, 70)):
        log = UserLog.objects.create(user=user, plan=plan, date=day)
        DailyAchivedMetrics.objects.create(log=log, metric=tracker, value=value)
    data = client.get(reverse("dayData"), {"date": (TODAY - timedelta(days=2)).isoformat(), "type": "diet"}).json()
    assert data["metrics"][0]["value"] == 77


def test_today_read_initializes_missing_history_from_the_current_plan(client, user, plan_factory):
    plan = plan_factory(creator=user)
    UserLog.objects.create(user=user, plan=plan, date=TODAY - timedelta(days=1))
    data = client.get(reverse("dayData"), {"date": TODAY.isoformat(), "type": "diet"}).json()
    assert data["planId"] == plan.pk
    assert UserLog.objects.filter(user=user, plan=plan, date=TODAY).count() == 1


@pytest.mark.parametrize("with_history", [False, True])
def test_progress_page_calendar_starts_at_the_first_log_or_local_today(client, user, plan_factory, with_history):
    first = TODAY - timedelta(days=20)
    if with_history: UserLog.objects.create(user=user, plan=plan_factory(creator=user), date=first)
    response = client.get(reverse("logs"))
    assert response.status_code == 200
    assert response.context["startDate"] == (first if with_history else TODAY).isoformat()


def test_calendar_ignores_feedback_only_logs(client, user):
    UserLog.objects.create(user=user, date=TODAY, feedback="No plan")
    assert client.get(reverse("assignedPlans"), {"year": 2026, "month": 11}).json() == {"plans": {}}


def test_a_full_plan_with_no_link_record_returns_a_clear_missing_plan_response(client, user, plan_factory):
    full = plan_factory(creator=user, category="full"); full.linked_plan.delete()
    UserLog.objects.create(user=user, plan=full, date=TODAY)
    assert client.get(reverse("dayData"), {"date": TODAY.isoformat(), "type": "diet"}).status_code == 404


@pytest.mark.parametrize("start", [None, "2026-11-20"])
@pytest.mark.parametrize("category", ["diet", "exercise", "full"])
def test_assignment_endpoint_fills_the_duration_from_an_explicit_or_local_start(client, user, plan_factory, start, category):
    plan = plan_factory(creator=user, category=category, duration=timedelta(days=2))
    payload = {"plan_id": plan.pk}
    if start: payload["start_date"] = start
    response = client.post(reverse("set-current-plan"), payload, content_type="application/json")
    assert response.status_code == 200
    first = date.fromisoformat(start) if start else TODAY
    assert set(UserLog.objects.filter(user=user, plan=plan).values_list("date", flat=True)) == {first, first + timedelta(days=1)}


def test_assignment_endpoint_requires_an_owned_plan_id(client):
    response = client.post(reverse("set-current-plan"), {}, content_type="application/json")
    assert response.status_code == 400


def test_full_plan_switches_both_slots_only_when_replacement_is_enabled(user, plan_factory):
    old = plan_factory(creator=user)
    full = plan_factory(creator=user, category="full")
    day = TODAY + timedelta(days=2)
    UserLog.objects.create(user=user, plan=old, date=day)
    set_plan(user, full, day, replace=False)
    assert list(UserLog.objects.filter(user=user).values_list("plan_id", flat=True)) == [old.pk]
    set_plan(user, full, day, replace=True)
    assert list(UserLog.objects.filter(user=user).values_list("plan_id", flat=True)) == [full.pk]
    another = plan_factory(creator=user)
    set_plan(user, another, day, replace=False)
    assert list(UserLog.objects.filter(user=user).values_list("plan_id", flat=True)) == [full.pk]


def test_full_plan_activation_includes_its_linked_child_metrics(user, plan_factory, metric_factory):
    diet = plan_factory(creator=user); exercise = plan_factory(creator=user, category="exercise")
    full = plan_factory(creator=user, category="full", diet_plan_id=diet.pk, exercise_plan_id=exercise.pk)
    trackers = [metric_factory(user=user, linkedPlan=plan, isActive=False) for plan in (diet, exercise, full)]
    UserLog.objects.create(user=user, plan=full, date=TODAY)
    update_active_metrics(user)
    for tracker in trackers: tracker.refresh_from_db(); assert tracker.isActive is True


@pytest.mark.parametrize("kind,options,start,expected", [("scale", [], None, 1),
    ("boolean", [], None, False), ("category", [], None, "no entry")])
def test_new_metric_definitions_receive_safe_default_starts(client, user, kind, options, start, expected):
    from core.models import TrackedMetrics
    response = client.post(reverse("create-metric"), {"name": "New tracked", "type": kind, "options": options, "target": True,
        "plan_type": "diet", "start": start}, content_type="application/json")
    assert response.status_code == 200
    assert TrackedMetrics.objects.get(pk=response.json()["metric"]["id"]).start == expected


@pytest.mark.parametrize("has_record,expected", [(True, 75), (False, 80)])
def test_reusing_a_continuous_definition_carries_its_last_value_or_start(client, user, metric_factory, plan_factory, has_record, expected):
    from core.models import TrackedMetrics
    previous = metric_factory(user=user, type="continues", start=80, target=70)
    if has_record:
        log = UserLog.objects.create(user=user, plan=plan_factory(creator=user), date=TODAY - timedelta(days=1))
        DailyAchivedMetrics.objects.create(log=log, metric=previous, value=75)
    response = client.post(reverse("create-metric"), {"name": previous.metric.name, "type": "continues", "target": 70,
        "existingMetricId": previous.metric_id, "plan_type": "diet"}, content_type="application/json")
    assert response.status_code == 200
    assert TrackedMetrics.objects.get(pk=response.json()["metric"]["id"]).start == expected


def test_reusing_a_missing_metric_definition_returns_not_found_without_side_effects(client, user):
    from core.models import Metric
    response = client.post(reverse("create-metric"), {"name": "Missing", "type": "daily", "target": 10,
        "existingMetricId": 999999}, content_type="application/json")
    assert response.status_code == 404 and not Metric.objects.filter(user=user).exists()
