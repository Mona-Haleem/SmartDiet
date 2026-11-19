from datetime import date, timedelta
from unittest.mock import Mock

import pytest

from core.helpers import assigned_plans as scheduling
from core.models import DailyAchivedMetrics, Metric, TrackedMetrics, UserLog

pytestmark = [pytest.mark.django_db, pytest.mark.integration]
TODAY = date(2026, 11, 17)


@pytest.fixture(autouse=True)
def fixed_day(freeze_time):
    freeze_time("2026-11-17T12:00:00+00:00")


@pytest.mark.parametrize("kind,start,options,expected", [
    ("continues", 80, [], 80), ("continues", None, [], 0), ("daily", 25, [], 0),
    ("boolean", True, [], False), ("scale", None, [], 3), ("scale", "bad", [], 3),
    ("scale", 0, [], 1), ("scale", 8, [], 5), ("scale", 4, [], 4),
    ("category", "B", ["A", "B"], "B"), ("category", None, ["A", "B"], "A"),
    ("category", None, [], "no entry"),
])
def test_new_day_initial_values_follow_metric_semantics(user, metric_factory, kind, start, options, expected):
    tracker = metric_factory(user=user, type=kind, start=0 if start is None else start, options=options)
    # Exercise the helper's unset-start contract without inserting SQL NULL into
    # a non-nullable model field.
    tracker.start = start
    assert scheduling.get_initial_value_for_metric(tracker, TODAY) == expected


def test_continuous_carryover_uses_the_latest_earlier_matching_entry(user, user_factory, metric_factory, plan_factory):
    diet = plan_factory(creator=user)
    tracker = metric_factory(user=user, type="continues", start=80, linkedPlan=diet)
    exercise = plan_factory(creator=user, category="exercise")
    foreign = user_factory()
    for owner, plan, day, value in [
        (user, diet, TODAY - timedelta(days=2), 79),
        (user, diet, TODAY - timedelta(days=1), 78),
        (user, exercise, TODAY - timedelta(days=1), 90),
        (user, diet, TODAY + timedelta(days=1), 1),
        (foreign, diet, TODAY - timedelta(days=1), 2),
    ]:
        log = UserLog.objects.create(user=owner, plan=plan, date=day)
        DailyAchivedMetrics.objects.create(log=log, metric=tracker, value=value)
    # Linked/category-specific initialization must not use future or foreign data.
    assert scheduling.get_initial_value_for_metric(tracker, TODAY, "diet") == 78


def test_global_continuous_values_carry_across_plan_slots(user, user_factory, metric_factory, plan_factory):
    tracker = metric_factory(user=user, type='continues', start=80)
    exercise = plan_factory(creator=user, category='exercise')
    for owner, day, value in ((user, TODAY - timedelta(days=1), 77),
                              (user_factory(), TODAY - timedelta(days=1), 1),
                              (user, TODAY + timedelta(days=1), 2)):
        log = UserLog.objects.create(user=owner, plan=exercise, date=day)
        DailyAchivedMetrics.objects.create(log=log, metric=tracker, value=value)
    assert scheduling.get_initial_value_for_metric(tracker, TODAY, 'diet') == 77


def test_metric_initialization_includes_only_own_global_and_matching_plan_metrics(user, metric_factory, plan_factory):
    plan = plan_factory(creator=user)
    other = plan_factory(creator=user)
    included = [metric_factory(user=user, linkedPlan=plan), metric_factory(user=user)]
    metric_factory(user=user, linkedPlan=other)
    metric_factory(user=user, linkedPlan=plan, isActive=False)
    metric_factory(linkedPlan=plan)
    log = UserLog.objects.create(user=user, plan=plan, date=TODAY)
    scheduling.update_metrics(log)
    assert set(log.AchivedMetrics.values_list("metric_id", flat=True)) == {t.pk for t in included}


def test_full_plan_initialization_includes_both_linked_children_once(user, metric_factory, plan_factory):
    diet = plan_factory(creator=user)
    exercise = plan_factory(creator=user, category="exercise")
    full = plan_factory(creator=user, category="full", diet_plan_id=diet.pk, exercise_plan_id=exercise.pk)
    included = [metric_factory(user=user, linkedPlan=p) for p in (diet, exercise, full)]
    included.append(metric_factory(user=user))
    log = UserLog.objects.create(user=user, plan=full, date=TODAY)
    scheduling.update_metrics(log); scheduling.update_metrics(log)
    assert set(log.AchivedMetrics.values_list("metric_id", flat=True)) == {t.pk for t in included}
    assert log.AchivedMetrics.count() == len(included)


@pytest.mark.parametrize("category", ["diet", "exercise", "full"])
def test_future_assignment_does_not_replace_the_current_plan(user, plan_factory, category):
    current = plan_factory(creator=user, category=category)
    future = plan_factory(creator=user, category=category)
    UserLog.objects.create(user=user, plan=current, date=TODAY)
    UserLog.objects.create(user=user, plan=future, date=TODAY + timedelta(days=2))
    assert scheduling.get_current_plan(user, "diet" if category == "full" else category) == current


def test_no_matching_current_plan_returns_none(user, plan_factory):
    UserLog.objects.create(user=user, plan=plan_factory(creator=user, category="exercise"), date=TODAY)
    assert scheduling.get_current_plan(user, "diet") is None
    assert UserLog.objects.count() == 1


def test_backfill_continues_the_same_plan_after_its_original_duration(user, plan_factory):
    plan = plan_factory(creator=user, duration=timedelta(days=1))
    start = TODAY - timedelta(days=10)
    original = UserLog.objects.create(user=user, plan=plan, date=start, feedback="Keep")
    assert scheduling.get_current_plan(user, "diet") == plan
    assert set(UserLog.objects.filter(user=user).values_list("date", flat=True)) == {
        start + timedelta(days=offset) for offset in range(11)
    }
    assert set(UserLog.objects.filter(user=user).values_list("plan_id", flat=True)) == {plan.pk}
    original.refresh_from_db(); assert original.feedback == "Keep"


@pytest.mark.parametrize("replace", [False, True])
def test_assignment_conflicts_respect_replace_on_every_date(user, plan_factory, replace):
    first = plan_factory(creator=user)
    second = plan_factory(creator=user, duration=timedelta(days=3))
    start = TODAY + timedelta(days=2)
    for offset in range(3):
        UserLog.objects.create(user=user, plan=first, date=start + timedelta(days=offset), feedback="Original")
    scheduling.set_plan(user, second, start, fill_duration=True, replace=replace)
    logs = UserLog.objects.filter(user=user).order_by("date")
    assert logs.count() == 3
    assert set(logs.values_list("plan_id", flat=True)) == {second.pk if replace else first.pk}
    assert set(logs.values_list("feedback", flat=True)) == {"" if replace else "Original"}


@pytest.mark.parametrize("replacement_type", ["diet", "exercise"])
def test_replacing_half_of_a_full_plan_preserves_the_other_child_and_values(user, plan_factory, metric_factory, replacement_type):
    diet = plan_factory(creator=user)
    exercise = plan_factory(creator=user, category="exercise")
    full = plan_factory(creator=user, category="full", diet_plan_id=diet.pk, exercise_plan_id=exercise.pk)
    retained = exercise if replacement_type == "diet" else diet
    tracker = metric_factory(user=user, linkedPlan=retained)
    log = UserLog.objects.create(user=user, plan=full, date=TODAY + timedelta(days=1))
    entry = DailyAchivedMetrics.objects.create(log=log, metric=tracker, value=73)
    replacement = plan_factory(creator=user, category=replacement_type)
    scheduling.set_plan(user, replacement, log.date, replace=True)
    log.refresh_from_db(); entry.refresh_from_db()
    assert log.plan_id == retained.pk and entry.value == 73
    assert set(UserLog.objects.filter(user=user, date=log.date).values_list("plan_id", flat=True)) == {replacement.pk, retained.pk}


def test_replacing_a_full_plan_with_a_missing_other_child_removes_only_the_obsolete_full_log(user, plan_factory):
    full = plan_factory(creator=user, category="full")
    log = UserLog.objects.create(user=user, plan=full, date=TODAY + timedelta(days=1))
    diet = plan_factory(creator=user)
    scheduling.set_plan(user, diet, log.date, replace=True)
    assert list(UserLog.objects.filter(user=user).values_list("plan_id", flat=True)) == [diet.pk]


def test_replacing_a_plan_preserves_the_shared_global_daily_value(user, plan_factory, metric_factory):
    old = plan_factory(creator=user)
    new = plan_factory(creator=user)
    global_tracker = metric_factory(user=user, type="daily")
    log = UserLog.objects.create(user=user, plan=old, date=TODAY)
    DailyAchivedMetrics.objects.create(log=log, metric=global_tracker, value=62)
    scheduling.set_plan(user, new, TODAY, replace=True)
    assert DailyAchivedMetrics.objects.get(log__user=user, log__date=TODAY, metric=global_tracker).value == 62


def test_multi_day_assignment_rolls_back_all_changes_when_one_day_fails(user, plan_factory, monkeypatch):
    previous = plan_factory(creator=user)
    replacement = plan_factory(creator=user, duration=timedelta(days=3))
    start = TODAY + timedelta(days=1)
    original = UserLog.objects.create(user=user, plan=previous, date=start, feedback="Original")
    real_update = scheduling.update_metrics
    calls = []

    def fail_second_day(log, *args, **kwargs):
        calls.append(log.date)
        if log.date == start + timedelta(days=1):
            raise RuntimeError("second day failed")
        return real_update(log, *args, **kwargs)

    monkeypatch.setattr(scheduling, "update_metrics", fail_second_day)
    with pytest.raises(RuntimeError, match="second day failed"):
        scheduling.set_plan(user, replacement, start, fill_duration=True, replace=True)
    assert len(calls) == 2
    original.refresh_from_db()
    assert (original.plan_id, original.feedback) == (previous.pk, "Original")
    assert UserLog.objects.filter(user=user).count() == 1


def test_sync_fills_only_the_requested_dates_and_preserves_existing_values(user, plan_factory, metric_factory):
    plan = plan_factory(creator=user)
    tracker = metric_factory(user=user, linkedPlan=plan)
    logs = [UserLog.objects.create(user=user, plan=plan, date=TODAY - timedelta(days=i)) for i in range(3)]
    old = DailyAchivedMetrics.objects.create(log=logs[0], metric=tracker, value=55)
    scheduling.sync_user_metrics(user, TODAY - timedelta(days=1), TODAY)
    assert DailyAchivedMetrics.objects.filter(metric=tracker).count() == 2
    assert not logs[2].AchivedMetrics.exists()
    old.refresh_from_db(); assert old.value == 55
    scheduling.sync_user_metrics(user)
    assert DailyAchivedMetrics.objects.filter(metric=tracker).count() == 3


def test_empty_sync_is_safe_and_does_not_create_history(user):
    scheduling.sync_user_metrics(user)
    assert not UserLog.objects.filter(user=user).exists()


def test_cleanup_keeps_active_historical_shared_and_foreign_definitions(user, metric_factory, plan_factory):
    unused = metric_factory(user=user, isActive=False)
    shared = metric_factory(user=user, isActive=False)
    active = TrackedMetrics.objects.create(metric=shared.metric, isActive=True)
    historical = metric_factory(user=user, isActive=False)
    log = UserLog.objects.create(user=user, plan=plan_factory(creator=user), date=TODAY)
    entry = DailyAchivedMetrics.objects.create(log=log, metric=historical, value=5)
    foreign = metric_factory(isActive=False)
    assert scheduling.cleanup_inactive_metrics(user) == 1
    assert not Metric.objects.filter(pk=unused.metric_id).exists()
    assert Metric.objects.filter(pk=shared.metric_id).exists()
    assert TrackedMetrics.objects.filter(pk__in=[active.pk, historical.pk, foreign.pk]).count() == 3
    entry.refresh_from_db(); assert entry.value == 5


def test_active_metrics_follow_current_linked_plans_without_changing_global_state(user, plan_factory, metric_factory):
    current = plan_factory(creator=user)
    old = plan_factory(creator=user)
    UserLog.objects.create(user=user, plan=current, date=TODAY)
    enabled = metric_factory(user=user, linkedPlan=current, isActive=False)
    disabled = metric_factory(user=user, linkedPlan=old, isActive=True)
    global_tracker = metric_factory(user=user, isActive=False)
    scheduling.update_active_metrics(user)
    for tracker in (enabled, disabled, global_tracker): tracker.refresh_from_db()
    assert enabled.isActive is True and disabled.isActive is False and global_tracker.isActive is False
    assert scheduling.update_active_metrics(None) is None
