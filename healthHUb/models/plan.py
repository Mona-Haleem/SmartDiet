from django.db import models
from django.db.models import F
from healthHub.models.base import UserCreation
from healthHub.models.managers import format_plan_details
from datetime import timedelta


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
    detail = models.TextField(blank=True, default='')
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