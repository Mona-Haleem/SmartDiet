from django.urls import path , re_path

from . import views

urlpatterns = [
    path('progress/', views.logs, name='logs'),
    path('progress/assigned-plans/',views.assignedPlans,name="assignedPlans"),
    path('progress/avg-score/',views.avgScore,name="avgScore"),
    path('progress/day/',views.dayaData,name="dayData"),
    path("progress/period/", views.period_progress_view, name="period-progress"),
    
    path('progress/metric/', views.create_metric, name='create-metric'),
    path('progress/metric/<int:metric_id>/', views.update_metric, name='update-metric'),
    path('progress/metric/<int:metric_id>/value/', views.update_metric_value, name='update-metric-value'),
    path('progress/metric/<int:metric_id>/toggle/', views.toggle_metric_active, name='toggle-metric'),
    path('progress/metric/<int:metric_id>/delete/', views.delete_metric, name='delete-metric'),
    path('progress/metrics/inactive/', views.get_inactive_metrics, name='inactive-metrics'),
    path('progress/metrics/cleanup/', views.cleanup_unused_metrics, name='cleanup-metrics'),
    
    path('progress/feedback/', views.update_feedback, name='update-feedback'),
    path('dailyplan/set/', views.set_current_plan, name='set-current-plan'),

    re_path(r'^(?:(?P<slug>(login|register))/)?$', views.index, name='index'),
]