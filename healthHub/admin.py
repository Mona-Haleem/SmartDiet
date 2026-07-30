from django.contrib import admin
#from django.utils.html import format_html
#from django.urls import reverse
from healthHub.models.base import UserCreation
from healthHub.models.recipe import Recipe
from healthHub.models.plan import Plan, PlanDetail, LinkedPlan


# Inline admins for related models
class RecipeInline(admin.StackedInline):
    model = Recipe
    extra = 0
    fields = ('prep_time', 'serv', 'ingredients', 'directions', 'nutrients')
    can_delete = False


class PlanInline(admin.StackedInline):
    model = Plan
    extra = 0
    fields = ('duration', 'goal')
    can_delete = False


class PlanDetailInline(admin.TabularInline):
    model = PlanDetail
    extra = 1
    fields = ('parent_section', 'section', 'detail', 'order')
    ordering = ['order']


class LinkedPlanInline(admin.StackedInline):
    model = LinkedPlan
    extra = 0
    fk_name = 'full_plan'
    fields = ('diet_plan', 'exercise_plan')
    can_delete = False


# Register your models here.
admin.site.register(UserCreation)
admin.site.register(Recipe)
admin.site.register(Plan)
admin.site.register(PlanDetail)
admin.site.register(LinkedPlan)

# # Main UserCreation Admin
# @admin.register(UserCreation)
# class UserCreationAdmin(admin.ModelAdmin):
#     list_display = ('name', 'type_badge', 'creator', 'shared_badge', 'created', 'edited')
#     list_filter = ('type', 'shared', 'created', 'edited')
#     search_fields = ('name', 'creator__username', 'creator__email', 'notes')
#     readonly_fields = ('created', 'edited', 'concrete_link')
#     date_hierarchy = 'created'
    
#     fieldsets = (
#         ('Basic Information', {
#             'fields': ('creator', 'name', 'type', 'shared')
#         }),
#         ('Content', {
#             'fields': ('notes', 'media')
#         }),
#         ('Timestamps', {
#             'fields': ('created', 'edited'),
#             'classes': ('collapse',)
#         }),
#         ('Related Object', {
#             'fields': ('concrete_link',),
#             'classes': ('collapse',)
#         }),
#     )
    
#     def get_inlines(self, request, obj=None):
#         """Dynamically show appropriate inline based on type"""
#         if obj is None:
#             return []
#         if obj.type == 'recipe':
#             return [RecipeInline]
#         elif obj.type == 'plan':
#             return [PlanInline]
#         return []
    
#     def type_badge(self, obj):
#         """Display type with colored badge"""
#         colors = {
#             'recipe': '#28a745',
#             'plan': '#007bff',
#         }
#         return format_html(
#             '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
#             colors.get(obj.type, '#6c757d'),
#             obj.get_type_display()
#         )
#     type_badge.short_description = 'Type'
    
#     def shared_badge(self, obj):
#         """Display shared status with icon"""
#         if obj.shared:
#             return format_html('<span style="color: green;">✓ Shared</span>')
#         return format_html('<span style="color: gray;">✗ Private</span>')
#     shared_badge.short_description = 'Sharing'
    
#     def concrete_link(self, obj):
#         """Link to the concrete Recipe/Plan object"""
#         concrete = obj.get_concrete()
#         if concrete:
#             url = reverse(f'admin:{concrete._meta.app_label}_{concrete._meta.model_name}_change', args=[concrete.pk])
#             return format_html('<a href="{}">View {} Details</a>', url, obj.get_type_display())
#         return 'No details available'
#     concrete_link.short_description = 'Details'


# # Recipe Admin
# @admin.register(Recipe)
# class RecipeAdmin(admin.ModelAdmin):
#     list_display = ('recipe_name', 'category', 'prep_time', 'serv', 'creator', 'is_shared')
#     list_filter = ('category', 'base__shared', 'base__created')
#     search_fields = ('base__name', 'category', 'base__creator__username')
#     readonly_fields = ('base_link',)
    
#     fieldsets = (
#         ('Base Information', {
#             'fields': ('base_link',)
#         }),
#         ('Recipe Details', {
#             'fields': ('category', 'prep_time', 'serv')
#         }),
#         ('Content', {
#             'fields': ('ingredients', 'directions', 'nutrients')
#         }),
#     )
    
#     def recipe_name(self, obj):
#         return obj.base.name
#     recipe_name.short_description = 'Name'
#     recipe_name.admin_order_field = 'base__name'
    
#     def creator(self, obj):
#         return obj.base.creator
#     creator.short_description = 'Creator'
#     creator.admin_order_field = 'base__creator'
    
#     def is_shared(self, obj):
#         return obj.base.shared
#     is_shared.boolean = True
#     is_shared.short_description = 'Shared'
#     is_shared.admin_order_field = 'base__shared'
    
#     def base_link(self, obj):
#         """Link back to UserCreation"""
#         url = reverse('admin:healthHub_usercreation_change', args=[obj.base.pk])
#         return format_html('<a href="{}">View Base Creation</a>', url)
#     base_link.short_description = 'User Creation'


# # Plan Admin
# @admin.register(Plan)
# class PlanAdmin(admin.ModelAdmin):
#     list_display = ('plan_name', 'plan_type', 'duration', 'creator', 'is_shared', 'detail_count')
#     list_filter = ('plan_type', 'base__shared', 'base__created')
#     search_fields = ('base__name', 'goal', 'base__creator__username')
#     readonly_fields = ('base_link',)
#     inlines = [PlanDetailInline]
    
#     fieldsets = (
#         ('Base Information', {
#             'fields': ('base_link',)
#         }),
#         ('Plan Details', {
#             'fields': ('plan_type', 'duration', 'goal')
#         }),
#     )
    
#     def get_inlines(self, request, obj=None):
#         """Add LinkedPlanInline for full plans"""
#         if obj and obj.plan_type == 'full':
#             return [LinkedPlanInline, PlanDetailInline]
#         return [PlanDetailInline]
    
#     def plan_name(self, obj):
#         return obj.base.name
#     plan_name.short_description = 'Name'
#     plan_name.admin_order_field = 'base__name'
    
#     def creator(self, obj):
#         return obj.base.creator
#     creator.short_description = 'Creator'
#     creator.admin_order_field = 'base__creator'
    
#     def is_shared(self, obj):
#         return obj.base.shared
#     is_shared.boolean = True
#     is_shared.short_description = 'Shared'
#     is_shared.admin_order_field = 'base__shared'
    
#     def detail_count(self, obj):
#         """Show number of plan details"""
#         count = obj.details.count()
#         return format_html('<span style="font-weight: bold;">{}</span>', count)
#     detail_count.short_description = 'Details'
    
#     def base_link(self, obj):
#         """Link back to UserCreation"""
#         url = reverse('admin:healthHub_usercreation_change', args=[obj.base.pk])
#         return format_html('<a href="{}">View Base Creation</a>', url)
#     base_link.short_description = 'User Creation'


# # PlanDetail Admin (optional - for direct management)
# @admin.register(PlanDetail)
# class PlanDetailAdmin(admin.ModelAdmin):
#     list_display = ('section', 'plan_name', 'parent_section', 'order', 'has_detail')
#     list_filter = ('plan__plan_type', 'plan__base__creator')
#     search_fields = ('section', 'detail', 'plan__base__name')
#     list_editable = ('order',)
#     ordering = ('plan', 'parent_section', 'order')
    
#     fieldsets = (
#         (None, {
#             'fields': ('plan', 'parent_section', 'section', 'detail', 'order')
#         }),
#     )
    
#     def plan_name(self, obj):
#         return obj.plan.base.name
#     plan_name.short_description = 'Plan'
#     plan_name.admin_order_field = 'plan__base__name'
    
#     def has_detail(self, obj):
#         return bool(obj.detail)
#     has_detail.boolean = True
#     has_detail.short_description = 'Has Detail'


# # LinkedPlan Admin
# @admin.register(LinkedPlan)
# class LinkedPlanAdmin(admin.ModelAdmin):
#     list_display = ('full_plan_name', 'diet_plan_link', 'exercise_plan_link', 'creator')
#     search_fields = ('full_plan__base__name', 'diet_plan__base__name', 'exercise_plan__base__name')
    
#     fieldsets = (
#         ('Full Plan', {
#             'fields': ('full_plan',)
#         }),
#         ('Linked Plans', {
#             'fields': ('diet_plan', 'exercise_plan')
#         }),
#     )
    
#     def full_plan_name(self, obj):
#         return obj.full_plan.base.name
#     full_plan_name.short_description = 'Full Plan'
    
#     def diet_plan_link(self, obj):
#         if obj.diet_plan:
#             url = reverse('admin:healthHub_plan_change', args=[obj.diet_plan.pk])
#             return format_html('<a href="{}">{}</a>', url, obj.diet_plan.base.name)
#         return '-'
#     diet_plan_link.short_description = 'Diet Plan'
    
#     def exercise_plan_link(self, obj):
#         if obj.exercise_plan:
#             url = reverse('admin:healthHub_plan_change', args=[obj.exercise_plan.pk])
#             return format_html('<a href="{}">{}</a>', url, obj.exercise_plan.base.name)
#         return '-'
#     exercise_plan_link.short_description = 'Exercise Plan'
    
#     def creator(self, obj):
#         return obj.full_plan.base.creator
#     creator.short_description = 'Creator'



