from django.db import models
from collections import defaultdict

class UserCreationManager(models.Manager):
    def create(self,**kwargs):
        """Create a UserCreation with its corresponding subclass"""
        from healthHub.models import Recipe , Plan , PlanDetail
        from healthHub.models.plan import  LinkedPlan , PlanType

        field_names = {field.name for field in self.model._meta.get_fields()}
        model_kwargs = {k: v for k, v in kwargs.items() if k in field_names}
        extra_kwargs = {k: v for k, v in kwargs.items() if k not in field_names}
        print(model_kwargs,extra_kwargs ,"start creating")
        if not model_kwargs["media"]:
            model_kwargs["media"] = []
        base = self.model(**model_kwargs)
        base.full_clean()  # optional, ensures validation
        base.save(using=self._db)
        print("base creates sucessfully")
        # Automatically create related objects
        if base.type == 'recipe':
            Recipe.objects.create(base=base,**extra_kwargs)
        elif base.type == 'plan':
            diet_plan_id = extra_kwargs.pop('diet_plan_id', None)
            exercise_plan_id = extra_kwargs.pop('exercise_plan_id', None)
            create_default_sections = extra_kwargs.pop('create_default_sections', None)
            plan = Plan.objects.create(base=base,**extra_kwargs)
            if create_default_sections and base.category !="full":
                create_default_plan_sections(plan,plan.duration.days)
            if base.category == PlanType.FULL:
                LinkedPlan.objects.create(
                    full_plan=plan,
                    diet_plan_id=diet_plan_id,
                    exercise_plan_id=exercise_plan_id,
                )


        return base

    
    def get_with_details(self, pk):
        """Fetch UserCreation with prefetched details to avoid N+1 queries"""
        obj = self.select_related('recipe', 'plan').get(pk=pk)
        if obj.type == 'plan' and hasattr(obj, 'plan'):
            # Prefetch plan details to avoid additional queries
            from healthHub.models.plan import Plan
            obj.plan = Plan.objects.prefetch_related(
                'details__parent_section'
            ).get(base=obj)
        return obj


   


def create_default_plan_sections(plan, duration_days, weekNum="", parent=None):
    """
    Creates default plan structure:
    Schedule
      └─ Week / Month (optional)
          └─ Day 1 ... Day N
    """
    from healthHub.models import Recipe , Plan , PlanDetail

    weeks = duration_days // 7 if duration_days % 7 == 0 else 0 
    if weeks > 1:
        schedul_prefix = f"Week {weekNum} "
    elif weeks:
        schedul_prefix = "week"
    elif duration_days == 30:
        schedul_prefix = "Month "
    else:
        schedul_prefix = ""   

    if weeks > 1:
        schedule = PlanDetail.objects.create(
            plan=plan,
            section="Schedule",
            order= 1,
        )
        for i in range(weeks):
            create_default_plan_sections(plan,7,weekNum=i+1,parent=schedule)
    else:
        schedule = PlanDetail.objects.create(
            plan=plan,
            section=f"{schedul_prefix}Schedule",
            parent_section=parent,
            order=weekNum or 1,
            
        )
        DAY_NAME = ["Sat" ,"Sun" , "Mon","Tue","Wed","Thr","Fri"]
        for day in range(1, duration_days + 1):
            section_name = f"{DAY_NAME[day-1]}" if weeks else f"Day {day}" 
            PlanDetail.objects.create(
                plan=plan,
                parent_section=schedule,
                section=section_name,
                order=day,
            )

