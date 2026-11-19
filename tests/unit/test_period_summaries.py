from datetime import date, timedelta

import pytest

from core.helpers.helpers import formatMetricPeriodSummery, get_period_dates, get_period_range, to_scale
from core.helpers.serializer import serialize_log
from core.models import DailyAchivedMetrics, Metric, TrackedMetrics, UserLog
from users.models import User

pytestmark = pytest.mark.unit


def records(kind, values, *, start=0, target=100, positive=True, options=None, first=date(2026, 11, 1)):
    owner = User(pk=1)
    definition = Metric(pk=1, user=owner, name="Tracked", type=kind, options=options or [])
    tracker = TrackedMetrics(pk=1, metric=definition, start=start, target=target, isPostive=positive)
    return [DailyAchivedMetrics(metric=tracker, log=UserLog(user=owner, date=first + timedelta(days=i)), value=value)
            for i, value in enumerate(values)]


@pytest.mark.parametrize("reference,expected", [
    (date(2026, 12, 31), (date(2026, 12, 28), date(2027, 1, 3))),
    (date(2026, 1, 1), (date(2025, 12, 29), date(2026, 1, 4))),
])
@pytest.mark.parametrize("helper", [get_period_range, get_period_dates])
def test_week_boundaries_cross_calendar_years(helper, reference, expected):
    assert helper("week", reference) == expected


@pytest.mark.parametrize("reference,expected_end", [(date(2024, 2, 12), date(2024, 2, 29)),
    (date(2026, 2, 12), date(2026, 2, 28)), (date(2026, 12, 17), date(2026, 12, 31))])
@pytest.mark.parametrize("helper", [get_period_range, get_period_dates])
def test_month_bounds_include_leap_days_and_december(helper, reference, expected_end):
    assert helper("month", reference) == (reference.replace(day=1), expected_end)


def test_daily_and_unknown_periods_fall_back_to_the_selected_date():
    selected = date(2026, 11, 17)
    for helper in (get_period_range, get_period_dates):
        assert helper("day", selected) == (selected, selected)
        assert helper("unsupported", selected) == (selected, selected)
    assert get_period_dates("year", date(2024, 2, 29)) == (date(2024, 1, 1), date(2024, 12, 31))


@pytest.mark.parametrize("kind,positive,current,previous,start,target,expected", [
    ("continues", True, [5, 8], [1, 4], 0, 10, (4, 8, 4)),
    ("continues", False, [78, 75], [82, 80], 90, 70, (80, 75, 5)),
    ("continues", True, [5], [], 2, 10, (2, 5, 3)),
    ("daily", True, [20, 60], [10, 30], 0, 100, (20, 40, 20)),
    ("daily", False, [5, 15], [20, 40], 0, 100, (30, 10, 20)),
    ("daily", True, [20, "bad", None], [], 10, 100, (10, 6.67, -3.33)),
])
def test_numeric_summaries_compare_chronologically_and_respect_direction(kind, positive, current, previous, start, target, expected):
    current_records = records(kind, current, start=start, target=target, positive=positive)
    previous_records = records(kind, previous, start=start, target=target, positive=positive, first=date(2026, 10, 1))
    result = formatMetricPeriodSummery(list(reversed(current_records)), list(reversed(previous_records)))
    assert (result["startValue"], result["currentValue"], result["change"]) == expected
    assert result["score"] == pytest.approx(sum(r.calculate_score() for r in current_records) / len(current_records))
    assert result["id"] == 1 and result["name"] == "Tracked"


@pytest.mark.parametrize("positive,expected_start,expected_current,expected_target", [
    (True, "0%", "50%", "a habit"), (False, "100%", "50%", "Avoid"),
])
def test_boolean_summaries_use_success_percentages(positive, expected_start, expected_current, expected_target):
    current = records("boolean", [True, False], positive=positive)
    result = formatMetricPeriodSummery(current, [])
    assert (result["startValue"], result["currentValue"], result["target"]) == (expected_start, expected_current, expected_target)
    assert result["change"] == ("50%" if positive else "-50%")


@pytest.mark.parametrize("positive,target,expected_target", [(True, "", "More"), (False, None, "Less"), (True, "High", "High")])
def test_scale_summaries_have_readable_values_and_preserve_the_target(positive, target, expected_target):
    current = records("scale", [3, 5], start=1, target=target, positive=positive)
    previous = records("scale", [1, 3], target=target, positive=positive)
    result = formatMetricPeriodSummery(current, previous)
    assert result["startValue"] == "Fair" and result["currentValue"] == "Good"
    assert result["target"] == expected_target
    assert result["change"] == pytest.approx(.5 if positive else -.5)
    assert formatMetricPeriodSummery(current, [])["startValue"] == "Low"


@pytest.mark.parametrize("positive,target,options,expected", [
    (True, ["Calm"], ["Calm", "Stressed"], "more Calm"),
    (True, "Calm", "Calm", "balance"),
    (False, ["Stressed"], ["Calm", "Stressed"], "less Stressed"),
    (True, [], [], "balance"),
])
def test_category_summary_describes_the_selected_goal(positive, target, options, expected):
    current = records("category", ["Calm", "Stressed"], target=target, positive=positive, options=options)
    previous = records("category", ["Stressed"], target=target, positive=positive, options=options)
    result = formatMetricPeriodSummery(current, previous)
    assert result["target"] == expected
    assert 0 <= result["score"] <= 1
    formatMetricPeriodSummery(current, [])


@pytest.mark.parametrize("value,label", [(0, "Low"), (1, "Low"), (2, "Fair"), (3, "Average"),
    (4, "Good"), (8, "Optimal"), (None, "Low"), ("invalid", "Low")])
def test_scale_labels_always_have_the_same_readable_output_type(value, label):
    assert to_scale(value) == label


def test_empty_summaries_and_missing_logs_have_explicit_empty_results():
    assert formatMetricPeriodSummery([], []) is None
    assert serialize_log(None) is None
