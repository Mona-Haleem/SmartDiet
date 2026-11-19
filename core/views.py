from core.helpers.api import api_endpoint, read_object, validate_metric, metric_value
from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, Http404
from django.template import loader
from users.models import User
from users.forms import login_form , register_form
from healthHub.models import Plan ,serializers
from core.models import UserLog ,DailyAchivedMetrics
from core.helpers.assigned_plans import *
from core.helpers import helpers as utils

from core.helpers.serializer import serialize_log
from datetime import date, timedelta ,datetime
from calendar import monthrange
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
from django.utils.timezone import make_aware
from django.db.models import Prefetch
from core.helpers.helpers import get_period_range
from django.db.models import Avg, Q, F, Min
from django.utils import timezone
import json
from collections import defaultdict
from django.db.models import Prefetch

from core.models import UserLog, DailyAchivedMetrics, TrackedMetrics, Metric , SCALE_LEVELS
from healthHub.models import Plan
from users.models import User

# Create your views here.
def index(request,slug="login"):
    if request.user.is_authenticated:
        #user = User.objects.get()
        allPlans = list(
            Plan.objects.filter(base__creator=request.user)
            .values(
              "id",
               name=F("base__name"),
               category=F("base__category"),
            )
        )
        diet_plan = get_current_plan(request.user, "diet")
        exercies_plan = get_current_plan(request.user, "exercise")
        plans = {
            "diet": serializers.plan([diet_plan],request)[0] if diet_plan else {},
            "exercise":serializers.plan([exercies_plan],request)[0] if exercies_plan else {}
        }
        print("plans:===========>",
              #plans,
              allPlans
              )
        return render(request, 'index.html',{
            "slug":"",
            "user":request.user.serialize(),
            "todayPlans":plans,
            "allPlans":allPlans,
            "recipeCategories":[""]
            })
    else:
        form = login_form.LoginForm() if slug == "login" else register_form.RegisterForm()
        return render(request, 'auth.html', {
            "form": form,
            "slug": slug ,
        })

@login_required
def logs(request):
    userLogs = UserLog.objects.filter(user=request.user).order_by("date")
    if userLogs and userLogs[0]:
        start_date = userLogs[0].date.strftime('%Y-%m-%d')
    else:
        start_date = timezone.localdate().isoformat()

    allPlans = list(
        Plan.objects.filter(base__creator=request.user)
        .values(
            "id",
            name=F("base__name"),
            category=F("base__category"),
        )
    )

    print("=======start_date========",start_date)
    return render(request, 'logs.html',{
        "startDate":start_date,
        "allPlans":allPlans,
        "recipeCategories":[""]
    })

@login_required
def assignedPlans(request):

    try:
        year = int(request.GET.get('year', timezone.localdate().year))
        month = int(request.GET.get('month', timezone.localdate().month))
        first_day = date(year, month, 1)
        last_day = date(year, month, monthrange(year, month)[1])
    except (ValueError, TypeError):
        return JsonResponse({'error': 'Invalid calendar month'}, status=400)

    logs = list(UserLog.objects.filter(
        user=request.user,
        date__gte=first_day,
        date__lte=last_day
    ).select_related('plan__base').order_by('date', 'pk'))
    starts = dict(UserLog.objects.filter(
        user=request.user, plan_id__in={log.plan_id for log in logs if log.plan_id}
    ).values('plan_id').annotate(start=Min('date')).values_list('plan_id', 'start'))
    plans_data = {}

    for log in logs:
        if log.plan is None:
            continue

        date_str = log.date.isoformat()
        plan_category = log.plan.base.category

        if date_str not in plans_data:
            plans_data[date_str] = {
                'diet': False,
                'dietDay': None,
                'exercise': False,
                'exerciseDay': None
            }

        day_number = (log.date - starts[log.plan_id]).days + 1
        categories = ('diet', 'exercise') if plan_category == 'full' else (plan_category,)
        for category in categories:
            plans_data[date_str][category] = {
                "plan_name": log.plan.base.name, "plan_id": log.plan_id,
            }
            plans_data[date_str][f'{category}Day'] = day_number


    return JsonResponse({'plans': plans_data})


@login_required
@api_endpoint
def avgScore(request):
    slot = request.GET.get('type', 'diet')
    period = request.GET.get('period', 'month')
    if slot not in ('diet', 'exercise') or period not in ('day', 'week', 'month', 'year'):
        raise ValueError('Invalid type or period')
    selected = datetime.strptime(request.GET.get('date', timezone.localdate().isoformat()), '%Y-%m-%d').date()
    start, end = utils.get_period_dates(period, selected)
    entries = DailyAchivedMetrics.objects.filter(
        Q(metric__linkedPlan__isnull=True) | Q(metric__linkedPlan__base__category__in=[slot, 'full'])
    ).select_related('metric__metric')
    logs = list(UserLog.objects.filter(user=request.user, date__range=(start, end),
        plan__base__category__in=[slot, 'full']).prefetch_related(Prefetch('AchivedMetrics', queryset=entries)))
    average = sum(log.calculate_Total_score() for log in logs) / len(logs) if logs else 0
    return JsonResponse({'avgScore': round(average, 2)})


@login_required
@api_endpoint
def dayaData(request):
    slot = request.GET.get('type')
    if slot not in ('diet', 'exercise') or not request.GET.get('date'):
        raise ValueError('Date and valid type are required')
    day = datetime.strptime(request.GET['date'], '%Y-%m-%d').date()
    def daily_logs():
        return list(UserLog.objects.filter(user=request.user, date=day).select_related('plan__base'))
    logs = daily_logs()
    log = next((item for item in logs if item.plan and item.plan.base.category in (slot, 'full')), None)
    if log is None and day == timezone.localdate():
        get_current_plan(request.user, slot)
        logs = daily_logs()
        log = next((item for item in logs if item.plan and item.plan.base.category in (slot, 'full')), None)
    assignment = log.plan if log else None
    plan = assignment
    linked_ids = [plan.pk] if plan else []
    plan_data = {'plan_name': '', 'plan_goal': '', 'current_day': 1, 'plan_sections': []}
    if plan:
        if plan.base.category == 'full':
            linked = getattr(plan, 'linked_plan', None)
            plan = getattr(linked, slot + '_plan', None) if linked else None
            if plan is None:
                return JsonResponse({'error': 'Linked plan missing'}, status=404)
            linked_ids.append(plan.pk)
        first = UserLog.objects.filter(user=request.user, plan=assignment, date__lte=day).order_by('date').first()
        current_day = (day - first.date).days + 1 if first else 1
        plan_data = {'planId': plan.pk, 'plan_name': plan.base.name, 'plan_goal': plan.goal,
            'current_day': current_day, 'plan_sections': plan.get_daily_schedule(current_day)}
    entries = list(DailyAchivedMetrics.objects.filter(log__user=request.user, log__date=day).select_related('metric__metric', 'metric__linkedPlan__base').order_by('pk'))
    selected = {e.metric_id: (e.metric, e.value) for e in entries if log and e.log_id == log.pk
        and (e.metric.linkedPlan_id is None or e.metric.linkedPlan_id in linked_ids)}
    # Global values are shared, including false/zero and values first saved in the other slot.
    for entry in entries:
        if entry.metric.linkedPlan_id is None:
            selected[entry.metric_id] = (entry.metric, entry.value)
    active = TrackedMetrics.objects.filter(metric__user=request.user, isActive=True).filter(
        Q(linkedPlan__isnull=True) | Q(linkedPlan_id__in=linked_ids)
    ).select_related('metric', 'linkedPlan__base')
    for tracker in active:
        if tracker.pk not in selected:
            value = get_initial_value_for_metric(tracker, day, slot)
            if tracker.metric.type == 'category' and tracker.start == '':
                value = 'no entry'
            selected[tracker.pk] = (tracker, value)
    metrics = []
    for tracker, value in selected.values():
        item = {'id': tracker.pk, 'name': tracker.metric.name, 'type': tracker.metric.type, 'value': value,
            'isActive': tracker.isActive, 'isPostive': tracker.isPostive,
            'goal': tracker.goal or (tracker.linkedPlan.goal if tracker.linkedPlan else ''),
            'target': tracker.target, 'start': tracker.start}
        if tracker.metric.type in ('category', 'scale'):
            item['options'] = SCALE_LEVELS if tracker.metric.type == 'scale' else tracker.metric.options
        metrics.append(item)
    unused = Metric.objects.filter(user=request.user).exclude(trackedMetric__linkedPlan=plan).values('id', 'name', 'type', 'options')
    return JsonResponse({**plan_data, 'metrics': metrics, 'feedback': log.feedback or '' if log else '', 'unusedMetrics': list(unused)})


@login_required
def period_progress_view(request):

    user = request.user
    period = request.GET.get("period", "week")
    date_str = request.GET.get("date")


    if not date_str:
        return JsonResponse({"error": "date is required"}, status=400)

    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse({"error": "Invalid date format"}, status=400)

    slot = request.GET.get('type')
    if period not in ('day', 'week', 'month', 'year') or (slot and slot not in ('diet', 'exercise')):
        return JsonResponse({'error': 'Invalid type or period'}, status=400)

    # 1. Determine Date Ranges
    start_date, end_date = utils.get_period_dates(period, date_obj)

    # Calculate Previous Period Range (for comparison)
    if period == 'week':
        prev_end_date = start_date - timedelta(days=1)
        prev_start_date = prev_end_date - timedelta(days=6)
    elif period == 'month':
        prev_end_date = start_date - timedelta(days=1)
        prev_start_date = prev_end_date.replace(day=1)
    elif period =='year':
        prev_end_date = start_date - timedelta(days=1)
        prev_start_date = prev_end_date.replace(month=1, day=1)
    else:
        # Default fallback for daily or other
        prev_end_date = start_date - timedelta(days=1)
        prev_start_date = prev_end_date


    # 2. Fetch Logs for Chart Data
    logs = UserLog.objects.filter(
        user=user,
        date__range=(start_date, end_date)
    ).order_by("date").prefetch_related(Prefetch(
        'AchivedMetrics', queryset=DailyAchivedMetrics.objects.select_related('metric__metric')
    ))

    # Also fetch previous logs to find metrics recorded in the past
    prev_logs = UserLog.objects.filter(
        user=user,
        date__range=(prev_start_date, prev_end_date)
    )

    if slot:
        scope = Q(metric__linkedPlan__isnull=True) | Q(metric__linkedPlan__base__category__in=[slot, 'full'])
        logs = logs.filter(plan__base__category__in=[slot, 'full']).prefetch_related(None).prefetch_related(Prefetch(
            'AchivedMetrics', queryset=DailyAchivedMetrics.objects.filter(scope).select_related('metric__metric')))
        prev_logs = prev_logs.filter(plan__base__category__in=[slot, 'full'])

    # 3. Build Chart Data
    from collections import defaultdict

    aggregated = defaultdict(list)

    for log in logs:
        score = log.calculate_Total_score()
        metric_data = {}
        for m in log.AchivedMetrics.all():
            metric_data[m.metric.id] = round(m.calculate_score() * 100, 2)

        aggregated[log.date].append({"overall_score": score, "metrics": metric_data})

    chart_data = []

    for date, entries in aggregated.items():
        if len(entries) == 1:
            chart_data.append({"date": date, **entries[0]})
        else:
            avg_score = round(sum(e["overall_score"] for e in entries) / len(entries), 2)

            all_metrics = defaultdict(list)
            for e in entries:
                for metric_id, value in e["metrics"].items():
                    all_metrics[metric_id].append(value)

            avg_metrics = {mid: round(sum(vals)/len(vals), 2) for mid, vals in all_metrics.items()}

            chart_data.append({"date": date, "overall_score": avg_score, "metrics": avg_metrics})



    # Fetch current period metric entries
    current_period_entries = DailyAchivedMetrics.objects.filter(
        log__in=logs
    ).select_related('metric', 'metric__metric', 'log')

    # Fetch previous period metric entries
    prev_period_entries = DailyAchivedMetrics.objects.filter(
        log__in=prev_logs
    ).select_related('metric', 'metric__metric', 'log')

    if slot:
        current_period_entries = current_period_entries.filter(scope)
        prev_period_entries = prev_period_entries.filter(scope)

    # 5. Group Data by Metric ID
    # structure: { metric_id: { 'current': [records], 'prev': [records] } }
    grouped_metrics = defaultdict(lambda: {'current': [], 'prev': []})

    for entry in current_period_entries:
        grouped_metrics[entry.metric.id]['current'].append(entry)

    for entry in prev_period_entries:
        grouped_metrics[entry.metric.id]['prev'].append(entry)

    # 6. Generate Metrics Map
    metrics_list = []

    for metric_id, data in grouped_metrics.items():
        # Only process if we have data in the current period
        if data['current']:
            formatted = utils.formatMetricPeriodSummery(data['current'], data['prev'])
            if formatted:
                metrics_list.append(formatted)


    return JsonResponse({
        "metrics": metrics_list,
        "chart_data": chart_data
    }, safe=False)

from django.views.decorators.http import require_http_methods
from django.shortcuts import get_object_or_404

from core.helpers.assigned_plans import set_plan, get_current_plan


def history_is_editable(day):
    return 0 <= (timezone.localdate() - day).days <= 30


@login_required
@require_http_methods(["POST"])
@api_endpoint
def create_metric(request):
    data = read_object(request)
    name = data.get('name')
    kind = data.get('type', 'continues')
    target = data.get('target')
    options = data.get('options', [])
    positive = data.get('isPositive', True)
    start = data.get('start')
    if kind == 'category' and start == 0:
        start = None
    slot = data.get('plan_type', 'diet')
    if slot not in ('diet', 'exercise'):
        raise ValueError('Invalid plan_type')
    day = datetime.strptime(data['date'], '%Y-%m-%d').date() if data.get('date') else None
    if day and not history_is_editable(day):
        return JsonResponse({'error': 'Only the last 30 days can be edited'}, status=403)
    validate_metric(name, kind, target, options, positive, start)
    if data.get('existingMetricId'):
        metric = get_object_or_404(Metric, pk=data['existingMetricId'], user=request.user)
        if metric.type != kind:
            raise ValueError('Metric type does not match its definition')
        metric.options = options if kind in ('category', 'scale') else []
        metric.save(update_fields=['options'])
    else:
        metric, _ = Metric.objects.get_or_create(user=request.user, name=name, type=kind,
            defaults={'options': options})
        if kind in ('category', 'scale'):
            metric.options = options
            metric.save(update_fields=['options'])
    linked_plan = get_current_plan(request.user, slot) if data.get('metricType') == 'toPlan' else None
    if start is None or start == '':
        if kind == 'continues':
            previous = TrackedMetrics.objects.filter(metric=metric, isActive=True).first()
            last = DailyAchivedMetrics.objects.filter(metric=previous, log__date__lte=day or timezone.localdate()).order_by('-log__date', '-pk').first() if previous else None
            start = last.value if last else (previous.start if previous else 0)
        else:
            start = {'daily': 0, 'boolean': False, 'scale': 1, 'category': options[0] if options else 'no entry'}.get(kind, 0)
    tracker = TrackedMetrics.objects.create(metric=metric, goal=data.get('goal', ''), linkedPlan=linked_plan,
        target=target, start=start, isActive=True, isPostive=positive)
    if day:
        logs = UserLog.objects.filter(user=request.user, date=day)
        if linked_plan:
            logs = logs.filter(plan=linked_plan)
        for log in logs:
            DailyAchivedMetrics.objects.get_or_create(log=log, metric=tracker, defaults={'value': start})
    return JsonResponse({'success': True, 'metric': {'id': tracker.pk, 'name': name, 'type': kind,
        'target': target, 'goal': tracker.goal, 'isActive': True}})


@login_required
@require_http_methods(["PUT", "PATCH"])
@api_endpoint
def update_metric(request, metric_id):
    tracker = get_object_or_404(TrackedMetrics.objects.select_related('metric'), pk=metric_id, metric__user=request.user)
    data = read_object(request)
    base = tracker.metric
    name = data.get('name', base.name)
    kind = data.get('type', base.type)
    target = data.get('target', tracker.target)
    options = data.get('options', base.options)
    positive = data.get('isPositive', tracker.isPostive)
    start = data.get('start', tracker.start)
    validate_metric(name, kind, target, options, positive, start)
    base.name, base.type, base.options = name, kind, options
    tracker.target, tracker.start, tracker.isPostive = target, start, positive
    tracker.goal = data.get('goal', tracker.goal)
    base.save()
    tracker.save()
    return JsonResponse({'success': True, 'metric': {'id': tracker.pk, 'name': name, 'type': kind,
        'target': target, 'goal': tracker.goal}})


@login_required
@require_http_methods(["POST"])
@api_endpoint
def update_feedback(request):
    data = read_object(request)
    day = datetime.strptime(data.get('date', ''), '%Y-%m-%d').date()
    slot = data.get('plan_type', 'diet')
    if slot not in ('diet', 'exercise') or not isinstance(data.get('feedback', ''), str):
        raise ValueError('Invalid feedback or plan_type')
    if not history_is_editable(day):
        return JsonResponse({'error': 'Only the last 30 days can be edited'}, status=403)
    log = UserLog.objects.filter(user=request.user, date=day, plan__base__category__in=[slot, 'full']).first()
    if log is None:
        previous = UserLog.objects.filter(user=request.user, date__lte=day,
            plan__base__category__in=[slot, 'full']).order_by('-date', '-pk').first()
        log, _ = UserLog.objects.get_or_create(user=request.user, date=day, plan=previous.plan if previous else None)
    log.feedback = data.get('feedback', '')
    log.save(update_fields=['feedback'])
    return JsonResponse({'success': True, 'feedback': log.feedback})


@login_required
@require_http_methods(["PATCH"])
@api_endpoint
def update_metric_value(request, metric_id):
    data = read_object(request)
    slot = data.get('plan_type')
    if slot not in ('diet', 'exercise') or data.get('value') is None:
        raise ValueError('Value and valid plan_type are required')
    tracker = get_object_or_404(TrackedMetrics.objects.select_related('metric', 'linkedPlan__base'), pk=metric_id, metric__user=request.user)
    value = metric_value(tracker.metric.type, data['value'], tracker.metric.options)
    day = datetime.strptime(data['date'], '%Y-%m-%d').date() if data.get('date') else timezone.localdate()
    if not history_is_editable(day):
        return JsonResponse({'error': 'Only the last 30 days can be edited'}, status=403)
    log = UserLog.objects.filter(user=request.user, date=day, plan__base__category__in=[slot, 'full']).first()
    log_created = log is None
    if log is None:
        plan = tracker.linkedPlan if tracker.linkedPlan and tracker.linkedPlan.base.category in (slot, 'full') else None
        if plan is None:
            previous = UserLog.objects.filter(user=request.user, date__lte=day,
                plan__base__category__in=[slot, 'full']).order_by('-date', '-pk').first()
            plan = previous.plan if previous else None
        if plan is None:
            return JsonResponse({'error': 'Set a matching plan first'}, status=404)
        log = UserLog.objects.create(user=request.user, date=day, plan=plan)
        update_metrics(log)
    entry, _ = DailyAchivedMetrics.objects.get_or_create(log=log, metric=tracker, defaults={'value': value})
    entry.value = value
    entry.save(update_fields=['value'])
    if tracker.linkedPlan_id is None:
        # Existing daily slots contain copies for compatibility with historical data.
        # Keep them synchronized; initialize subsequent slots from this same-day value.
        DailyAchivedMetrics.objects.filter(metric=tracker, log__user=request.user, log__date=day).update(value=value)
        for other in UserLog.objects.filter(user=request.user, date=day).exclude(pk=log.pk):
            DailyAchivedMetrics.objects.get_or_create(log=other, metric=tracker, defaults={'value': value})
    return JsonResponse({'success': True, 'value': value, 'score': entry.calculate_score(), 'log_created': log_created})


@login_required
@require_http_methods(["PATCH"])
@api_endpoint
def toggle_metric_active(request, metric_id):
    """Activate or deactivate a tracked metric"""
    tracked_metric = get_object_or_404(
        TrackedMetrics,
        id=metric_id,
        metric__user=request.user
    )


    tracked_metric.isActive = not tracked_metric.isActive
    tracked_metric.save()

    return JsonResponse({
        'success': True,
        'isActive': tracked_metric.isActive
    })


@login_required
@require_http_methods(["DELETE"])
@api_endpoint
def delete_metric(request, metric_id):
    """Delete a tracked metric if not associated with any logs"""
    tracked_metric = get_object_or_404(
        TrackedMetrics,
        id=metric_id,
        metric__user=request.user
    )

    # Check if metric has any associated daily entries
    has_entries = DailyAchivedMetrics.objects.filter(metric=tracked_metric).exists()

    if has_entries:
        # Instead of deleting, just deactivate
        tracked_metric.isActive = False
        tracked_metric.save()
        return JsonResponse({
            'success': True,
            'message': 'Metric deactivated (has historical data)',
            'deactivated': True
        })
    else:
        # Safe to delete
        base_metric = tracked_metric.metric
        tracked_metric.delete()

        # Delete base metric if no other tracked metrics reference it
        if not TrackedMetrics.objects.filter(metric=base_metric).exists():
            base_metric.delete()

        return JsonResponse({
            'success': True,
            'message': 'Metric deleted',
            'deleted': True
        })


@login_required
@require_http_methods(["GET"])
@api_endpoint
def get_inactive_metrics(request):
    """Get all inactive metrics for the user"""
    inactive_metrics = TrackedMetrics.objects.filter(
        metric__user=request.user,
        isActive=False
    ).select_related('metric', 'linkedPlan__base')

    metrics_list = []
    for tm in inactive_metrics:
        metrics_list.append({
            'id': tm.id,
            'name': tm.metric.name,
            'type': tm.metric.type,
            'target': tm.target,
            'goal': tm.goal,
            'linkedPlan': tm.linkedPlan.base.name if tm.linkedPlan else None
        })

    return JsonResponse({'metrics': metrics_list})


@login_required
@require_http_methods(["POST"])
@api_endpoint
def set_current_plan(request):
    """Set the current plan for a user"""
    data = read_object(request)
    plan_id = data.get('plan_id')
    start_date_str = data.get('start_date')
    replace = data.get('replace', True)

    if not plan_id:
        return JsonResponse({'error': 'Plan ID is required'}, status=400)

    plan = get_object_or_404(Plan, id=plan_id, base__creator=request.user)

    if start_date_str:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
    else:
        start_date = timezone.localdate()
    if start_date < timezone.localdate():
        return JsonResponse({'error': 'Plans must start today or later'}, status=400)
    print("replace",replace,start_date)
    # Use helper function to set plan
    set_plan(request.user, plan, start_date, True, replace)

    return JsonResponse({
        'success': True,
        'plan': serializers.plan([plan],request)[0]
    })


@login_required
@require_http_methods(["POST"])
@api_endpoint
def cleanup_unused_metrics(request):
    """Delete metrics that have no associated data"""
    unused_tracked = TrackedMetrics.objects.filter(
        metric__user=request.user,
        isActive=False
    ).exclude(
        id__in=DailyAchivedMetrics.objects.values_list('metric_id', flat=True)
    )

    count = 0
    for tm in unused_tracked:
        base_metric = tm.metric
        tm.delete()

        # Delete base metric if no other tracked metrics reference it
        if not TrackedMetrics.objects.filter(metric=base_metric).exists():
            base_metric.delete()
            count += 1

    return JsonResponse({
        'success': True,
        'deleted_count': count
    })
