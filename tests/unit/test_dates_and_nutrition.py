from datetime import date

import pytest

from core.helpers.helpers import get_period_dates, get_period_range
from core.helpers.validators import validate_image
from healthHub.helpers.nurtientCalculator import convert_to_grams, extract_nutrients
from django.core.files.uploadedfile import SimpleUploadedFile

pytestmark = pytest.mark.unit


@pytest.mark.parametrize("period,reference,start,end", [
    ("week", date(2026, 11, 16), date(2026, 11, 16), date(2026, 11, 22)),
    ("week", date(2026, 1, 1), date(2025, 12, 29), date(2026, 1, 4)),
    ("month", date(2024, 2, 29), date(2024, 2, 1), date(2024, 2, 29)),
    ("month", date(2025, 2, 20), date(2025, 2, 1), date(2025, 2, 28)),
    ("month", date(2026, 12, 20), date(2026, 12, 1), date(2026, 12, 31)),
    ("year", date(2024, 2, 29), date(2024, 1, 1), date(2024, 12, 31)),
    ("day", date(2026, 11, 16), date(2026, 11, 16), date(2026, 11, 16)),
])
def test_period_boundaries(period, reference, start, end):
    assert get_period_dates(period, reference) == (start, end)
    if period != "year":
        assert get_period_range(period, reference) == (start, end)


@pytest.mark.parametrize("amount,unit,name,grams", [
    (2, "kg", "flour", 2000), (3, "oz", "sugar", 85.05),
    (1, "cup", "flour", 120), (2, "tbsp", "flour", 15),
    (2, "piece", "egg", 100), (2, "clove", "garlic", 6),
    (1, "cup", "milk", 245), (2, " G ", "milk", 2),
])
def test_unit_conversion(amount, unit, name, grams):
    result, _ = convert_to_grams(amount, unit, name)
    assert result == pytest.approx(grams)


def test_unknown_units_return_an_approximation_warning():
    grams, warning = convert_to_grams(5, "mystery-unit", "ingredient")
    assert grams == 5
    assert warning


def test_nutrients_scale_per_100g_and_ignore_incompatible_units():
    result = extract_nutrients([
        {"nutrientNumber": "208", "unitName": "KCAL", "value": 200},
        {"nutrientNumber": "203", "unitName": "G", "value": 10},
        {"nutrientNumber": "301", "unitName": "G", "value": 999},
        {"nutrientNumber": "unknown", "unitName": "G", "value": 999},
    ], 150)
    assert result["calories"] == 300
    assert result["protein"] == 15
    assert result["calcium"] == 0


@pytest.mark.parametrize("mime,size,valid", [
    ("image/png", 10, True), ("image/webp", 10, True),
    ("text/plain", 10, False), ("image/svg+xml", 10, False),
    ("image/png", 5 * 1024**2, True),
    ("image/png", 5 * 1024**2 + 1, False),
])
def test_upload_validation_always_returns_a_result_pair(mime, size, valid):
    upload = SimpleUploadedFile("image", b"x" * size, content_type=mime)
    accepted, error = validate_image(upload)
    assert accepted is valid
    assert bool(error) is not valid
