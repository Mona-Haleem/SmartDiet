from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
import os
from django.conf import settings
from django.db import models
from datetime import date, timedelta
from core.models import UserLog, DailyAchivedMetrics, TrackedMetrics


def get_current_plan(user, type):
    """
    Get the current active plan for a user by type (diet/exercise).
    Automatically fills missing logs up to today.
    Each day can have TWO logs: one for diet, one for exercise.
    
    Args:
        user: User instance
        type: 'diet' or 'exercise'
    """
    today = date.today()
    
    # Find the most recent log for this specific plan type
    last_log = UserLog.objects.filter(
        user=user, 
        plan__base__category__in=[type, 'full']
    ).order_by('-date').first()

    if not last_log:
        return None

    # If last log is today, return the plan
    if last_log.date == today:
        return last_log.plan
    
    # If last log is in the past, fill missing logs
    elif last_log.date < today:
        
        log_missing_logs(last_log.date, today, last_log, type)
        return last_log.plan
    
    return last_log.plan


def log_missing_logs(last_date, today, log, plan_type):
    """
    Fill missing logs between last_date and today with the same plan.
    Respects the plan type (diet/exercise) for proper two-log-per-day handling.
    
    Args:
        last_date: Last date that has a log
        today: Current date
        log: The last UserLog instance
        plan_type: 'diet' or 'exercise' to know which log to fill
    """
    current_date = last_date + timedelta(days=1)
    while current_date <= today:
        add_plan_by_type(log.user, log.plan, current_date, plan_type)
        current_date += timedelta(days=1)


def add_plan_by_type(user, plan, start_date, plan_type):
    """
    Add a plan log for a specific date and plan type.
    This ensures we don't accidentally overwrite the other plan type's log.
    
    Args:
        user: User instance
        plan: Plan instance
        start_date: Date for the log
        plan_type: 'diet' or 'exercise' (the actual type being added)
    """
    # Check for existing log of THIS specific plan type
    existing_log = UserLog.objects.filter(
        user=user, 
        date=start_date, 
        plan__base__category__in=[plan_type, 'full']
    ).first()

    if existing_log:
        # Update if it's not today or if we want to replace
        if start_date != date.today():
            existing_log.plan = plan
            existing_log.save()
            update_metrics(existing_log, force_reinit=True)
    else:
        # Create new log - this won't conflict with other plan type
        new_log = UserLog(user=user, date=start_date, plan=plan)
        new_log.save()
        update_metrics(new_log)    


def set_plan(user, plan, start_date, fill_duration=False, replace=False):
    """
    Set a plan for a user starting from start_date.
    Handles both diet and exercise plans, allowing two logs per day.
    
    Args:
        user: User instance
        plan: Plan instance
        start_date: Date to start the plan
        fill_duration: If True, create logs for entire plan duration
        replace: If True, replace existing logs of the same type
    """
    if fill_duration:
        end_date = start_date + plan.duration
    else:
        end_date = start_date + timedelta(days=1)
    orgReplace = replace
    # Determine the actual plan type we're setting
    plan_type = plan.base.category
    if plan_type == 'full':
        # Full plan creates both diet and exercise logs
        temp_date = start_date
        while temp_date < end_date:
            if temp_date == start_date:
                replace = True 
            else :
                replace = orgReplace
            add_plan(user, plan, temp_date, replace)
            temp_date += timedelta(days=1)
    else:
        # Diet or exercise only

        temp_date = start_date
        while temp_date < end_date:
            if temp_date == start_date:
                replace = True 
            else :
                replace = orgReplace
            print(replace)
            add_plan(user, plan, temp_date, replace)
            temp_date += timedelta(days=1)


def add_plan(user, plan, start_date, replace=False):
    """
    Add a plan log for a specific date.
    Handles multiple logs per day (one diet, one exercise).
    Initializes metrics for the log.
    
    Args:
        user: User instance
        plan: Plan instance  
        start_date: Date for the log
        replace: If True, replace existing log of same category
    """
    plan_category = plan.base.category
    print(start_date,plan)
    if plan_category == 'full':
        # Full plan should check if there are BOTH diet and exercise logs
        # For now, treat as both - this might need more sophisticated handling
        diet_log = UserLog.objects.filter(
            user=user,
            date=start_date,
            plan__base__category='diet'
        ).first()
        
        exercise_log = UserLog.objects.filter(
            user=user,
            date=start_date,
            plan__base__category='exercise'
        ).first()
        
        # Create or update diet log
        if diet_log and replace:
            diet_log.plan = plan
            diet_log.feedback = ''
            diet_log.save()
            update_metrics(diet_log, force_reinit=True)
        elif not diet_log:
            new_diet_log = UserLog(user=user, date=start_date, plan=plan)
            new_diet_log.save()
            update_metrics(new_diet_log)
        
        # Create or update exercise log  
        if exercise_log and replace:
            exercise_log.plan = plan
            exercise_log.feedback = ''
            exercise_log.save()
            update_metrics(exercise_log, force_reinit=True)
        elif not exercise_log:
            new_exercise_log = UserLog(user=user, date=start_date, plan=plan)
            new_exercise_log.save()
            update_metrics(new_exercise_log)
    else:
        # Diet or exercise only - check for existing log of THIS type only
        existing_log = UserLog.objects.filter(
            user=user,
            date=start_date,
            plan__base__category=plan_category
        ).first()
        
        if existing_log:
            print("found existing log",existing_log,replace)
            if replace or start_date == date.today() :
                existing_log.plan = plan
                existing_log.feedback = ''
                existing_log.save()
                print("plan replaced")
                update_metrics(existing_log, force_reinit=True)
        else:
            # Safe to create - won't conflict with other plan type
            new_log = UserLog(user=user, date=start_date, plan=plan)
            new_log.save()
            print("creating new log",new_log)
            update_metrics(new_log)
        if start_date == date.today():
            update_active_metrics(user)


def update_metrics(log, force_reinit=False):
    """
    Initialize DailyAchivedMetrics for a UserLog.
    Carries over values for 'continues' metrics, resets 'daily' metrics.
    Only includes metrics relevant to the log's plan type.
    
    Args:
        log: UserLog instance
        force_reinit: If True, delete existing metrics and reinitialize
    """
    if force_reinit:
        # Delete existing metrics for this log
        DailyAchivedMetrics.objects.filter(log=log).delete()
    
    plan_category = log.plan.base.category if log.plan else None
    
    # Find all active tracked metrics for this user
    all_metrics = TrackedMetrics.objects.filter(
        metric__user=log.user, 
        isActive=True
    )
    
    # Filter metrics based on plan type
    # Include metrics linked to this plan OR metrics with no plan link (global)
    # OR metrics linked to plans of the same category
    if plan_category:
        all_metrics = all_metrics.filter(
            models.Q(linkedPlan=log.plan) |
            models.Q(linkedPlan__isnull=True) |
            models.Q(linkedPlan__base__category=plan_category)
        )

    for tm in all_metrics:
        # Skip if already exists (unless force_reinit)
        if not force_reinit and DailyAchivedMetrics.objects.filter(log=log, metric=tm).exists():
            continue

        current_value = get_initial_value_for_metric(tm, log.date, plan_category)

        # Create the daily tracker
        DailyAchivedMetrics.objects.create(
            log=log,
            metric=tm,
            value=current_value
        )


def get_initial_value_for_metric(tracked_metric, log_date, plan_category=None):
    """
    Determine the initial value for a metric on a given date.
    For continuous metrics, looks for previous value in same plan category.
    
    Args:
        tracked_metric: TrackedMetrics instance
        log_date: Date of the log
        plan_category: Category of the plan ('diet', 'exercise', 'full', or None)
    
    Returns:
        Initial value for the metric
    """
    metric_type = tracked_metric.metric.type
    
    if metric_type == 'continues':
        # For continuous metrics, carry over from previous day
        # Look for previous entry in the SAME plan category
        last_entry_query = DailyAchivedMetrics.objects.filter(
            metric=tracked_metric,
            log__date__lt=log_date,
            log__user=tracked_metric.metric.user
        )
        
        # Filter by plan category if specified
        if plan_category:
            last_entry_query = last_entry_query.filter(
                log__plan__base__category__in=[plan_category, 'full']
            )
        
        last_entry = last_entry_query.order_by('-log__date').first()

        if last_entry:
            return last_entry.value
        else:
            # First time tracking - use start value or 0
            return tracked_metric.start if tracked_metric.start is not None else 0
    
    elif metric_type == 'daily':
        # Daily metrics reset to 0
        return 0
    
    elif metric_type == 'boolean':
        # Boolean defaults to False
        return False
    
    elif metric_type == 'scale':
        # Scale defaults to middle value (3) or start value
        if tracked_metric.start is not None:
            try:
                return max(1, min(5, int(tracked_metric.start)))
            except (ValueError, TypeError):
                return 3
        return 3
    
    elif metric_type == 'category':
        # Category defaults to first option or start value
        if tracked_metric.start:
            return tracked_metric.start
        
        options = tracked_metric.metric.options
        if options and len(options) > 0:
            return options[0]
        
        return "no entry"
    
    # Default fallback
    return 0


def sync_user_metrics(user, date_from=None, date_to=None):
    """
    Ensure all active metrics are present in logs for a date range.
    Useful for adding new metrics to historical logs.
    
    Args:
        user: User instance
        date_from: Start date (default: first log date)
        date_to: End date (default: today)
    """
    if date_from is None:
        first_log = UserLog.objects.filter(user=user).order_by('date').first()
        date_from = first_log.date if first_log else date.today()
    
    if date_to is None:
        date_to = date.today()
    
    # Get all logs in range
    logs = UserLog.objects.filter(
        user=user,
        date__gte=date_from,
        date__lte=date_to
    ).order_by('date')
    
    for log in logs:
        update_metrics(log, force_reinit=False)


def cleanup_inactive_metrics(user):
    """
    Delete inactive tracked metrics that have no associated daily entries.
    
    Args:
        user: User instance
    
    Returns:
        Number of metrics deleted
    """
    # Find inactive tracked metrics with no daily entries
    inactive_metrics = TrackedMetrics.objects.filter(
        metric__user=user,
        isActive=False
    ).exclude(
        id__in=DailyAchivedMetrics.objects.values_list('metric_id', flat=True)
    )
    
    count = 0
    for tm in inactive_metrics:
        base_metric = tm.metric
        tm.delete()
        
        # Delete base metric if no other tracked metrics reference it
        if not TrackedMetrics.objects.filter(metric=base_metric).exists():
            base_metric.delete()
            count += 1
    
    return count


def update_active_metrics(user):
    if not user:
        return
    # Get current plans
    current_diet_plan = get_current_plan(user, 'diet')
    current_exercise_plan = get_current_plan(user, 'exercise')
    current_plans = set(filter(None, [current_diet_plan, current_exercise_plan]))

    # All tracked metrics for this user
    tracked_metrics = TrackedMetrics.objects.filter(metric__user=user)
    activeMetrics = TrackedMetrics.objects.filter(
        metric__user=user,
        linkedPlan__in=current_plans
    )

    for tm in tracked_metrics:
     
        if tm in activeMetrics:
            tm.isActive = True
        elif tm.linkedPlan is not None:
            tm.isActive = False

        tm.save()
