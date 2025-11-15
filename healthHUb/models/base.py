from django.db import models
from users.models import User
from healthHub.models.managers import UserCreationManager
from django.core.exceptions import ValidationError


class ElementType(models.TextChoices):
    RECIPE = 'recipe', 'Recipe'
    PLAN = 'plan', 'Plan'


class UserCreation(models.Model):
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='creations')
    name = models.CharField(max_length=100)
    notes = models.TextField(blank=True, default='')
    created = models.DateTimeField(auto_now_add=True)
    edited = models.DateTimeField(auto_now=True)
    shared = models.BooleanField(default=False)
    media = models.JSONField(default=list, blank=True)
    type = models.CharField(max_length=10, choices=ElementType.choices)
    category = models.CharField(max_length=50, blank=True, default='')
    objects = UserCreationManager()
    
    class Meta:
        unique_together = ('creator', 'name')
        ordering = ['-edited']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['creator', '-edited']),
            models.Index(fields=['creator', 'type']),
            models.Index(fields=['shared', '-edited']),
        ]

    def __str__(self):
        return f"{self.type.capitalize()}: {self.name or 'Untitled'}"
 
    def get_concrete(self):
        """Return the subclass instance (Recipe/Plan)"""
        if self.type == ElementType.RECIPE and hasattr(self, 'recipe'):
            return self.recipe
        if self.type == ElementType.PLAN and hasattr(self, 'plan'):
            return self.plan
        return None
    
    def clean(self):
        """Enforce conditional choices for category."""
        if self.type == 'plan':
            allowed = ['diet', 'exercise', 'full']
            if self.category not in allowed:
                raise ValidationError(
                    f"For type 'plan', category must be one of {allowed}, got '{self.category}'."
                )

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    # NEW: Many-to-many relationship with Collection
    # collections = models.ManyToManyField(
    #     Collection,
    #     related_name='elements',
    #     blank=True,
    #     help_text="Groups or folders this element belongs to"
    # )