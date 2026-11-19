from unittest.mock import Mock

import pytest

from healthHub.helpers.nurtientCalculator import convert_ingredient_to_grams, convert_to_grams, format_unit_warning, get_nutrition_info_usda

pytestmark = pytest.mark.unit


@pytest.mark.parametrize("unit,grams", [("piece", 100), ("slice", 25), ("clove", 3), ("can", 400),
    ("stick", 113), ("bunch", 100), ("handful", 50), ("package", 250)])
def test_imprecise_units_return_an_explicit_estimate(unit, grams):
    result, warning = convert_to_grams(2, unit, "unlisted ingredient")
    assert result == grams * 2 and warning


@pytest.mark.parametrize("unit,grams", [("pinch", .5), ("dash", .6)])
def test_small_cooking_measures_have_consistent_mass(unit, grams):
    result, _ = convert_to_grams(3, unit, "salt")
    assert result == pytest.approx(grams * 3)


def test_unknown_volume_uses_a_visible_water_density_estimate():
    grams, warning = convert_to_grams(1, "cup", "unlisted ingredient")
    assert grams == 240 and "water density" in warning.lower()


def test_specific_ingredient_mass_takes_precedence_over_a_generic_estimate():
    grams, warning = convert_to_grams(2, "slice", "whole wheat bread")
    assert grams == 60 and warning is None


def test_ingredient_wrapper_retains_decimal_amounts_and_conversions():
    assert convert_ingredient_to_grams({"amount": "1.5", "unit": "kg", "name": "Flour"}) == 1500


def test_warning_formatting_deduplicates_messages_without_losing_distinct_warnings():
    assert format_unit_warning([]) == ""
    assert format_unit_warning(["Estimate", "Estimate"]).count("Estimate") == 1
    result = format_unit_warning(["Density", "Piece size", "Density"])
    assert "Density" in result and "Piece size" in result and result.count("Density") == 1


def test_missing_api_credentials_return_an_explicit_failure_without_any_request(settings, monkeypatch):
    settings.USDA_API_KEY = ""; request = Mock(); monkeypatch.setattr("requests.get", request)
    result = get_nutrition_info_usda([{"name": "Rice", "unit": "g", "amount": 100}])
    assert result["success"] is False and result["error"]
    request.assert_not_called()
