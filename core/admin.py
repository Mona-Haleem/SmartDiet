from django.contrib import admin
from core.models import *
# Register your models here.
admin.site.register(UserLog)
admin.site.register(Metric)
admin.site.register(DailyAchivedMetrics)
admin.site.register(TrackedMetrics)
