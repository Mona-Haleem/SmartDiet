from datetime import date

import pytest
from django.http import HttpResponse
from django.test import RequestFactory
from django.utils import timezone

from core.middleware.timezone import UserTimezoneMiddleware

pytestmark = pytest.mark.unit


@pytest.mark.parametrize("cookie,expected", [
    ("Africa%2FCairo", date(2026, 11, 17)),
    ("America%2FLos_Angeles", date(2026, 11, 16)),
    ("UTC", date(2026, 11, 16)),
    ("Invalid%2FZone", date(2026, 11, 16)),
    ("", date(2026, 11, 16)),
])
def test_browser_timezone_cookie_controls_local_day_and_is_restored(freeze_time, cookie, expected):
    freeze_time("2026-11-16T22:30:00+00:00")
    request = RequestFactory().get("/")
    request.COOKIES["smartdiet_timezone"] = cookie
    observed = []

    def respond(request):
        observed.append(timezone.localdate())
        return HttpResponse("ok")

    with timezone.override("UTC"):
        response = UserTimezoneMiddleware(respond)(request)
        assert timezone.get_current_timezone_name() == "UTC"
    assert response.status_code == 200
    assert observed == [expected]
