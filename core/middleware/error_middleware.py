import logging
from django.conf import settings
from django.shortcuts import render
from django.http import Http404, HttpResponseNotFound, HttpResponseServerError


logger = logging.getLogger(__name__)

class CustomErrorMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            return self.get_response(request)
        except Http404  as e:
            logger.warning(f"404 Not Found: {request.path} - {str(e)}")

            context = {
                "error_code": 404,
                "error_title": "Page Not Found",
                "error_message": str(e) if settings.DEBUG else "The page you are looking for does not exist."
            }

            return render(request, "error.html", context)

        except Exception as e:
            logger.exception(f"Unhandled exception at {request.path}: {e}")

            context = {
                "error_code": 500,
                "error_title": "Internal Server Error",
                "error_message": (
                    str(e) if settings.DEBUG else "An unexpected error occurred. Please try again later."
                )
            }

            return render(request, "error.html", context)
