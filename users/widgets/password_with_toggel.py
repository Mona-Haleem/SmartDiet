from django import forms
from pathlib import Path
from django.conf import settings

class PasswordWithToggleInput(forms.PasswordInput):
    # Django expects `template_name`, not `template_path`
   # template_path = str(Path(settings.BASE_DIR, 'templates/widgets/password_with_toggle.html'))

    template_name = 'widgets/password_with_toggle.html'
    suppress_label = True

    def __init__(self, attrs=None, **kwargs):
        default_attrs = {'class': 'form-control', 'placeholder': 'Password'}
        if attrs:
            default_attrs.update(attrs)
        super().__init__(attrs=default_attrs, **kwargs)
