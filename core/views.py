from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse
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
from django.db.models import Avg, Q, F
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
            "exercise":serializers.plan([exercies_plan],request)[0] if diet_plan else {}
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
        start_date = date.today()

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

def assignedPlans(request):

    year = int(request.GET.get('year', date.today().year))
    month = int(request.GET.get('month', date.today().month))

    first_day = date(year, month, 1)
    last_day = date(year, month, monthrange(year, month)[1])

    logs = UserLog.objects.filter(
        user=request.user,
        date__gte=first_day,
        date__lte=last_day
    ).select_related('plan__base').order_by('date')


    plans_data = {}

    for log in logs:

        date_str = log.date.isoformat()
        plan_category = log.plan.base.category

        if date_str not in plans_data:
            plans_data[date_str] = {
                'diet': False,
                'dietDay': None,
                'exercise': False,
                'exerciseDay': None
            }

        plan_start = UserLog.objects.filter(
            user=request.user,
            plan=log.plan
        ).order_by('date').first()

        if plan_start:
            day_number = (log.date - plan_start.date).days + 1
        else:
            day_number = 1


        if plan_category == 'diet' or plan_category == 'exercise':
            plans_data[date_str][plan_category] = {
                "plan_name" :log.plan.base.name ,
                "plan_id":log.plan.id
                }
            plans_data[date_str]['dietDay'] = day_number
        elif plan_category == 'full':
            plans_data[date_str]['diet'] = True
            plans_data[date_str]['dietDay'] = {
                "plan_name" :log.plan.base.name ,
                "plan_id":log.plan.id
                }
            plans_data[date_str]['exercise'] = True
            plans_data[date_str]['exerciseDay'] = {
                "plan_name" :log.plan.base.name ,
                "plan_id":log.plan.id
                }


    return JsonResponse({'plans': plans_data})


@login_required
def avgScore(request):

    plan_type = request.GET.get('type', 'diet')
    period = request.GET.get('period', 'month')
    date_str = request.GET.get('date', date.today().isoformat())


    selected_date = datetime.fromisoformat(date_str).date()

    if period == 'day':
        start_date = end_date = selected_date
    elif period == 'week':
        start_date = selected_date - timedelta(days=selected_date.weekday())
        end_date = start_date + timedelta(days=6)
    elif period == 'month':
        start_date = selected_date.replace(day=1)
        end_date = date(
            selected_date.year,
            selected_date.month,
            monthrange(selected_date.year, selected_date.month)[1]
        )
    else:
        start_date = selected_date.replace(month=1, day=1)
        end_date = selected_date.replace(month=12, day=31)


    logs = UserLog.objects.filter(
        user=request.user,
        date__gte=start_date,
        date__lte=end_date
    )

    if period == 'day':
        if plan_type == 'diet':
            logs = logs.filter(Q(plan__base__category='diet') | Q(plan__base__category='full'))
            others = logs.filter(Q(plan__base__category='exercise') | Q(plan__base__category='full'))
        elif plan_type == 'exercise':
            others = logs.filter(Q(plan__base__category='diet') | Q(plan__base__category='full'))
            logs = logs.filter(Q(plan__base__category='exercise') | Q(plan__base__category='full'))


    total_score = 0
    count = 0
    if logs and logs.count() == 0 and others and others.count() > 0:
        logs = others
    for log in logs:
        score = log.calculate_Total_score()
        total_score += score
        count += 1
    
    avg_score = (total_score / count) if count > 0 else 0
    print("======Average score:=======", avg_score)

    return JsonResponse({'avgScore': round(avg_score, 2)})


@login_required
def dayaData(request):

    date_str = request.GET.get("date")
    plan_type = request.GET.get("type")

    if not date_str or plan_type not in ['diet', 'exercise']:
        return JsonResponse({"error": "date and valid type are required"}, status=400)

    try:
        day_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse({"error": "Invalid date format"}, status=400)

    dayLogs = UserLog.objects.filter(user=request.user, date=day_date).select_related("plan", "plan__base")
    log = dayLogs.filter(plan__base__category=plan_type).first()
    other= dayLogs.exclude(plan__base__category=plan_type).first()

    planData = {
        "plan_name": "",
        "plan_goal": "",
        "current_day": 1,
        "plan_sections":[],
        
    } 
    if not log and day_date == date.today():
        plan = get_current_plan(request.user,plan_type)
    elif log:
        plan = log.plan

    if plan :
        if plan.base.category == 'full':
            linked = getattr(plan, "linked_plan", None)

            if not linked:
                return JsonResponse({"error": "Linked plan missing"}, status=404)

            plan = linked.diet_plan if plan_type == 'diet' else linked.exercise_plan

        start_log = (
            UserLog.objects
            .filter(user=request.user, plan=plan, date__lte=day_date)
            .order_by("date")
            .first()
        )

        current_day = (day_date - start_log.date).days + 1 if start_log else 1

        plan_sections = plan.get_daily_schedule(current_day)

        planData = {
            "plan_name": plan.base.name,
            "plan_goal": plan.goal,
            "current_day": current_day,
            "plan_sections": plan_sections,
        }   

    unused_metrics = Metric.objects.filter(
        user=request.user
    ).exclude(
        trackedMetric__linkedPlan=plan
    ).values('id', 'name', 'type','options')



    if not log:
    # use other_log ONLY for metrics fallback
        metrics = []

        tracked_metrics = (
            TrackedMetrics.objects
            .filter(metric__user=request.user, isActive=True)
            .select_related("metric")
        )

        for tm in tracked_metrics:
            metric_type = tm.metric.type

            if other:
                prev_metric_log = (
                    DailyAchivedMetrics.objects
                    .filter(metric=tm, log=other)
                    .first()
                )
                value = prev_metric_log.value if prev_metric_log else None
            else:
                value = None

            # defaults if still None
            if value is None:
                if metric_type == "continues":
                    prev = (
                        DailyAchivedMetrics.objects
                        .filter(
                            metric=tm,
                            log__user=request.user,
                            log__date__lt=day_date
                        )
                        .order_by("-log__date")
                        .first()
                    )
                    value = prev.value if prev else tm.start or 0
                elif metric_type == "daily":
                    value = 0
                elif metric_type == "boolean":
                    value = tm.start or False
                elif metric_type == "scale":
                    value = tm.start or 1
                elif metric_type == "category":
                    value = tm.start or "no entry"

            metric_data = {
                "id": tm.id,
                "name": tm.metric.name,
                "type": metric_type,
                "value": value,
                "isActive":tm.isActive,
                "isPostive":tm.isPostive,
                "goal":tm.goal or tm.linkedPlan.goal if tm.linkedPlan else "",
                "target":tm.target,
                "start":tm.start
            }

            if metric_type == "scale":
                metric_data["options"] = SCALE_LEVELS
            elif metric_type == "category":
                metric_data["options"] = tm.metric.options

            metrics.append(metric_data)

        return JsonResponse({
            **planData,
            "metrics": metrics,
            "feedback": "",
            "unusedMetrics":list(unused_metrics)
        })


    achieved_metrics = DailyAchivedMetrics.objects.filter(log=log)

    metrics = []
    for entry in achieved_metrics:
        metric_data = {
            "id": entry.metric.id,
            "name": entry.metric.metric.name,
            "type": entry.metric.metric.type,
            "value": entry.value,
            "isActive":entry.metric.isActive,
            "isPostive":entry.metric.isPostive,
            "goal":entry.metric.goal or entry.metric.linkedPlan.goal if entry.metric.linkedPlan else "",
            "target": entry.metric.target,
            "start":entry.metric.start
        }
        if metric_data["type"] == 'category':
            metric_data["options"] = entry.metric.metric.options
        elif metric_data["type"] == 'scale':
            metric_data["options"] = SCALE_LEVELS
        metrics.append(metric_data)

    return JsonResponse({
        **planData,
        "metrics": metrics,
        "feedback": log.feedback or "",
        "unusedMetrics":list(unused_metrics)
    })

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
        prev_end_date = start_date - timedelta(days=365)
        prev_start_date = prev_end_date.replace(day=1)
    else:
        # Default fallback for daily or other
        prev_end_date = start_date - timedelta(days=1)
        prev_start_date = prev_end_date
    

    # 2. Fetch Logs for Chart Data
    logs = UserLog.objects.filter(
        user=user,
        date__range=(start_date, end_date)
    ).order_by("date")
    
    # Also fetch previous logs to find metrics recorded in the past
    prev_logs = UserLog.objects.filter(
        user=user,
        date__range=(prev_start_date, prev_end_date)
    )

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


@login_required
@require_http_methods(["POST"])
def create_metric(request):
    """Create a new metric and tracked metric"""
    try:
        data = json.loads(request.body)
        # Extract data
        name = data.get('name')
        metric_type = data.get('type', 'continues')
        target = data.get('target')
        goal = data.get('goal', '')
        plan_type = data.get('plan_type')
        date_str = data.get('date')
        metric_source = data.get('metricType', 'customGoal')  # 'toPlan' or 'customGoal'
        is_positive = data.get('isPositive', True)
        options = data.get('options', [])
        start_value = data.get('start', '')
        existing_metric_id = data.get('existingMetricId')  # NEW

        if not name or not target:
            return JsonResponse({'error': 'Name and target are required'}, status=400)
        
        if existing_metric_id:
            try:
                metric = Metric.objects.get(
                    id=existing_metric_id,
                    user=request.user
                )
                # Update options if they differ (for editable cases)
                if metric_type in ['category', 'scale'] and options:
                    metric.options = options
                    metric.save()
            except Metric.DoesNotExist:
                return JsonResponse({'error': 'Selected metric not found'}, status=404)
        else:
            # Create or get the base Metric
            metric, created = Metric.objects.get_or_create(
                user=request.user,
                name=name,
                type=metric_type,
                defaults={'options': options if metric_type in ['category', 'scale'] else []}
            )
            
            # If not created and options differ, update
            if not created and metric_type in ['category', 'scale']:
                metric.options = options
                metric.save()

        # Get linked plan if metricType is 'toPlan'
        linked_plan = None
        if metric_source == 'toPlan' and plan_type:
            linked_plan = get_current_plan(request.user, plan_type)
        
        # Determine start value based on metric type
        
        if not start_value:
            if metric_type == 'continues':
                # For continuous metrics, try to get the last recorded value
                last_tracked = TrackedMetrics.objects.filter(
                    metric=metric,
                    isActive=True
                ).first()
                
                if last_tracked:
                    last_entry = DailyAchivedMetrics.objects.filter(
                        metric=last_tracked
                    ).order_by('-log__date').first()
                    
                    if last_entry:
                        start_value = last_entry.value
            elif metric_type == 'boolean':
                start_value = False
            elif metric_type == 'scale':
                start_value = 1
            elif metric_type == 'category':
                start_value = options[0] if options else "no entry"
            
        # Create TrackedMetric
        tracked_metric = TrackedMetrics.objects.create(
            metric=metric,
            goal=goal,
            linkedPlan=linked_plan,
            target=target,
            start=start_value,
            isActive=True,
            isPostive=is_positive
        )
        
        # Add to current day's log if date is provided
        if date_str:
            day_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            log = UserLog.objects.filter(
                user=request.user,
                date=day_date
            ).first()
            
            if log:
                # Check if already exists
                if not DailyAchivedMetrics.objects.filter(log=log, metric=tracked_metric).exists():
                    DailyAchivedMetrics.objects.create(
                        log=log,
                        metric=tracked_metric,
                        value=start_value
                    )
        
        return JsonResponse({
            'success': True,
            'metric': {
                'id': tracked_metric.id,
                'name': name,
                'type': metric_type,
                'target': target,
                'goal': goal,
                'isActive': True
            }
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@login_required
@require_http_methods(["PUT", "PATCH"])
def update_metric(request, metric_id):
    """Update a tracked metric's configuration"""
    try:
        tracked_metric = get_object_or_404(
            TrackedMetrics,
            id=metric_id,
            metric__user=request.user
        )
        
        data = json.loads(request.body)
        
        # Update fields if provided
        if 'name' in data:
            tracked_metric.metric.name = data['name']
            tracked_metric.metric.save()
        
        if 'type' in data:
            tracked_metric.metric.type = data['type']
            tracked_metric.metric.save()
        
        if 'target' in data:
            tracked_metric.target = data['target']
        
        if 'goal' in data:
            tracked_metric.goal = data['goal']
        
        if 'start' in data:
            tracked_metric.start = data['start']
        
        if 'isPositive' in data:
            tracked_metric.isPostive = data['isPositive']
        
        if 'options' in data and tracked_metric.metric.type in ['category', 'scale']:
            tracked_metric.metric.options = data['options']
            tracked_metric.metric.save()
        
        tracked_metric.save()
        
        return JsonResponse({
            'success': True,
            'metric': {
                'id': tracked_metric.id,
                'name': tracked_metric.metric.name,
                'type': tracked_metric.metric.type,
                'target': tracked_metric.target,
                'goal': tracked_metric.goal
            }
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)



@login_required
@require_http_methods(["POST"])
def update_feedback(request):
    """Update feedback for a specific date"""
    try:
        data = json.loads(request.body)
        date_str = data.get('date')
        plan_type = data.get('plan_type')
        feedback = data.get('feedback', '')
        if not date_str:
            return JsonResponse({'error': 'Date is required'}, status=400)
        
        day_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        
        # Get or create log
        log = UserLog.objects.filter(
            user=request.user,
            date=day_date
        ).first()
        
        if not log:
            latest_log = UserLog.objects.filter(
                user=request.user,
                plan__base__category__in=[plan_type, 'full']
            ).order_by('-date').first()
            
            if latest_log:
                plan = latest_log.plan
            # Create a log without a plan if none exists
            log = UserLog.objects.create(
                user=request.user,
                date=day_date,
                feedback=feedback,
                plan=plan
            )
        else:
            log.feedback = feedback
            log.save()
        return JsonResponse({
            'success': True,
            'feedback': feedback
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_http_methods(["PATCH"])
def update_metric_value(request, metric_id):
    """Update daily metric value - creates log if needed"""
    try:
        data = json.loads(request.body)
        value = data.get('value')
        date_str = data.get('date')
        plan_type = data.get('plan_type')  # 'diet' or 'exercise'
        
        if value is None:
            return JsonResponse({'error': 'Value is required'}, status=400)
        
        if not plan_type or plan_type not in ['diet', 'exercise']:
            return JsonResponse({'error': 'Valid plan_type (diet/exercise) is required'}, status=400)
        
        # Get the tracked metric
        tracked_metric = get_object_or_404(
            TrackedMetrics,
            id=metric_id,
            metric__user=request.user
        )
        
        # Parse date
        if date_str:
            day_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        else:
            day_date = date.today()
        
        # Try to find existing log for this date and plan type
        log = UserLog.objects.filter(
            user=request.user,
            date=day_date,
            plan__base__category__in=[plan_type, 'full']
        ).first()
        
        # If no log exists, create one
        if not log:
            # Determine which plan to use for the new log
            plan_to_use = None
            
            # Option 1: Check if this metric is linked to a plan of the same type
            if tracked_metric.linkedPlan and tracked_metric.linkedPlan.base.category in [plan_type, 'full']:
                plan_to_use = tracked_metric.linkedPlan
            
            # Option 2: Get the latest plan used for this plan type
            if not plan_to_use:
                latest_log = UserLog.objects.filter(
                    user=request.user,
                    plan__base__category__in=[plan_type, 'full']
                ).order_by('-date').first()
                
                if latest_log:
                    plan_to_use = latest_log.plan
            # If still no plan found, we can't create a log
            if not plan_to_use:
                return JsonResponse({
                    'error': f'No {plan_type} plan found. Please set a plan first.'
                }, status=404)
            
            # Create the log with the determined plan
            log = UserLog.objects.create(
                user=request.user,
                date=day_date,
                plan=plan_to_use
            )
            
            # Initialize metrics for this new log
            from core.helpers.assigned_plans import update_metrics
            update_metrics(log)
        
        # Get or create daily metric entry
        daily_metric, created = DailyAchivedMetrics.objects.get_or_create(
            log=log,
            metric=tracked_metric,
            defaults={'value': value}
        )
        
        if not created:
            daily_metric.value = value
            daily_metric.save()
        
        return JsonResponse({
            'success': True,
            'value': value,
            'score': daily_metric.calculate_score(),
            'log_created': not log.pk if created else False
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_http_methods(["PATCH"])
def toggle_metric_active(request, metric_id):
    """Activate or deactivate a tracked metric"""
    try:
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
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_http_methods(["DELETE"])
def delete_metric(request, metric_id):
    """Delete a tracked metric if not associated with any logs"""
    try:
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
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_http_methods(["GET"])
def get_inactive_metrics(request):
    """Get all inactive metrics for the user"""
    try:
        inactive_metrics = TrackedMetrics.objects.filter(
            metric__user=request.user,
            isActive=False
        ).select_related('metric', 'linkedPlan')
        
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
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_http_methods(["POST"])
def set_current_plan(request):
    """Set the current plan for a user"""
    try:
        data = json.loads(request.body)
        plan_id = data.get('plan_id')
        start_date_str = data.get('start_date')
        replace = data.get('replace', True)
        
        if not plan_id:
            return JsonResponse({'error': 'Plan ID is required'}, status=400)
        
        plan = get_object_or_404(Plan, id=plan_id, base__creator=request.user)
        
        if start_date_str:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        else:
            start_date = date.today()
        print("replace",replace,start_date)
        # Use helper function to set plan
        set_plan(request.user, plan, start_date, True, replace)
        
        return JsonResponse({
            'success': True,
            'plan': serializers.plan([plan],request)[0]
        })
        
    except Exception as e:
        print(e)
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_http_methods(["POST"])
def cleanup_unused_metrics(request):
    """Delete metrics that have no associated data"""
    try:
        # Find tracked metrics with no daily entries
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
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)