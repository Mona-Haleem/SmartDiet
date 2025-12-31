from django.db import models
from users.models import User
from healthHub.models import Plan
from django.core.validators import MinValueValidator, MaxValueValidator

METRIC_CHOICES = [
    ('continues', 'Persistent state (weight, measurements)'),
    ('daily', 'Daily reset accumulation (water, calories)'),
    ('boolean', 'Yes/No event (cheat day, trained)'),
    ('scale', 'Ordered scale (1–5 exhaustion)'),
    ('category', 'Unordered choices (stressed, busy)'),
]

SCALE_LEVELS = [
    (1, 'Low'),
    (2, 'Fair'),
    (3, 'Average'),
    (4, 'Good'),
    (5, 'Optimal'),
]

class UserLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="history")
    date = models.DateField()
    plan = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name="user_history", null=True, blank=True)
    feedback = models.TextField(null=True, blank=True)

    def __str__(self):
        return f'user_{self.user.id}_{self.date}_{self.plan}'

    def calculate_Total_score(self):
        """
        Calculate the total score for the day based on the average progress 
        of all tracked metrics.
        """
        metrics = self.AchivedMetrics.all()
        if not metrics.exists():
            return 0
        
        total_progress = 0
        count = 0
        
        for metric_entry in metrics:
            # Get progress (0.0 to 1.0)
            progress = metric_entry.calculate_score()
            total_progress += progress
            count += 1
            
        if count == 0:
            return 0
            
        # Convert average 0-1 progress to 0-100 score
        final_score = int((total_progress / count) * 100)
        return min(100, max(0, final_score))

class Metric(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="userMetrics")
    name = models.CharField(max_length=255)
    # Changed max_length to 20 to fit 'continues', 'daily', etc.
    type = models.CharField(max_length=20, choices=METRIC_CHOICES, default='continues')
    options = models.JSONField(default=list)
    
    def __str__(self):
        return self.name

class TrackedMetrics(models.Model):
    metric = models.ForeignKey(Metric, on_delete=models.CASCADE, related_name="trackedMetric")
    goal = models.CharField(max_length=255, null=True, blank=True)
    linkedPlan = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name="metrics", null=True, blank=True)
    isActive = models.BooleanField(default=True)
    # Target stores the goal value (e.g., target weight: 70, or target water: 2000)
    target = models.JSONField(null=True,blank=True)
    start = models.JSONField(default=0) 
    isPostive = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.metric.name} (Target: {self.target})"

class DailyAchivedMetrics(models.Model):
    log = models.ForeignKey(UserLog, on_delete=models.CASCADE, related_name="AchivedMetrics")
    metric = models.ForeignKey(TrackedMetrics, on_delete=models.CASCADE, related_name="goalMetrics")
    value = models.JSONField(default=0) # Current value
    
    def __str__(self):
        return f'{self.log.plan}: {self.log.date} => {self.metric} :: {self.value} '
    def calculate_score(self):
        try:
            val = float(self.value) if self.value is not None else 0.0
            start = float(self.metric.start) if self.metric.start is not None else 0.0
            target = float(self.metric.target) if self.metric.target is not None else 1.0
        except (ValueError, TypeError):
            # Handle non-numeric cases (like categories) separately if needed
            val = 0
            start = 0
            target = 1

        if self.metric.metric.type == 'continues':
            # Progress towards a target (e.g., Weight: start 80, current 79, target 70)
            # Avoid division by zero
            if target == start:
                return 1.0 if val == target else 0.0
            
            # Simple linear interpolation
            progress = (val - start) / (target - start)
            # Cap progress between 0 and 1? Or allow overflow? 
            # Usually strict goals are 0-1
            return progress

        elif self.metric.metric.type == 'daily':
            # e.g., Water: Drink 2000ml. Value 1500.
            if target == 0: return 0
            if self.metric.isPostive:
                value = min(1.0, val / target)
            else:
                value = min(1 ,(1 - ((val - target) / target)))
            return value

        elif self.metric.metric.type == 'boolean':
            # Target might be 'positive' (meaning "Yes" is good) or 'negative'
            is_true = str(self.value).lower() in ['true', '1', 'yes']
            
            if self.metric.isPostive:
                return 1.0 if is_true else 0.0
            else:
                return 0.0 if is_true else 1.0

        elif self.metric.metric.type == 'scale':
            # 1-5 scale. 
            # If target is 'positive' (high is good): val/5
            # If target is 'negative' (low is good, e.g., fatigue): 1 - (val/5)
            # Assuming value is 1-5
            norm_val = min(5, max(0, val))
            if self.metric.isPostive:
                return norm_val / 5.0
            else:
                return 1.0 - (norm_val / 5.0)

        elif self.metric.metric.type == 'category':
            # Check if value is in target list
            target_list = self.metric.target if isinstance(self.metric.target, list) else [self.metric.target]
            if self.metric.isPostive :
                value = 1 if self.value in target_list else 0
            else:
                value = 0 if self.value not in target_list and self.value != "no entry" else 0
            return value
            
        return 0.0