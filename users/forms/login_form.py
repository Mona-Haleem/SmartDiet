from django import forms
from users.models import User
from django.contrib.auth import authenticate

class LoginForm(forms.Form):
    login = forms.CharField(
        label="Username / Email",
        max_length=254,
        min_length=3,
        required=True,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter your Username or Email'})
    )
    password = forms.CharField(
        label="Password",
        required=True,
        widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Password'})
    )

    def clean(self):
        cleaned_data = super().clean()
        login_input = cleaned_data.get("login", "").strip().lower()
        password = cleaned_data.get("password")

        if not login_input or not password:
            return cleaned_data  
        
        user = None
        if '@' in login_input:
            user_obj = User.objects.get(email__iexact=login_input)
        else:
            user_obj = User.objects.filter(username__iexact=login_input).first()
        if not user_obj:
            self.add_error("login", f"No account registered with '{login_input}'.")
            return cleaned_data
        user = authenticate(username=user_obj.username, password=password) 
        if user is None:
            self.add_error("login", "Invalid username/email or password.")
        else:
            self.user = user

        return cleaned_data

    def get_user(self):
        """Returns the authenticated user if validation passed."""
        return getattr(self, "user", None)
