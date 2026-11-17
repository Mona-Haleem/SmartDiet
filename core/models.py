from django.db import models
from users.models import User
from healthHub.models import Plan
from django.core.validators import MinValueValidator, MaxValueValidator
from math import isfinite

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
        metrics = list(self.AchivedMetrics.all())
        if not metrics:
            return 0
        final_score = int(sum(entry.calculate_score() for entry in metrics) / len(metrics) * 100)
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
        kind = self.metric.metric.type
        positive = self.metric.isPostive
        if self.value is None or self.value == "no entry":
            return 0.0
        if kind == "boolean":
            recorded = str(self.value).lower() in {"true", "1", "yes"}
            return float(recorded == positive)
        if kind == "category":
            targets = self.metric.target if isinstance(self.metric.target, list) else [self.metric.target]
            options = self.metric.metric.options
            if options and self.value not in options:
                return 0.0
            return float((self.value in targets) == positive)
        try:
            val = float(self.value)
            start = float(self.metric.start or 0)
            target = float(self.metric.target) if self.metric.target is not None else 1
        except (ValueError, TypeError):
            return 0.0
        if not all(isfinite(number) for number in (val, start, target)):
            return 0.0
        if kind == "continues":
            result = float(val == target) if start == target else (val - start) / (target - start)
        elif kind == "daily":
            if target <= 0:
                return 0.0
            result = val / target if positive else 2 - val / target
        elif kind == "scale":
            value = min(5, max(1, val))
            result = (value - 1) / 4 if positive else (5 - value) / 4
        else:
            return 0.0
        return min(1.0, max(0.0, result))
