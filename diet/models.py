from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
import os
from django.conf import settings
from django.db import models
from datetime import date,timedelta

class User(AbstractUser):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    ]

    ACTIVITY_LEVEL_CHOICES = [
        ('low', 'Low'),
        ('moderate', 'Moderate'),
        ('active', 'Active'),
        ('high', 'High'),
    ]


    SLEEP_QUALITY_CHOICES = [
        (1,'Deep'),
        (2,'Stable'),
        (3,'Mild'),
        (4,'Light'),
    ]   
    avatar_img = models.ImageField(upload_to='profile_images/', null=True, blank=True)
    birth_date = models.DateField(default='2000-01-01')
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default='O')
    weight = models.DecimalField (default=50.00,max_digits=5, decimal_places=2)
    height = models.DecimalField (default=160.00,max_digits=5, decimal_places=2)  
    activity_level = models.CharField(max_length=10, choices=ACTIVITY_LEVEL_CHOICES, default='moderate')
    fluid_intake = models.DecimalField (default=2.0,max_digits=4, decimal_places=2)
    sleep_quality = models.IntegerField(choices=SLEEP_QUALITY_CHOICES, default=3)
    sleep_duration = models.DecimalField (default=7.0,max_digits=4, decimal_places=2) 
    friends = models.ManyToManyField("self", blank=True, symmetrical=False)

    def serialize(self):
        return {
           "avatar_img":self.avatar_img if self.image_exists() else '',
           "id": self.id,
            "username": self.username,
            "birth_date": self.birth_date.strftime("%Y-%m-%d"),
            "age":self.age(),
            "gender": dict(self.GENDER_CHOICES).get(self.gender, 'Unknown'),
            "weight": self.weight,
            "height": self.height,
            "activity_level": dict(self.ACTIVITY_LEVEL_CHOICES).get(self.activity_level, 'Unknown'),
            "fluid_intake": self.fluid_intake,
            "sleep_quality": dict(self.SLEEP_QUALITY_CHOICES).get(self.sleep_quality, 'Unknown'),
            "sleep_duration": self.sleep_duration,
            "email":self.email
        }
    def age(self):
        today = date.today()
        return today.year - self.birth_date.year - ((today.month, today.day) < (self.birth_date.month, self.birth_date.day))
    
    def image_exists(self):
        # Check if the file exists
        full_path = os.path.join(settings.MEDIA_ROOT, self.avatar_img.name)
        return os.path.isfile(full_path)
    

    
class UserRemarks(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="remarks")
    item = models.CharField(max_length=255)
    remark = models.CharField(max_length=255)
    class Meta:
        unique_together = ('user', 'item')
    def __str__(self):   
        return f'{self.item} {self.remark}'
        
class MedicalHistory(models.Model):
    RELATION_CHOICES = [
        (0, 'Own'),
        (1, 'Parent'),
        (2, 'sibling'),
        (3, 'Grand parent'),
        (4, 'Cousin'),
    ]  
    DEGREE_CHOICES = [
        (0, 'Severe'),
        (1, 'Averege'),
        (2, 'Light'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="medical_details")
    relation = models.IntegerField(choices=RELATION_CHOICES, default=0)
    issue = models.ForeignKey("MedicalIssue", on_delete=models.CASCADE, related_name="medical_issues")
    degree = models.IntegerField(choices=DEGREE_CHOICES, default=1)
    def __str__(self):   
        return f'{self.get_degree_display()} {self.issue.issue_name}'
    
    class Meta:
        unique_together = ('user', 'relation','issue','degree')        
    
class MedicalIssue(models.Model):
    issue_name = models.CharField(max_length=255,unique=True)  
    def __str__(self):   
        return self.issue_name 
   
class UserCreation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_%(class)s")
    title = models.CharField(max_length=255)
    remark = models.CharField(max_length=255,null=True, blank=True)
    creation_date = models.DateTimeField(auto_now_add=True)
    last_modification = models.DateTimeField(auto_now=True)
    shared =  models.BooleanField(default=False)
    media = models.JSONField(default=list,null=True, blank=True)
    class Meta:
        unique_together = ('user', 'title')
        abstract = True
    def __str__(self):
        return f'{self.title}'

class Recipe(UserCreation):
    ingredients = models.JSONField(default=list)
    directions = models.TextField()
    category = models.CharField(max_length=255)
    prep_time =  models.DurationField(null=True,blank=True)
    serv = models.IntegerField(default=1)
    total_nurtients = models.JSONField(default=list)
    ingredients_nurtients = models.JSONField(default=list)

class Plan(UserCreation):
    plan_type = models.CharField(max_length=8, choices=[('full','Full'),('diet','Diet'),('exercies','Exercies')])
    duration = models.DurationField()
    goal = models.TextField()
     
class LinkedPlan(models.Model):
    full_plan = models.ForeignKey(
        Plan,
        on_delete=models.CASCADE,
         limit_choices_to={'plan_type': 'full'},
        related_name="full"
    )
    diet_plan =  models.ForeignKey(
        Plan,
        on_delete=models.SET_NULL,
        limit_choices_to={'plan_type': 'diet'},
        null=True,
        blank=True,
        related_name="diet"
    )
    exercies_plan = models.ForeignKey(
        Plan,
        on_delete=models.SET_NULL,
        limit_choices_to={'plan_type': 'exercies'},
        null=True,
        blank=True,
        related_name="exercies"
        )

class PlanDetail(models.Model):
    parent_section = models.ForeignKey('self', on_delete=models.CASCADE, related_name="sub_sections",null=True,blank=True )
    plan = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name="plan_details")
    section = models.CharField(max_length=255)
    detail = models.TextField(null=True,blank=True)
    order = models.IntegerField(default=1)
    def __str__(self):
        return f'{self.plan}_{self.section}'

class Collection(models.Model):
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, related_name="group_folders",null=True,blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_groups")
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    creation_date = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ('user', 'title')
    def __str__(self):
        return self.title
class UserFav(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="fav_%(class)s")
    favourite = models.BooleanField(default=False)
    groups =  models.ManyToManyField(Collection, related_name="group_%(class)s")
    class Meta:
        abstract = True

class UserRecipe(UserFav):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name="user_recipes")

class UserPlan(UserFav):
    plan = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name="user_plans")

class UserLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="history")
    date = models.DateField()
    plan = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name="user_history", null=True, blank=True)
    score = models.IntegerField(default=0,validators=[ MinValueValidator(0),MaxValueValidator(100)])
    feedback = models.TextField(null=True, blank=True)
    def __str__(self):
        return f'user_{self.user.id}_{self.date}_{self.plan}'

    @staticmethod
    def get_current_plan(user,type):
        today = date.today()
        last_type_log = UserLog.objects.filter(user=user,plan__plan_type=type).order_by('-date').first()
        last_log = UserLog.objects.filter(user=user,date__lte=today).order_by('-date').first()
        if last_log.plan.plan_type != 'full':
            last_log  =last_type_log
        if not last_log:
            return None
        if last_log.date == today:
            return last_log.plan
        elif last_log.date < today:
            UserLog.log_missing_logs(last_log.date,today,last_log)
            return last_log.plan
        else:
            today_log = UserLog.objects.filter(user=user,plan__plan_type__in=[type, "full"],date=today).first()
            if not today_log:
                today_log = UserLog.objects.filter(user=user,plan__plan_type__in=[type, "full"],date__lt=today).order_by('-date').first()
                UserLog.log_missing_logs(today_log.date,today,last_log)
            return today_log.plan    
               


    @staticmethod
    def log_missing_logs(date,today,log):
        current_date = date + timedelta(days=1)
        while current_date <= today:
            UserLog.set_plan(log.user, log.plan, current_date)
            current_date += timedelta(days=1)
   
    @staticmethod
    def set_plan(user, plan, start_date,fill_duration=False, replace=False):
        end_date = start_date + plan.duration if fill_duration else start_date + timedelta(days=1)
        while start_date < end_date:
            if plan.plan_type != 'full':
                UserLog.add_plan(user, plan, start_date, replace)
            else:
                UserLog.add_full_plan(user, plan, start_date, replace)               
            start_date += timedelta(days=1)


    @staticmethod
    def add_full_plan(user, plan, start_date, replace=False):
        existing_logs = UserLog.objects.filter(user=user, date=start_date)
        if len(existing_logs) == 0:
            new_log = UserLog(user=user, date=start_date,plan=plan)
            new_log.save()
        elif len(existing_logs) > 0 and (replace or start_date !=  date.today()):
            linked_plan = LinkedPlan.objects.get(full_plan=plan)
            feedback = ''
            score = 0
            count = 0
            for log in existing_logs:
                if (log.plan.plan_type == 'diet' and log.plan == linked_plan.diet_plan) or (log.plan.plan_type == 'exercies' and log.plan == linked_plan.exercies_plan):
                    feedback += '' if not log.feedback else log.feedback + '\n'
                    score += log.score
                    count += 1
                log.delete()
            new_log = UserLog(user=user, date=start_date,plan=plan,feedback=feedback,score=score/count)
            new_log.save()
    
    
    @staticmethod
    def add_plan(user, plan, start_date, replace=False):
        existing_log = UserLog.objects.filter(user=user, date=start_date, plan__plan_type__in=[plan.plan_type,'full']).first()
        if existing_log and (replace or start_date !=  date.today()):
            if existing_log.plan.plan_type != 'full':
                existing_log.plan = plan
                existing_log.score = 0
                existing_log.feedback = ''
                existing_log.save()
            else:
                linked_plan = LinkedPlan.objects.get(full_plan=existing_log.plan)
                other = linked_plan.exercies_plan if plan.plan_type == 'diet' else linked_plan.diet_plan
                other_log = UserLog(user=user, date=start_date,plan=other,score=existing_log.score,feedback=existing_log.feedback)
                new_log = UserLog(user=user, date=start_date,plan=plan)
                other_log.save()
                new_log.save()
                existing_log.delete()
        elif not existing_log:
            new_log = UserLog(user=user, date=start_date,plan=plan)
            new_log.save()
        

"""
 if curr is full and added is not change the added and replace full to the othee part alone
 if added is full check other recoreds if they mattch the linked plans then use them first else delete directly   
 if date is older than today  don't allow change
 """