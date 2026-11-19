"""These assertions use real PostgreSQL transactions and separate connections."""
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from threading import Barrier

import pytest
from django.contrib.auth import get_user_model
from django.db import connection, connections
from django.test import Client
from django.urls import reverse

from core.helpers.assigned_plans import set_plan
from core.models import DailyAchivedMetrics, UserLog
from healthHub.models import Plan

pytestmark = [pytest.mark.postgresql, pytest.mark.django_db(transaction=True),
              pytest.mark.skipif(connection.vendor != "postgresql", reason="Requires real PostgreSQL row locks; run scripts/run_postgres_tests.py")]


def concurrently(actions):
    barrier = Barrier(len(actions))

    def run(action):
        try:
            barrier.wait(timeout=15)
            return action()
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=len(actions)) as pool:
        futures = [pool.submit(run, action) for action in actions]
        return [future.result(timeout=30) for future in futures]


@pytest.mark.parametrize("category", ["diet", "full"])
def test_simultaneous_plan_assignment_has_one_log_and_metric_per_day(user, plan_factory, metric_factory, category, freeze_time):
    freeze_time("2026-11-17T12:00:00+00:00")
    plan = plan_factory(creator=user, category=category, duration=timedelta(days=3))
    tracker = metric_factory(user=user, linkedPlan=plan)
    start = date(2026, 11, 20)

    def assign():
        set_plan(get_user_model().objects.get(pk=user.pk), Plan.objects.get(pk=plan.pk), start, fill_duration=True)

    concurrently([assign, assign])
    logs = UserLog.objects.filter(user=user).order_by("date")
    assert list(logs.values_list("date", flat=True)) == [start + timedelta(days=i) for i in range(3)]
    assert DailyAchivedMetrics.objects.filter(log__in=logs, metric=tracker).count() == 3


def test_simultaneous_conflicting_assignments_do_not_merge_different_plans(user, plan_factory, freeze_time):
    freeze_time("2026-11-17T12:00:00+00:00")
    plans = [plan_factory(creator=user, duration=timedelta(days=2)) for _ in range(2)]
    start = date(2026, 11, 20)

    def action(plan_id):
        return lambda: set_plan(get_user_model().objects.get(pk=user.pk), Plan.objects.get(pk=plan_id), start, fill_duration=True, replace=False)

    concurrently([action(plan.pk) for plan in plans])
    logs = UserLog.objects.filter(user=user)
    assert logs.count() == 2
    assert len(set(logs.values_list("plan_id", flat=True))) == 1


def test_simultaneous_first_value_writes_preserve_a_single_daily_slot(user, plan_factory, metric_factory, freeze_time):
    freeze_time("2026-11-17T12:00:00+00:00")
    plan = plan_factory(creator=user)
    tracker = metric_factory(user=user, linkedPlan=plan)

    clients = [Client(), Client()]
    for client in clients: client.force_login(user)

    def save_value(client):
        return client.patch(reverse("update-metric-value", args=[tracker.pk]),
            {"date": "2026-11-17", "plan_type": "diet", "value": 50}, content_type="application/json").status_code

    assert concurrently([lambda client=client: save_value(client) for client in clients]) == [200, 200]
    assert UserLog.objects.filter(user=user, date=date(2026, 11, 17), plan=plan).count() == 1
    assert DailyAchivedMetrics.objects.filter(log__user=user, metric=tracker).count() == 1
