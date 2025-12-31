from django.contrib.auth.models import AbstractUser
from django.db import models 
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
#from django.core.validators import MinValueValidator, MaxValueValidator
import os
from django.conf import settings
from datetime import date#,timedelta

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
RESTRICTIONS_TYPE_CHOICES = [
        ('medical', 'Medical'),
        ('budget', 'Budget'),
        ('prefrences', 'Prefrences'),
        ('avalblity', 'Avalablity'),
        ('other', 'Other'),
    
    ]

class User(AbstractUser):
    email = models.EmailField(_('email address'), unique=True)
    avatar_img = models.ImageField(upload_to='profile_images/', null=True, blank=True)
    birth_date = models.DateField(default='2000-01-01')
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default='O')
    weight = models.DecimalField (default=50.00,max_digits=5, decimal_places=2)
    height = models.DecimalField (default=160.00,max_digits=5, decimal_places=2)  
    activity_level = models.CharField(max_length=10, choices=ACTIVITY_LEVEL_CHOICES, default='moderate')
    fluid_intake = models.DecimalField (default=2.0,max_digits=4, decimal_places=2)
    sleep_quality = models.IntegerField(choices=SLEEP_QUALITY_CHOICES, default=3)
    sleep_duration = models.DecimalField (default=7.0,max_digits=4, decimal_places=2) 
   # friends = models.ManyToManyField("self", blank=True, symmetrical=False)

    def __str__(self):
        return self.username
    def serialize(self):
        """
        Returns a dictionary representation of the user.
        """
        print ("--------start serializing user ------------")
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "avatar_img":self.avatar_img.url if self.image_exists() else '',
            "birth_date": self.birth_date.strftime("%Y-%m-%d"),
            "age":self.age,
            "weight": float(self.weight) ,
            "height": float(self.height) ,
            "gender": self.gender,
            "activity_level": dict(ACTIVITY_LEVEL_CHOICES).get(self.activity_level, 'Unknown'),
            "fluid_intake": float(self.fluid_intake),
            "sleep_quality": dict(SLEEP_QUALITY_CHOICES).get(self.sleep_quality, 'Unknown'),
            "sleep_duration": float(self.sleep_duration),
            "restrictions":[r.serialize() for r in self.restrictions.all()]
        }

    @property
    def age(self):
        today = date.today()
        return today.year - self.birth_date.year - ((today.month, today.day) < (self.birth_date.month, self.birth_date.day))
    
    def image_exists(self):
        # Check if the file exists
        if self.avatar_img:
            full_path = os.path.join(settings.MEDIA_ROOT, self.avatar_img.name)
            return os.path.isfile(full_path)
        else:
            return ""
class MedicalIssues(models.Model):
    name_ar = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    category = models.CharField(max_length=100)
    description_ar = models.CharField(max_length=300)
    description_en = models.CharField(max_length=300)
    diet_rules = models.JSONField(default=[])
    def __str__(self):
        return f'{self.name_en}'

class UserRestriction(models.Model):
    name = models.CharField(max_length=100)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='restrictions'
        )
    type = models.CharField(max_length=20, choices=RESTRICTIONS_TYPE_CHOICES, default='other')
    remark = models.CharField(max_length=255,blank=True,null=True)
    ref = models.ForeignKey(MedicalIssues ,on_delete=models.CASCADE , related_name="issue",null=True ,blank=True)
  
    def clean(self):
        if self.type == "medical" and self.ref is None:
            raise ValidationError("ref is required for medical restrictions.")
        if self.type != "medical" and self.ref is not None:
            raise ValidationError("ref must be empty unless type='medical'")

    def serialize(self):
        print ("--------serializing restrictions ------------")

        return {
            "id":self.id,
            "name" : self.name,
            "type" :self.type,
            "remark":self.remark if self.remark else "",
            "medicalId":self.ref.id if self.ref else ""
        }
    def __str__(self):
        return f'{self.type} : {self.name}'