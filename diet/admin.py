from django.contrib import admin
from .models import *

class UserLogAdmin(admin.ModelAdmin):
    list_filter = ( 'date', 'user','plan')
# Register your models here.
admin.site.register(User)
admin.site.register(UserRemarks)
admin.site.register(MedicalHistory)
admin.site.register(MedicalIssue)
admin.site.register(Recipe)
admin.site.register(Plan)
admin.site.register(PlanDetail)
admin.site.register(LinkedPlan)
admin.site.register(UserRecipe)
admin.site.register(UserPlan)
admin.site.register(Collection)
admin.site.register(UserLog, UserLogAdmin)



