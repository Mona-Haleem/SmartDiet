from django import forms
from datetime import date, datetime, timedelta
from diet.models import *
#from decimal import Decimal
#import os
#from django.conf import settings
#from django.utils.dateparse import parse_date
#from django.db.models import F,ExpressionWrapper, IntegerField,Avg, DurationField
#from django.forms.models import model_to_dict

class ProfileForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['username', 'birth_date', 'gender', 'weight', 'height','activity_level','fluid_intake','sleep_quality','sleep_duration','avatar_img']
        widgets = {
            'birth_date': forms.DateInput(attrs={'type': 'date','value': date.today().strftime('%Y-%m-%d')}),
            'gender': forms.RadioSelect(attrs={'class': 'radio_list'}),
            'username': forms.TextInput(attrs={'placeholder': 'Username'}),
            'sleep_quality': forms.Select(attrs={'style':'max-width:120px'}),#''
            #'sleep_duration': forms.NumberInput(attrs={})#'style':'width:80px'
            #'weight': forms.NumberInput(attrs={'style':'width:100px'}),
            #'height': forms.NumberInput(attrs={'style':'width:100px'}),
            #'activity_level': forms.Select(attrs={}),#'style':'width:120px'
            #'fluid_intake': forms.NumberInput(attrs={}),#'style':'width:80px'
            
        }
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field_name in self.fields:
            self.fields[field_name].label = ' '.join(field_name.split('_'))
        for field in self.fields.values():
             if not isinstance(field.widget, forms.RadioSelect):
                field.widget.attrs.update({'class': 'form-control'})

class MedicalForm(forms.ModelForm):
    class Meta:
        model = MedicalHistory
        fields = ['issue', 'relation',  'degree']
        widgets = {
            'issue': forms.TextInput(attrs={'list':'issues'}),
            'degree': forms.Select(),
            'relation': forms.Select()            
        }
    def __init__(self, *args, **kwargs):
        super(MedicalForm, self).__init__(*args, **kwargs)
        self.fields['relation'].initial = 0
        self.fields['degree'].initial = 1
        for field in self.fields.values():
            field.widget.attrs.update({'class': 'form-control'})

class RemarksForm(forms.ModelForm):
    class Meta:
        model = UserRemarks
        fields = ['item', 'remark']
        widgets = {
            'item': forms.TextInput(),
            'remark': forms.TextInput()            
        }
    def __init__(self, *args, **kwargs):
        super(RemarksForm, self).__init__(*args, **kwargs)
        for field in self.fields.values():
            field.widget.attrs.update({'class': 'form-control'})