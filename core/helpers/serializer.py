
def serialize_metric_entry(daily_metric):
    """
    Helper function to flatten the metric data.
    Combines the Daily entry, the Tracked settings, and the Base metric definition.
    """
    # Access the tracked configuration (TrackedMetrics)
    tracked = daily_metric.metric
    # Access the base definition (Metric)
    base = tracked.metric

    return {
        "id": daily_metric.id,
        "name": base.name,
        "type": base.type,           # 'daily', 'continues', etc.
        "options": base.options,     # e.g. ['High', 'Low'] for categorical
        
        "target": tracked.target,    # The goal (e.g. 2000ml)
        "goal_description": tracked.goal,

        "start_value": daily_metric.start,
        "current_value": daily_metric.value,
        "progress_score": daily_metric.calculate_score(), # 0.0 to 1.0
    }

def serialize_log(log):
    """
    Main function to convert a UserLog object into a simple dictionary.
    """
    if not log:
        return None

    # Get all metrics for this day
    metrics_qs = log.AchivedMetrics.select_related('metric__metric').all()
    
    # Manually build the list of metrics
    formatted_metrics = [serialize_metric_entry(m) for m in metrics_qs]

    return {
        "id": log.id,
        "date": log.date.strftime('%Y-%m-%d'), # string format for JS
        "plan_id": log.plan.id if log.plan else None,
        "plan_name": log.plan.base.name if log.plan and log.plan.base else "No Plan",
        
        "calculated_score": log.calculate_Total_score(), # The auto-calculated average
        "feedback": log.feedback,
        
        "metrics": formatted_metrics
    }