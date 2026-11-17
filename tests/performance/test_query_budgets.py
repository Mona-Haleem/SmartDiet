"""Deterministic SQL budgets, rather than machine-dependent stopwatch assertions."""

from datetime import date

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse

from core.models import DailyAchivedMetrics, UserLog

pytestmark = [pytest.mark.django_db, pytest.mark.performance]


def test_browse_batches_relations_and_paginates_in_the_database(client, user, recipe_factory, record_property):
    for index in range(48):
        recipe_factory(creator=user, name=f"Recipe {index:02}")
    client.force_login(user)
    with CaptureQueriesContext(connection) as captured:
        response = client.get(reverse("browse"), {"size": 24}, HTTP_SEC_FETCH_MODE="cors")
    assert response.status_code == 200
    record_property("sql_queries", len(captured))
    assert len(response.json()["result"]["items"]) == 24
    sql = [query["sql"].upper() for query in captured]
    content_selects = [query for query in sql if query.startswith("SELECT")
        and 'FROM "HEALTHHUB_USERCREATION"' in query and "COUNT(" not in query]
    assert content_selects
    assert all("LIMIT" in query for query in content_selects), "Browse fetched the full library before slicing"
    assert len(captured) <= 10, f"24 cards used {len(captured)} queries; budget is 10"


def test_monthly_progress_uses_a_bounded_number_of_queries(client, user, plan_factory, metric_factory, record_property):
    plan = plan_factory(creator=user)
    trackers = [metric_factory(user=user, linkedPlan=plan) for _ in range(4)]
    for day in range(1, 32):
        log = UserLog.objects.create(user=user, plan=plan, date=date(2026, 3, day))
        DailyAchivedMetrics.objects.bulk_create([
            DailyAchivedMetrics(log=log, metric=tracker, value=50) for tracker in trackers
        ])
    client.force_login(user)
    with CaptureQueriesContext(connection) as captured:
        response = client.get(reverse("period-progress"), {"period": "month", "date": "2026-03-15"})
    assert response.status_code == 200
    record_property("sql_queries", len(captured))
    chart = response.json()["chart_data"]
    assert len(chart) == 31
    assert all(day["overall_score"] == 50 for day in chart)
    assert len(captured) <= 12, f"Monthly progress used {len(captured)} queries; budget is 12"


def test_calendar_batches_plan_start_dates(client, user, plan_factory, record_property):
    plan = plan_factory(creator=user)
    UserLog.objects.bulk_create([
        UserLog(user=user, plan=plan, date=date(2026, 3, day)) for day in range(1, 32)
    ])
    client.force_login(user)
    with CaptureQueriesContext(connection) as captured:
        response = client.get(reverse("assignedPlans"), {"year": 2026, "month": 3})
    assert response.status_code == 200
    record_property("sql_queries", len(captured))
    assert len(response.json()["plans"]) == 31
    assert len(captured) <= 8, f"Calendar used {len(captured)} queries; budget is 8"
