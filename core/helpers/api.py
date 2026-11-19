"""Validation and transaction boundaries for progress mutations."""
from functools import wraps
import json
import logging
from math import isfinite

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import Http404, JsonResponse


def api_endpoint(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        try:
            if request.method in ('GET', 'HEAD'):
                return view(request, *args, **kwargs)
            with transaction.atomic():
                get_user_model().objects.select_for_update().get(pk=request.user.pk)
                response = view(request, *args, **kwargs)
                if response.status_code >= 400:
                    transaction.set_rollback(True)
                return response
        except Http404:
            return JsonResponse({'error': 'Not found'}, status=404)
        except (ValueError, TypeError, ValidationError) as error:
            return JsonResponse({'error': str(error)}, status=400)
        except Exception:
            logging.getLogger(__name__).exception('Progress request failed')
            return JsonResponse({'error': 'Unable to save changes'}, status=500)
    return wrapped


def read_object(request):
    data = json.loads(request.body)
    if not isinstance(data, dict):
        raise ValueError('A JSON object is required')
    return data


def number(value):
    if isinstance(value, bool):
        raise ValueError('A finite number is required')
    try:
        result = float(value)
    except (ValueError, TypeError, OverflowError):
        raise ValueError('A finite number is required')
    if not isfinite(result):
        raise ValueError('A finite number is required')
    return result


def metric_value(kind, value, options):
    if kind in ('daily', 'continues'):
        result = number(value)
        return value if isinstance(value, (int, float)) else result
    if kind == 'scale':
        result = number(value)
        if not result.is_integer() or not 1 <= result <= 5:
            raise ValueError('Scale value must be an integer from 1 to 5')
        return int(result)
    if kind == 'boolean':
        if not isinstance(value, bool):
            raise ValueError('A boolean is required')
        return value
    if kind == 'category':
        if not isinstance(value, str) or (options and value not in options):
            raise ValueError('Choose a valid category')
        return value
    raise ValueError('Invalid metric type')


def validate_metric(name, kind, target, options, positive, start=None):
    if not isinstance(name, str) or not name.strip() or len(name) > 255:
        raise ValueError('A metric name is required (maximum 255 characters)')
    if kind not in ('continues', 'daily', 'boolean', 'scale', 'category'):
        raise ValueError('Invalid metric type')
    if not isinstance(positive, bool):
        raise ValueError('isPositive must be a boolean')
    if not isinstance(options, list) or (kind == 'category' and any(not isinstance(v, str) for v in options)):
        raise ValueError('Options must be a list of names')
    if kind in ('continues', 'daily'):
        if number(target) <= 0:
            raise ValueError('Target must be positive')
    elif kind == 'category' and options:
        targets = target if isinstance(target, list) else [target]
        if any(v not in options for v in targets):
            raise ValueError('Choose target categories from the options')
    if start is not None and start != '':
        metric_value(kind, start, options)
