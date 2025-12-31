from datetime import timedelta 
from core.models import  SCALE_LEVELS

def get_period_range(period, date):
    """
    Returns (start_date, end_date)
    """
    if period == "day":
        return date, date

    if period == "week":
        start = date - timedelta(days=date.weekday())
        end = start + timedelta(days=6)
        return start, end

    if period == "month":
        start = date.replace(day=1)
        if start.month == 12:
            end = start.replace(year=start.year + 1, month=1) - timedelta(days=1)
        else:
            end = start.replace(month=start.month + 1) - timedelta(days=1)
        return start, end

    return date, date


def get_period_dates(period, ref_date):
    """
    Calculate start and end dates for a given period ('week', 'month')
    based on a reference date.
    """
    if period == 'week':
        # Start of week (Monday = 0)
        start_date = ref_date - timedelta(days=ref_date.weekday())
        end_date = start_date + timedelta(days=6)
    elif period == 'month':
        # Start of month
        start_date = ref_date.replace(day=1)
        # End of month logic
        next_month = start_date.replace(day=28) + timedelta(days=4)
        end_date = next_month - timedelta(days=next_month.day)
    elif period == 'year':
        start_date = ref_date.replace(day=1,month=1)
        end_date = start_date.replace(year=start_date.year+1) - timedelta(days=1)
        
    else:
        # Default to single day
        start_date = end_date = ref_date
    return start_date, end_date

def formatMetricPeriodSummery(allRecords, prevPeriodRecords):
    """
    Calculates summary statistics based on specific comments for each metric type.
    """
    if not allRecords:
        return None

    # Sort records by date to ensure order
    allRecords.sort(key=lambda x: x.log.date)
    if prevPeriodRecords:
        prevPeriodRecords.sort(key=lambda x: x.log.date)
    
    # Get basic metric info from the first record
    metric_entry = allRecords[0]
    metric_tracker = metric_entry.metric
    metric_def = metric_tracker.metric
    metric_type = metric_def.type

    # --- Pre-calculation of aggregates ---
    
    # Helper for safe float conversion
    def safe_float(val, default=0.0):
        try:
            return float(val)
        except (ValueError, TypeError):
            return default

    # Current Period Scores
    curr_scores = [r.calculate_score() for r in allRecords]
    avg_score_curr = sum(curr_scores) / len(curr_scores) if curr_scores else 0
    
    # Previous Period Scores
    if prevPeriodRecords:
        prev_scores = [r.calculate_score() for r in prevPeriodRecords]
        avg_score_prev = sum(prev_scores) / len(prev_scores) if prev_scores else 0
    else:
        avg_score_prev = 0 if metric_tracker.isPostive else 1

    # Initialize the formatted object
    formatted_metric = {
        "id": metric_tracker.id,
        "name": metric_def.name,
        "type": metric_type,
        "score": avg_score_curr,
        "change": 0,
        "startValue": 0,
        "currentValue": 0,
        "target": metric_tracker.target
    }

    start_tracker_val = safe_float(metric_tracker.start, 0.0)
    
    # Direction multiplier: (bool metric.isPostive)
    direction = 1 if metric_tracker.isPostive else -1
    
    # --- Type Specific Logic ---

    if metric_type == 'continues':
        # "startValue": the first record value (of current period)
        formatted_metric["startValue"] = float(prevPeriodRecords[-1].value) if prevPeriodRecords else float(start_tracker_val)
        
        # "currentValue": the current recored value (of current period)
        formatted_metric["currentValue"] = float(allRecords[-1].value)
        formatted_metric["change"] = round(formatted_metric["currentValue"] - formatted_metric["startValue"],2) * direction

    elif metric_type == 'daily':
        if prevPeriodRecords:
            vals = [safe_float(r.value) for r in prevPeriodRecords]
            formatted_metric["startValue"] = round(sum(vals) / len(vals),2) if vals else 0
        else:
            formatted_metric["startValue"] = start_tracker_val

        vals = [safe_float(r.value) for r in allRecords]
        formatted_metric["currentValue"] = round(sum(vals) / len(vals),2) if vals else 0

        formatted_metric["change"] = round(formatted_metric["currentValue"]  - formatted_metric["startValue"] , 2) * direction
    elif metric_type == 'boolean':
        formatted_metric["startValue"] = f"{round(avg_score_prev * 100)}%"
        
        # "currentValue": precentage of score 1 days in current period
        formatted_metric["currentValue"] = f"{round(avg_score_curr * 100)}%"
        formatted_metric["change"] = f"{round(avg_score_curr * 100) - round(avg_score_prev * 100)}%"
        
        # "target": metric.isPostive make a habit else avoid
        formatted_metric["target"] = "a habit" if metric_tracker.isPostive else "Avoid"

    elif metric_type == 'scale':
        # "change": score diff between periods
        formatted_metric["change"] = avg_score_curr - avg_score_prev

        # "startValue": int avg value in prev period
        if prevPeriodRecords:
            vals = [safe_float(r.value) for r in prevPeriodRecords]
            val = int(sum(vals) / len(vals)) if vals else 0
        else:
            val = int(start_tracker_val)
        formatted_metric["startValue"] = to_scale(val)
        # "currentValue": int avg value in prev period (Assume typo: current period)
        vals = [safe_float(r.value) for r in allRecords]
        formatted_metric["currentValue"] = to_scale(int(sum(vals) / len(vals)) if vals else 0)
        
        if metric_tracker.target and str(metric_tracker.target).strip():
             formatted_metric["target"] = metric_tracker.target
        else:
             formatted_metric["target"] = "More" if metric_tracker.isPostive else "Less"

    elif metric_type == 'category':
        formatted_metric["change"] = avg_score_curr - avg_score_prev
        
        # "startValue": avg prev period score
        formatted_metric["startValue"] = round(avg_score_prev, 2)
        
        # "currentValue": avg score (current)
        formatted_metric["currentValue"] = round(avg_score_curr, 2)
        
        # "target": metric.isPostive have more metric.target list item days else have less...
        target_items = metric_tracker.target or []
        all_options = metric_tracker.metric.options or []

        # Ensure lists
        if not isinstance(target_items, list):
            target_items = [target_items]

        if not isinstance(all_options, list):
            all_options = [all_options]

        if metric_tracker.isPostive:
            # Positive: include selected items
            final_items = target_items
        else:
            # Negative: exclude selected items
            final_items = [item for item in all_options if item not in target_items]

        target_str = ", ".join(map(str, final_items))

            
        if metric_tracker.isPostive:
            formatted_metric["target"] = f"more {target_str}"
        else:
            formatted_metric["target"] = f"less {target_str}"

        if len(final_items) == len(all_options):
            formatted_metric["target"] = f"balance"


    return formatted_metric

def to_scale(value):
    SCALE_LABELS = dict(SCALE_LEVELS)
    try:
        return SCALE_LABELS[max(1, min(5, round(float(value))))]
    except (TypeError, ValueError):
        return 1
