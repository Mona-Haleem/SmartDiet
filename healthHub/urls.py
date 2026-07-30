from django.urls import path
from . import views

urlpatterns = [
    path("/", views.collection, name="colletcions"),    
    path("browse/", views.index,{"mode": "user"}, name="browse"),
    path("browse/discover/", views.index, {"mode": "shared"}, name="discover"),    
    path("browse/discover/<userId>/", views.index, {"mode": "shared"}, name="discover-user"),    
    path("plans/sections/<id>/", views.sectionsManager.as_view(), name="sections"),    
    path("plans/<id>/<name>/", views.DetailsView.as_view(), name="plans"),    
    path("recipes/<id>/<name>/", views.DetailsView.as_view(), name="recipes"),    
    path("<type>/<id>/media/", views.mediaManager, name="media"),    
]