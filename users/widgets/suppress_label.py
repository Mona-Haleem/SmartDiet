from django.forms.boundfield import BoundField
from django import forms


class NoLabelForCustomWidgetBoundField(BoundField):
    def label_tag(self, contents=None, attrs=None, label_suffix=None):
        """
        If the field’s widget defines suppress_label=True, skip rendering the label.
        Otherwise, use Django’s normal behavior.
        """
        if getattr(self.field.widget, "suppress_label", False):
            return ""
        return super().label_tag(contents, attrs, label_suffix)

class NoLabelForCustomWidgetForm(forms.Form):
    """
    A base form that automatically skips labels for widgets
    that define suppress_label=True.
    """
    def __getitem__(self, name):
        # Get the unbound field instance directly from self.fields
        field = self.fields[name]
        return NoLabelForCustomWidgetBoundField(self, field, name)
