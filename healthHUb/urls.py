from django.urls import path
from . import views

urlpatterns = [
    path("/", views.collection, name="colletcions"),    
    path("browse/", views.index,{"mode": "user"}, name="browse"),
    path("browse/discover/", views.index, {"mode": "shared"}, name="discover"),    
    path("plans/<id>/<title>/", views.plan_details, name="plans"),    
    path("recipes/<id>/<title>/", views.recipe_details, name="recipes"),    
 ]