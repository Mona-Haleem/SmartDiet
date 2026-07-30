from healthHub.models.base import UserCreation
from healthHub.models.recipe import Recipe
from healthHub.models.plan import Plan, PlanDetail
from healthHub.models.collections import Collection

__all__ = [
    "UserCreation",
    "Recipe",
    "Plan",
    "PlanDetail",
    "Collection",
]


# """
# from django.db import models
# from django.contrib.auth.models import User


# # ---------------------------------------------------
# # Collection (group/folder structure)
# # ---------------------------------------------------
# class Collection(models.Model):
#     parent = models.ForeignKey(
#         'self',
#         on_delete=models.SET_NULL,
#         related_name="sub_collections",
#         null=True,
#         blank=True
#     )
#     user = models.ForeignKey(
#         User,
#         on_delete=models.CASCADE,
#         related_name="collections"
#     )
#     title = models.CharField(max_length=255)
#     description = models.TextField(null=True, blank=True)
#     creation_date = models.DateTimeField(auto_now_add=True)

#     class Meta:
#         unique_together = ('user', 'title')
#         ordering = ['title']

#     def __str__(self):
#         return f"{self.title} (owned by {self.user.username})"

#     @property
#     def is_root(self):
#         return self.parent is None






