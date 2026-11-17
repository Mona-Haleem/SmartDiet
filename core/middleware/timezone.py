"""Use the browser's validated IANA timezone for date-based tracking."""

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from urllib.parse import unquote

from django.utils import timezone


class UserTimezoneMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        name = request.COOKIES.get("smartdiet_timezone", "")
        zone = timezone.get_current_timezone()
        if name:
            try:
                zone = ZoneInfo(unquote(name))
            except (ZoneInfoNotFoundError, ValueError):
                pass
        with timezone.override(zone):
            return self.get_response(request)
