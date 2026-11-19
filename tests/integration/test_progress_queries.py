from datetime import date, timedelta

import pytest
from django.urls import reverse

from core.models import DailyAchivedMetrics, UserLog

pytestmark = [pytest.mark.django_db, pytest.mark.integration]
TODAY = date(2026, 11, 17)


@pytest.fixture(autouse=True)
def authenticated(client, user, freeze_time):
    freeze_time("2026-11-17T12:00:00+00:00")
    client.force_login(user)


@pytest.mark.parametrize("params", [{}, {"date": "bad", "type": "diet"},
    {"date": "2026-02-30", "type": "diet"}, {"date": "2026-11-17", "type": "other"}])
def test_daily_queries_reject_missing_and_invalid_dates_or_types(client, params):
    assert client.get(reverse("dayData"), params).status_code == 400


@pytest.mark.parametrize("endpoint,params", [
    ("assignedPlans", {"year": "bad", "month": 11}),
    ("assignedPlans", {"year": 2026, "month": 13}),
    ("assignedPlans", {"year": 0, "month": 1}),
    ("avgScore", {"date": "not-a-date"}),
    ("avgScore", {"date": "2026-11-17", "period": "invalid"}),
    ("period-progress", {"date": "2026-11-17", "period": "invalid"}),
])
def test_invalid_summary_queries_return_client_errors(client, endpoint, params):
    client.raise_request_exception = False
    assert client.get(reverse(endpoint), params).status_code == 400


@pytest.mark.parametrize("params", [{}, {"date": "bad"}, {"date": "2026-02-30"}])
def test_period_queries_require_a_real_calendar_date(client, params):
    assert client.get(reverse("period-progress"), params).status_code == 400


@pytest.mark.parametrize("category,expected", [("diet", 20), ("exercise", 80)])
@pytest.mark.parametrize("period", ["day", "week", "month", "year"])
def test_average_scores_are_scoped_to_the_requested_plan_type(client, user, plan_factory, metric_factory, category, expected, period):
    for kind, value in (("diet", 20), ("exercise", 80)):
        plan = plan_factory(creator=user, category=kind)
        tracker = metric_factory(user=user, linkedPlan=plan)
        log = UserLog.objects.create(user=user, plan=plan, date=TODAY)
        DailyAchivedMetrics.objects.create(log=log, metric=tracker, value=value)
    response = client.get(reverse("avgScore"), {"date": TODAY.isoformat(), "type": category, "period": period})
    assert response.status_code == 200
    assert response.json()["avgScore"] == expected


@pytest.mark.parametrize("category,expected", [("diet", 20), ("exercise", 80)])
def test_period_chart_and_metric_list_filter_the_requested_plan_type(client, user, plan_factory, metric_factory, category, expected):
    ids = {}
    for kind, value in (("diet", 20), ("exercise", 80)):
        plan = plan_factory(creator=user, category=kind)
        tracker = metric_factory(user=user, linkedPlan=plan)
        ids[kind] = tracker.pk
        log = UserLog.objects.create(user=user, plan=plan, date=TODAY)
        DailyAchivedMetrics.objects.create(log=log, metric=tracker, value=value)
    response = client.get(reverse("period-progress"), {"date": TODAY.isoformat(), "type": category, "period": "month"})
    assert response.status_code == 200
    data = response.json()
    assert [metric["id"] for metric in data["metrics"]] == [ids[category]]
    assert data["chart_data"][0]["overall_score"] == expected


def test_summary_data_cannot_include_another_users_records(client, user, plan_factory, metric_factory):
    own_plan = plan_factory(creator=user)
    own_tracker = metric_factory(user=user, linkedPlan=own_plan)
    own = UserLog.objects.create(user=user, plan=own_plan, date=TODAY)
    DailyAchivedMetrics.objects.create(log=own, metric=own_tracker, value=25)
    foreign_plan = plan_factory()
    foreign_tracker = metric_factory(user=foreign_plan.base.creator, linkedPlan=foreign_plan)
    foreign = UserLog.objects.create(user=foreign_plan.base.creator, plan=foreign_plan, date=TODAY)
    DailyAchivedMetrics.objects.create(log=foreign, metric=foreign_tracker, value=100)
    response = client.get(reverse("period-progress"), {"date": TODAY.isoformat(), "period": "month"}).json()
    assert [item["id"] for item in response["metrics"]] == [own_tracker.pk]
    assert response["chart_data"][0]["overall_score"] == 25
    calendar = client.get(reverse("assignedPlans"), {"year": 2026, "month": 11}).json()
    assert calendar["plans"][TODAY.isoformat()]["diet"]["plan_id"] == own_plan.pk


@pytest.mark.parametrize("period,previous,inside,outside", [
    ("week", date(2026, 11, 9), date(2026, 11, 16), date(2026, 11, 23)),
    ("month", date(2026, 10, 31), date(2026, 11, 1), date(2026, 12, 1)),
    ("year", date(2025, 1, 1), date(2026, 1, 1), date(2027, 1, 1)),
])
def test_period_comparison_includes_previous_period_and_excludes_outside_dates(client, user, plan_factory, metric_factory, period, previous, inside, outside):
    plan = plan_factory(creator=user)
    tracker = metric_factory(user=user, linkedPlan=plan)
    for day, value in ((previous, 10), (inside, 30), (outside, 90)):
        log = UserLog.objects.create(user=user, plan=plan, date=day)
        DailyAchivedMetrics.objects.create(log=log, metric=tracker, value=value)
    response = client.get(reverse("period-progress"), {"date": TODAY.isoformat(), "period": period}).json()
    assert [item["date"] for item in response["chart_data"]] == [inside.isoformat()]
    assert response["metrics"][0]["startValue"] == 10
    assert response["metrics"][0]["currentValue"] == 30
    assert response["metrics"][0]["change"] == 20


@pytest.mark.parametrize("category", ["diet", "exercise"])
def test_full_plan_day_view_uses_only_the_selected_child_and_shared_metrics(client, user, plan_factory, metric_factory, category):
    diet = plan_factory(creator=user)
    exercise = plan_factory(creator=user, category="exercise")
    full = plan_factory(creator=user, category="full", diet_plan_id=diet.pk, exercise_plan_id=exercise.pk)
    log = UserLog.objects.create(user=user, plan=full, date=TODAY)
    own = metric_factory(user=user, linkedPlan=diet)
    other = metric_factory(user=user, linkedPlan=exercise)
    global_tracker = metric_factory(user=user)
    for tracker in (own, other, global_tracker): DailyAchivedMetrics.objects.create(log=log, metric=tracker, value=50)
    data = client.get(reverse("dayData"), {"date": TODAY.isoformat(), "type": category}).json()
    expected = own if category == "diet" else other
    assert data["planId"] == (diet.pk if category == "diet" else exercise.pk)
    assert {item["id"] for item in data["metrics"]} == {expected.pk, global_tracker.pk}


def test_full_plan_day_number_uses_the_full_assignment_start(client, user, plan_factory):
    diet = plan_factory(creator=user)
    full = plan_factory(creator=user, category="full", diet_plan_id=diet.pk)
    for offset in (0, 2): UserLog.objects.create(user=user, plan=full, date=TODAY - timedelta(days=2) + timedelta(days=offset))
    data = client.get(reverse("dayData"), {"date": TODAY.isoformat(), "type": "diet"}).json()
    assert data["current_day"] == 3


def test_missing_linked_child_returns_not_found_instead_of_crashing(client, user, plan_factory):
    full = plan_factory(creator=user, category="full")
    UserLog.objects.create(user=user, plan=full, date=TODAY)
    assert client.get(reverse("dayData"), {"date": TODAY.isoformat(), "type": "exercise"}).status_code == 404


def test_empty_period_has_explicit_empty_arrays_and_zero_average(client):
    params = {"date": TODAY.isoformat(), "type": "diet", "period": "month"}
    assert client.get(reverse("period-progress"), params).json() == {"metrics": [], "chart_data": []}
    assert client.get(reverse("avgScore"), params).json()["avgScore"] == 0


def test_daily_metric_goals_remain_visible_when_not_linked_to_a_plan(client, user, plan_factory, metric_factory):
    tracker = metric_factory(user=user, goal="My own goal")
    log = UserLog.objects.create(user=user, plan=plan_factory(creator=user), date=TODAY)
    DailyAchivedMetrics.objects.create(log=log, metric=tracker, value=40)
    data = client.get(reverse("dayData"), {"date": TODAY.isoformat(), "type": "diet"}).json()
    assert data["metrics"][0]["goal"] == "My own goal"
