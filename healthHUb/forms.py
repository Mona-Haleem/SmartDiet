from django import forms
from django.core.exceptions import ValidationError
from healthHub.models.base import UserCreation, ElementType
from healthHub.models.plan import PlanType
from healthHub.helpers.nurtientCalculator import *
from datetime import timedelta
import json


class BaseCreationForm(forms.ModelForm):
    """Base form for UserCreation"""
    
    class Meta:
        model = UserCreation
        fields = ['name', 'notes', 'shared', 'favorite', 'media', 'type', 'category']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter name',
                'required': True
            }),
            'notes': forms.Textarea(attrs={
                'class': 'form-control',
                'placeholder': 'Add notes (optional)',
                'rows': 3
            }),
            'shared': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'favorite': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'type': forms.HiddenInput(),
            'category': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Category',
                'list': 'category-suggestions'
            }),
        }

    def __init__(self, *args, user=None, **kwargs):
        self.user = user
        super().__init__(*args, **kwargs)
        
    def clean_name(self):
        name = self.cleaned_data.get('name')
        if not name or not name.strip():
            raise ValidationError('Name is required.')
        
        counter=0
        # Check uniqueness per user
        if self.user:
            while UserCreation.objects.filter(creator=self.user, name=name).exists():
                name = f"{name.strip().split()[0]} ({counter})"
                counter += 1

        
        return name

    def clean_category(self):
        category = self.cleaned_data.get('category', '').strip()
        creation_type = self.cleaned_data.get('type')
        
        if creation_type == ElementType.PLAN:
            allowed = [PlanType.DIET, PlanType.EXERCISE, PlanType.FULL]
            if category not in allowed:
                raise ValidationError(
                    f"Plan category must be one of: {', '.join(allowed)}"
                )
        
        return category


class RecipeForm(forms.Form):
    """Form for Recipe-specific fields"""
    prep_time_hours = forms.IntegerField(
        min_value=0,
        required=False,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'placeholder': '0',
            'min': '0'
        })
    )
    prep_time_minutes = forms.IntegerField(
        min_value=0,
        max_value=59,
        required=False,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'placeholder': '0',
            'min': '0',
            'max': '59'
        })
    )
    serv = forms.IntegerField(
        min_value=1,
        initial=1,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'placeholder': '1',
            'min': '1'
        })
    )
    ingredients = forms.JSONField(
        required=False
    )


    def clean_prep_time_hours(self):
        hours = self.cleaned_data.get('prep_time_hours') or 0
        return hours

    def clean_prep_time_minutes(self):
        minutes = self.cleaned_data.get('prep_time_minutes') or 0
        return minutes

    def get_prep_time(self):
        """Convert hours and minutes to timedelta"""
        hours = self.cleaned_data.get('prep_time_hours', 0) or 0
        minutes = self.cleaned_data.get('prep_time_minutes', 0) or 0
        if hours == 0 and minutes == 0:
            return None
        return timedelta(hours=hours, minutes=minutes)

    def clean_ingredients(self):
        ingredients = self.cleaned_data.get('ingredients') or []

        if not isinstance(ingredients, list):
            raise forms.ValidationError("Ingredients must be a list")

        seen = set()
        unique = []

        for ing in ingredients:
            if not isinstance(ing, dict):
                continue  # or raise ValidationError if you prefer

            # Normalize values to avoid false duplicates
            key = (
                str(ing.get("name", "")).strip().lower(),
                str(ing.get("unit", "")).strip().lower(),
                float(ing.get("amount", 0)),
            )

            if key != "" and key not in seen:
                seen.add(key)
                unique.append({
                    "name": ing.get("name"),
                    "unit": ing.get("unit"),
                    "amount": ing.get("amount"),
                })
     
        return unique

    def clean(self):
        cleaned = super().clean()

        hours = cleaned.pop('prep_time_hours', 0) or 0
        minutes = cleaned.pop('prep_time_minutes', 0) or 0

        cleaned['prep_time'] = timedelta(
            hours=hours,
            minutes=minutes
        )
        cleaned['directions'] = [] 
        if len(cleaned["ingredients"]) > 0:
            cleaned["nutrients"] = get_nutrition_info_usda(cleaned["ingredients"])

        return cleaned

class PlanForm(forms.Form):
    """Form for Plan-specific fields"""
    DURATION_CHOICES = [
        ('', 'Custom'),
        ('1', '1 Day'),
        ('7', '1 Week'),
        ('14', '2 Weeks'),
        ('30', '1 Month'),
    ]
    
    duration_preset = forms.ChoiceField(
        choices=DURATION_CHOICES,
        required=False,
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    duration_days = forms.IntegerField(
        min_value=1,
        required=False,
        widget=forms.NumberInput(attrs={
            'class': 'form-control',
            'placeholder': 'Number of days',
            'min': '1'
        })
    )
    goal = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={
            'class': 'form-control',
            'placeholder': 'Describe your goal (optional)',
            'rows': 3
        })
    )
    
    # For FULL plans
    diet_plan_id = forms.IntegerField(
        required=False,
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    exercise_plan_id = forms.IntegerField(
        required=False,
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    
    # Initial sections
    create_default_sections = forms.BooleanField(
        initial=True,
        required=False,
        widget=forms.CheckboxInput(attrs={'class': 'form-check-input'})
    )

    def clean(self):
        cleaned = super().clean()

        preset = cleaned.pop('duration_preset', None)
        custom = cleaned.pop('duration_days', None)

        days = int(preset) if preset else custom or 7

        cleaned['duration'] = timedelta(days=days)

        return cleaned


    def get_duration(self):
        """Convert days to timedelta"""
        days = self.cleaned_data.get('duration_days', 7)
        return timedelta(days=days)