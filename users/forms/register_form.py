from django import forms
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
from users.models import User
from users.widgets.password_with_toggel import PasswordWithToggleInput
from users.widgets.suppress_label import NoLabelForCustomWidgetForm
from users.helpers.get_inputs_atrr import get_inputs_attr

class RegisterForm(NoLabelForCustomWidgetForm):
    refs = '$refs'
    mapping = 'inputRefs'

    email = forms.EmailField(
        label="Email",
        required=True,
        widget=forms.EmailInput(attrs={
            'class': 'form-control',
            'placeholder': 'Email Address',
            **get_inputs_attr(refs, 'email', mapping, 'invalid email'),
            })
    )
    password = forms.CharField(
        label="Password",
        required=True,
        widget=PasswordWithToggleInput(attrs=get_inputs_attr(refs, 'password', mapping, 'week password make sure to include 8 chars, 1 uppercase, 1 lowercase, 1 special character.'))
    )

    confirmation = forms.CharField(
        label="Confirm Password",
        required=True,
        widget=PasswordWithToggleInput(attrs=get_inputs_attr(refs, 'confirmation', mapping, 'passwords don\'t match'))
    )

    class Meta:
        model = User
        fields = ['email']

    def clean_email(self):
        """
        Validate that the email is unique.
        """
        email = self.cleaned_data.get('email')
        if User.objects.filter(email__iexact=email).exists():
            raise ValidationError("An account with this email already exists.")
        return email

    def clean_password(self):
        """
        Validate that the password is strong.
        8 chars, 1 uppercase, 1 lowercase, 1 special character.
        """
        password = self.cleaned_data.get('password')
        if not password:
          return password
        try:
            validate_password(password)
        except ValidationError as e:
            for message in e.messages:
                self.add_error('password', message)

        
        return password


    def clean(self):
        """
        Validate that the password and confirmation fields match.
        """
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        confirmation = cleaned_data.get("confirmation")

        if password and confirmation and password != confirmation:
            self.add_error('confirmation', "Passwords must match.")
        
        return cleaned_data
