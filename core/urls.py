from django.urls import path , re_path

from . import views
from . import api_views

urlpatterns = [
    re_path(r'^(?:(?P<slug>(login|register))/)?$', views.index, name='index'),

]