from datetime import date, timedelta
from zoneinfo import ZoneInfo

import pytest
from django.urls import reverse
from django.utils import timezone

from core.helpers.assigned_plans import get_current_plan, set_plan, update_metrics
from core.models import DailyAchivedMetrics, UserLog

pytestmark = [pytest.mark.django_db, pytest.mark.integration]


def test_assignment_fills_exact_duration_and_preserves_other_plan_type(user, plan_factory, freeze_time):
    freeze_time("2026-11-16T12:00:00+00:00")
    diet = plan_factory(creator=user, duration=timedelta(days=3))
    exercise = plan_factory(creator=user, category="exercise")
    day = date(2026, 11, 20)
    existing = UserLog.objects.create(user=user, plan=exercise, date=day)
    set_plan(user, diet, day, fill_duration=True)
    assert list(UserLog.objects.filter(user=user, plan=diet).order_by("date").values_list("date", flat=True)) == [
        day, day + timedelta(days=1), day + timedelta(days=2)
    ]
    existing.refresh_from_db()
    assert existing.plan_id == exercise.pk


@pytest.mark.parametrize("category", ["diet", "exercise", "full"])
def test_repeated_assignment_is_idempotent(user, plan_factory, freeze_time, category):
    freeze_time("2026-11-16T12:00:00+00:00")
    plan = plan_factory(creator=user, category=category, duration=timedelta(days=2))
    day = date(2026, 11, 20)
    set_plan(user, plan, day, fill_duration=True, replace=False)
    before = list(UserLog.objects.filter(user=user).order_by("pk").values_list("pk", "plan_id", "date"))
    set_plan(user, plan, day, fill_duration=True, replace=False)
    after = list(UserLog.objects.filter(user=user).order_by("pk").values_list("pk", "plan_id", "date"))
    assert before
    assert after == before


def test_metric_initialization_carries_continuous_and_resets_daily_values(user, plan_factory, metric_factory):
    plan = plan_factory(creator=user)
    weight = metric_factory(user=user, type="continues", start=80, target=70, linkedPlan=plan)
    water = metric_factory(user=user, linkedPlan=plan, target=2000)
    previous = UserLog.objects.create(user=user, plan=plan, date=date(2026, 11, 15))
    DailyAchivedMetrics.objects.create(log=previous, metric=weight, value=77)
    DailyAchivedMetrics.objects.create(log=previous, metric=water, value=1800)
    current = UserLog.objects.create(user=user, plan=plan, date=date(2026, 11, 16))
    update_metrics(current)
    assert dict(current.AchivedMetrics.values_list("metric_id", "value")) == {weight.pk: 77, water.pk: 0}
    current.AchivedMetrics.filter(metric=water).update(value=500)
    update_metrics(current)
    assert current.AchivedMetrics.count() == 2
    assert current.AchivedMetrics.get(metric=water).value == 500


def test_backfill_fills_missing_dates_once_without_changing_recorded_values(user, plan_factory, metric_factory, freeze_time):
    freeze_time("2026-11-16T12:00:00+00:00")
    plan = plan_factory(creator=user)
    weight = metric_factory(user=user, type="continues", start=80, target=70, linkedPlan=plan)
    log = UserLog.objects.create(user=user, plan=plan, date=date(2026, 11, 14), feedback="Keep this")
    entry = DailyAchivedMetrics.objects.create(log=log, metric=weight, value=77)
    assert get_current_plan(user, "diet") == plan
    assert get_current_plan(user, "diet") == plan
    assert UserLog.objects.filter(user=user).count() == 3
    entry.refresh_from_db(); log.refresh_from_db()
    assert entry.value == 77
    assert log.feedback == "Keep this"
    assert UserLog.objects.get(user=user, date=date(2026, 11, 16)).AchivedMetrics.get(metric=weight).value == 77


@pytest.mark.parametrize("zone,instant,local_today", [
    ("Africa/Cairo", "2026-11-16T22:30:00+00:00", date(2026, 11, 17)),
    ("America/Los_Angeles", "2026-11-17T01:00:00+00:00", date(2026, 11, 16)),
    ("UTC", "2026-11-16T22:30:00+00:00", date(2026, 11, 16)),
])
def test_backfill_ends_at_the_users_local_day(user, plan_factory, freeze_time, zone, instant, local_today):
    freeze_time(instant)
    plan = plan_factory(creator=user)
    UserLog.objects.create(user=user, plan=plan, date=local_today - timedelta(days=2))
    with timezone.override(ZoneInfo(zone)):
        get_current_plan(user, "diet")
    dates = set(UserLog.objects.filter(user=user).values_list("date", flat=True))
    assert dates == {local_today - timedelta(days=2), local_today - timedelta(days=1), local_today}


def test_assigning_a_plan_before_local_today_is_rejected(client, user, plan_factory, freeze_time):
    freeze_time("2026-11-16T22:30:00+00:00")
    plan = plan_factory(creator=user)
    client.force_login(user)
    with timezone.override("Africa/Cairo"):
        response = client.post(reverse("set-current-plan"),
            {"plan_id": plan.pk, "start_date": "2026-11-16"}, content_type="application/json")
    assert not UserLog.objects.filter(user=user).exists()
    assert response.status_code in {400, 403}


@pytest.mark.parametrize("age_days,allowed", [(0, True), (29, True), (30, True), (31, False), (-1, False)])
@pytest.mark.parametrize("field", ["value", "feedback"])
def test_history_edits_respect_the_30_day_window(
    client, user, plan_factory, metric_factory, freeze_time, age_days, allowed, field
):
    freeze_time("2026-11-16T12:00:00+00:00")
    plan = plan_factory(creator=user)
    tracker = metric_factory(user=user, linkedPlan=plan)
    day = date(2026, 11, 16) - timedelta(days=age_days)
    log = UserLog.objects.create(user=user, plan=plan, date=day, feedback="Original")
    entry = DailyAchivedMetrics.objects.create(log=log, metric=tracker, value=25)
    client.force_login(user)
    if field == "value":
        response = client.patch(reverse("update-metric-value", args=[tracker.pk]),
            {"value": 75, "date": day.isoformat(), "plan_type": "diet"}, content_type="application/json")
    else:
        response = client.post(reverse("update-feedback"),
            {"feedback": "Updated", "date": day.isoformat(), "plan_type": "diet"}, content_type="application/json")
    entry.refresh_from_db(); log.refresh_from_db()
    if allowed:
        assert response.status_code == 200
        assert (entry.value if field == "value" else log.feedback) == (75 if field == "value" else "Updated")
    else:
        assert (entry.value if field == "value" else log.feedback) == (25 if field == "value" else "Original")
        assert response.status_code in {400, 403}


def test_empty_historical_day_returns_an_empty_state(client, user, freeze_time):
    freeze_time("2026-11-16T12:00:00+00:00")
    client.force_login(user)
    response = client.get(reverse("dayData"), {"date": "2026-11-10", "type": "diet"})
    assert response.status_code == 200
    assert response.json()["plan_name"] == ""
    assert response.json()["metrics"] == []


@pytest.mark.parametrize("value", [0, False])
def test_metric_value_endpoint_preserves_zero_and_false(client, user, plan_factory, metric_factory, freeze_time, value):
    freeze_time("2026-11-16T12:00:00+00:00")
    plan = plan_factory(creator=user)
    tracker = metric_factory(user=user, type="boolean" if value is False else "daily", linkedPlan=plan)
    log = UserLog.objects.create(user=user, plan=plan, date=date(2026, 11, 16))
    client.force_login(user)
    response = client.patch(reverse("update-metric-value", args=[tracker.pk]),
        {"value": value, "date": "2026-11-16", "plan_type": "diet"}, content_type="application/json")
    assert response.status_code == 200
    saved = DailyAchivedMetrics.objects.get(log=log, metric=tracker).value
    assert saved == value
    assert type(saved) is type(value)


@pytest.mark.parametrize("value", [0, 6, "invalid"])
def test_scale_endpoint_rejects_values_outside_one_to_five(client, user, plan_factory, metric_factory, freeze_time, value):
    freeze_time("2026-11-16T12:00:00+00:00")
    plan = plan_factory(creator=user)
    tracker = metric_factory(user=user, type="scale", linkedPlan=plan)
    log = UserLog.objects.create(user=user, plan=plan, date=date(2026, 11, 16))
    entry = DailyAchivedMetrics.objects.create(log=log, metric=tracker, value=3)
    client.force_login(user)
    response = client.patch(reverse("update-metric-value", args=[tracker.pk]),
        {"value": value, "date": "2026-11-16", "plan_type": "diet"}, content_type="application/json")
    entry.refresh_from_db()
    assert entry.value == 3
    assert response.status_code == 400


def test_deleting_a_metric_with_history_preserves_its_records(client, user, plan_factory, metric_factory):
    plan = plan_factory(creator=user)
    tracker = metric_factory(user=user, linkedPlan=plan)
    log = UserLog.objects.create(user=user, plan=plan, date=date(2026, 11, 1))
    entry = DailyAchivedMetrics.objects.create(log=log, metric=tracker, value=50)
    client.force_login(user)
    response = client.delete(reverse("delete-metric", args=[tracker.pk]))
    assert response.status_code == 200
    tracker.refresh_from_db(); entry.refresh_from_db()
    assert tracker.isActive is False
    assert entry.value == 50


@pytest.mark.parametrize("category", ["diet", "exercise", "full"])
def test_calendar_assignments_return_the_correct_category_day(client, user, plan_factory, category):
    plan = plan_factory(creator=user, category=category)
    UserLog.objects.create(user=user, plan=plan, date=date(2026, 10, 31))
    UserLog.objects.create(user=user, plan=plan, date=date(2026, 11, 2))
    client.force_login(user)
    response = client.get(reverse("assignedPlans"), {"year": 2026, "month": 11})
    assert response.status_code == 200
    day = response.json()["plans"]["2026-11-02"]
    for kind in ("diet", "exercise"):
        if category in {kind, "full"}:
            assert day[kind] == {"plan_name": plan.base.name, "plan_id": plan.pk}
            assert day[f"{kind}Day"] == 3
        else:
            assert day[kind] is False
            assert day[f"{kind}Day"] is None
