from django.urls import path

from . import views
from . import api_views

urlpatterns = [
    path("", views.index, name="index"),
    path("test/", api_views.test, name="test"),

]