from django import forms
from users.models import User
from django.contrib.auth import authenticate
from users.widgets.password_with_toggel import PasswordWithToggleInput
from users.widgets.suppress_label import NoLabelForCustomWidgetForm
from users.helpers.get_inputs_atrr import get_inputs_attr

class LoginForm(NoLabelForCustomWidgetForm):
    refs = '$refs'
    mapping = 'inputRefs'

    login = forms.CharField(
        label="Username / Email",
        max_length=254,
        min_length=3,
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter your Username or Email',
            **get_inputs_attr(refs, 'login', mapping, 'login field required'),
            })
    )
    login_password = forms.CharField(
        label="Password",
        required=True,
        widget=PasswordWithToggleInput(
            attrs=get_inputs_attr(refs, 'login_password', mapping, 'login_password field required')
        ) 
        )

    def clean(self):
        cleaned_data = super().clean()
        login_input = cleaned_data.get("login", "").strip().lower()
        login_password = cleaned_data.get("login_password")

        if not login_input or not login_password:
            return cleaned_data  
        
        user_obj = None
        try:
            if '@' in login_input:
                user_obj = User.objects.get(email__iexact=login_input)
            else:
                user_obj = User.objects.filter(username__iexact=login_input).first()
        except User.DoesNotExist:
            pass  
        
        if not user_obj:
            self.add_error("login", f"No account registered with '{login_input}'.")
            return cleaned_data

        user = authenticate(username=user_obj.username, password=login_password) 
        if user is None:
            self.add_error("login", "Invalid username/email or password.")
        else:
            self.user = user

        return cleaned_data

    def get_user(self):
        """Returns the authenticated user if validation passed."""
        return getattr(self, "user", None)

