from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("/login", views.login_view, name="login"),
    path("/logout", views.logout_view, name="logout"),
    path("/register", views.register, name="register"),
    path("/profile", views.view_profile, name="profile"),
    path("/get_data/<req_data>", views.get_data, name="get_data"),
    path("/update_profile", views.update_profile, name="update_profile"),
    path("/add_info/<info_type>", views.add_info, name="add_info"),
    path("/delete_info/<type>/<item_id>", views.delete_info, name="delete_info"),
    #("/recpies", views.recpies, name="recpies"),
    path("/logs", views.logs, name="logs"),
    path("/collections/<id>", views.collections, name="collections"),
    path("/update_collections/<action>/<id>", views.update_collections, name="update_collections"),
    path("/edit_ele",views.edit_ele,name='create'),
    path("/edit_ele/<type>/<id>", views.edit_ele, name="delete_ele"),
    path("/edit_linked_plans/<id>", views.edit_linked_plans, name="edit_linked_plans"),

    path("/edit_sec/<id>",views.edit_sec,name='edit_sec'),
    path("/edit_img_list/<id>",views.edit_img_list,name='edit_img_list'),

    path("/<type>/viewer", views.viewer, name="viewer"),
    path("/<type>/<id>/<title>", views.details, name="details"),

    path("/current_plan", views.current_plan, name="current_plan"),
    path("/summery", views.summery, name="summery"),
    path("/test", views.test, name="test"),



    #path("/complete_profile", views.fill_profile, name="complete"),

    
    
 ]