from django import forms
from django.contrib.auth import get_user_model

User = get_user_model()

class LoginForm(forms.Form):
    """
    Form for user login. Accepts either username or email.
    """

  