"""The score contract is 0..1; these cases intentionally expose current bugs."""

import math

import pytest

from core.models import DailyAchivedMetrics, Metric, TrackedMetrics

pytestmark = pytest.mark.unit


def score(type, value, *, start=0, target=100, positive=True, options=None):
    definition = Metric(type=type, name="Test metric", options=options or [])
    tracker = TrackedMetrics(
        metric=definition, start=start, target=target, isPostive=positive
    )
    return DailyAchivedMetrics(metric=tracker, value=value).calculate_score()


@pytest.mark.parametrize("start,target,value,expected", [
    (80, 70, 80, 0), (80, 70, 75, 0.5), (80, 70, 70, 1),
    (50, 60, 55, 0.5), (80, 70, 60, 1), (80, 70, 90, 0),
    (70, 70, 70, 1), (70, 70, 71, 0),
])
def test_continuous_score(start, target, value, expected):
    assert score("continues", value, start=start, target=target) == pytest.approx(expected)


@pytest.mark.parametrize("value,target,positive,expected", [
    (0, 2000, True, 0), (1000, 2000, True, 0.5),
    (2000, 2000, True, 1), (3000, 2000, True, 1),
    (0, 0, True, 0), (0, 2000, False, 1),
    (2000, 2000, False, 1), (3000, 2000, False, 0.5),
    (4000, 2000, False, 0), (6000, 2000, False, 0),
])
def test_daily_score(value, target, positive, expected):
    assert score("daily", value, target=target, positive=positive) == pytest.approx(expected)


@pytest.mark.parametrize("positive", [True, False])
@pytest.mark.parametrize("value", [True, False, "true", "false", "1", "0", "yes", "no"])
def test_boolean_score(value, positive):
    recorded_true = str(value).lower() in {"true", "1", "yes"}
    assert score("boolean", value, positive=positive) == float(recorded_true == positive)


@pytest.mark.parametrize("positive", [True, False])
@pytest.mark.parametrize("value", [1, 2, 3, 4, 5])
def test_scale_uses_the_full_zero_to_one_range(value, positive):
    expected = (value - 1) / 4 if positive else (5 - value) / 4
    assert score("scale", value, positive=positive) == pytest.approx(expected)


@pytest.mark.parametrize("positive,value,expected", [
    (True, "calm", 1), (True, "stressed", 0),
    (False, "calm", 0), (False, "stressed", 1),
    (True, "no entry", 0), (False, "no entry", 0),
    (True, None, 0), (False, None, 0),
])
def test_category_score_distinguishes_avoidance_from_no_entry(positive, value, expected):
    assert score("category", value, target=["calm"], positive=positive) == expected


@pytest.mark.parametrize("type", ["continues", "daily", "scale"])
@pytest.mark.parametrize("value", [None, "invalid", float("nan"), float("inf"), -1000, 1000])
def test_numeric_scores_are_finite_and_bounded(type, value):
    result = score(type, value, start=10, target=20)
    assert math.isfinite(result)
    assert 0 <= result <= 1
