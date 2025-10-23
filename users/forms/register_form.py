from django import forms
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
import re


class RegisterForm(forms.ModelForm):
   """
   """