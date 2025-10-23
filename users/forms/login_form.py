from django import forms

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

  