from django.db import models
from healthHub.models.base import UserCreation

class Recipe(models.Model):
    base = models.OneToOneField(
        UserCreation,
        on_delete=models.CASCADE,
        related_name='recipe'
    )
    prep_time = models.DurationField(null=True, blank=True)
    serv = models.IntegerField(default=1)
    ingredients = models.JSONField(default=list, blank=True)
    directions = models.TextField(default='')
    nutrients = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Recipe({self.base.name})"

    class Meta:
        indexes = [
          #  models.Index(fields=['base__category']),
        ]