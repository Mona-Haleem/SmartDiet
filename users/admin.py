from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User ,MedicalIssues , UserRestriction

# Register your models here.
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'is_staff', 'is_active')
    search_fields = ('username', 'email')
    ordering = ('username',)

admin.site.register(User)
admin.site.register(MedicalIssues)
admin.site.register(UserRestriction)
