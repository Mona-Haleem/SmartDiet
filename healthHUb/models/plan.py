from django.db import models
from django.db.models import F
from healthHub.models.base import UserCreation
from healthHub.helpers.helpers import format_plan_details
from healthHub.models import serializers as serialize
from datetime import timedelta
import re


class PlanType(models.TextChoices):
    DIET = 'diet', 'Diet'
    EXERCISE = 'exercise', 'Exercise'
    FULL = 'full', 'Full'


class Plan(models.Model):
    base = models.OneToOneField(
        UserCreation,
        on_delete=models.CASCADE,
        related_name='plan'
    )
    duration = models.DurationField(default=timedelta(weeks=1))
    goal = models.TextField(blank=True, default='')

    def get_details(self):
        """
        Fetch and format plan details.
        Changed from @property to method to avoid accidental N+1 queries.
        """
        if self.base.category == PlanType.FULL:
            linked = getattr(self, "linked_plan", None)
            if not linked:
                return {}
            return {
                "diet_plan": linked.diet_plan.get_details() if linked.diet_plan else [],
                "exercise_plan": linked.exercise_plan.get_details() if linked.exercise_plan else [],
            }
        
        plan_details = (
            PlanDetail.objects
            .filter(plan=self)
            .select_related('parent_section')
            .order_by(
                F('parent_section').asc(nulls_first=True),
                'order'
            )
        )
        return format_plan_details(plan_details)

    def get_daily_schedule(self, day_number):
        """
        Returns the specific schedule for the given day number (1-indexed).
        Scans section names for patterns like "Day 1", "Days 1-3", "Day 1,3".
        If a matching section is found, returns only that section's details.
        Otherwise, returns the full plan details.
        """
        details = self.details.all()
        
        # If details is a list (standard plan), iterate through sections
        # If it's a dict (Full plan), you might need to recurse, but assuming standard here:
        if isinstance(details, dict) and 'diet_plan' in details:
            # Handle full plan complexity if needed, for now return full
            return details 

        daily_content = []
        found_day = False

        for section in details:
            title = section.section.lower()
            
            # Pattern 1: Range "Days 1-3" or "Week 1 Days 1-5"
            # Looks for digits separated by dash
            range_match = re.search(r'days?\s*(\d+)\s*-\s*(\d+)', title)
            if range_match:
                start, end = map(int, range_match.groups())
                if start <= day_number <= end:
                    daily_content.append(section)
                    found_day = True
                    continue

            # Pattern 2: Specific list "Day 1, 3, 5" or just "Day 1"
            # Finds all numbers following "day" or inside the string
            if 'day' in title:
                # Extract all numbers from the title
                days_in_title = [int(n) for n in re.findall(r'\d+', title)]
                if day_number in days_in_title:
                    daily_content.append(section)
                    found_day = True
                    continue

        if found_day:
            return serialize.details(daily_content)
        
        # If no specific day matched, return the full plan (fallback)
        return serialize.details(details)

    def __str__(self):
        return f"Plan({self.base.name})"

    class Meta:
        indexes = [
           # models.Index(fields=['plan_type']),
        ]


class PlanDetail(models.Model):
    parent_section = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        related_name="sub_sections",
        null=True,
        blank=True
    )
    plan = models.ForeignKey(
        Plan,
        on_delete=models.CASCADE,
        related_name='details'
    )
    section = models.CharField(max_length=255)
    detail = models.JSONField(default=list, blank=True)
    order = models.IntegerField(default=1)

    def __str__(self):
        return f"Detail for {self.plan.base.name}: {self.section}"

    class Meta:
        ordering = ['order']
        indexes = [
            models.Index(fields=['plan', 'parent_section', 'order']),
        ]


class LinkedPlan(models.Model):
    full_plan = models.OneToOneField(
        Plan,
        on_delete=models.CASCADE,
        limit_choices_to={'base__category': PlanType.FULL},
        related_name="linked_plan"
    )
    diet_plan = models.ForeignKey(
        Plan,
        on_delete=models.SET_NULL,
        limit_choices_to={'base__category': PlanType.DIET},
        null=True,
        blank=True,
        related_name="linked_as_diet"
    )
    exercise_plan = models.ForeignKey(
        Plan,
        on_delete=models.SET_NULL,
        limit_choices_to={'base__category': PlanType.EXERCISE},
        null=True,
        blank=True,
        related_name="linked_as_exercise"
    )

    def __str__(self):
        return f"LinkedPlan for {self.full_plan.base.name}"