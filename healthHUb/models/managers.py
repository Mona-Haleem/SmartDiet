from django.db import models
from collections import defaultdict


class UserCreationManager(models.Manager):
    def create(self,**kwargs):
        from healthHub.models.recipe import Recipe
        from healthHub.models.plan import Plan
        """Create a UserCreation with its corresponding subclass"""

        field_names = {field.name for field in self.model._meta.get_fields()}
        model_kwargs = {k: v for k, v in kwargs.items() if k in field_names}
        extra_kwargs = {k: v for k, v in kwargs.items() if k not in field_names}


        base = self.model(**model_kwargs)
        base.full_clean()  # optional, ensures validation
        base.save(using=self._db)

        # Automatically create related objects
        if base.type == 'recipe':
            Recipe.objects.create(base=base,**extra_kwargs)
        elif base.type == 'plan':
            Plan.objects.create(base=base,**extra_kwargs)

        return base

    
    def get_with_details(self, pk):
        """Fetch UserCreation with prefetched details to avoid N+1 queries"""
        obj = self.select_related('recipe', 'plan').get(pk=pk)
        if obj.type == 'plan' and hasattr(obj, 'plan'):
            # Prefetch plan details to avoid additional queries
            from healthHub.models.plan import Plan
            obj.plan = Plan.objects.prefetch_related(
                'details__parent_section'
            ).get(base=obj)
        return obj


def format_plan_details(details):
    """Format hierarchical plan details from flat queryset"""
    # Build lookup table: parent_id -> list of children
    section_map = defaultdict(list)
    for detail in details:
        section_map[detail.parent_section_id].append(detail)

    # Sort children by 'order' (ensures display order consistency)
    for children in section_map.values():
        children.sort(key=lambda x: x.order)

    # Recursive builder using in-memory data
    def build(parent_id=None):
        sections = []
        for detail in section_map.get(parent_id, []):
            sections.append({
                "id":detail.id,
                "section": detail.section,
                "detail": detail.detail,
                "order": detail.order,
                "subSections": build(detail.id)
            })
        return sections

    return build(None)