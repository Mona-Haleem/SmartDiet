from django.urls import reverse
from django.templatetags.static import static
from django.conf import settings
import json
def user_creation(queryset):
    """
    Converts a queryset or list of UserCreation instances
    into a list of dictionaries suitable for JSON response.
    """
    serialized = []
    for obj in queryset:
        serialized.append({
            "id": obj.id,
            "type_id":obj.get_concrete().id,
            "name": obj.name,
            "media":len(obj.media) and obj.media[0] or static('assets/logo.png') ,
            "category": obj.category,  
            "type": obj.type,
            "creator": obj.creator.username if obj.creator else None,
            "shared": obj.shared,
            "favorite": obj.favorite,
            "edited": obj.edited.isoformat() ,
            "created": obj.created.isoformat() ,
            "details_path":reverse(f'{obj.type}s', kwargs={
                "id":obj.get_concrete().id,
                "name":obj.name
            })
        })
    return serialized

def recipe(queryset, request):
    """
    Converts a queryset or list of recipes instances
    into a list of dictionaries suitable for JSON response.
    """
    serialized = []
    for obj in queryset:
        serialized.append({
            "id": obj.id,
            "creation_id":obj.base.id,
            "name": obj.base.name,
            "media":obj.base.media or [static('assets/logo.png')] ,
            "category": obj.base.category,  
            "creator": obj.base.creator.username ,
            "isOwner":json.dumps(obj.base.creator == request.user),
            "shared": json.dumps(obj.base.shared),
            "edited": obj.base.edited.isoformat() ,
            "created": obj.base.created.isoformat(),
            "notes":obj.base.notes ,
            "prep_time": {
                "h": obj.prep_time.seconds // 3600,
                "m": (obj.prep_time.seconds // 60) % 60
            } if obj.prep_time else {"h":0,"m":0} ,            
            "serv": obj.serv,
            "ingredients": obj.ingredients or [],
            "directions": obj.directions or "",
            "nutrients": obj.nutrients or {},
            "type" :obj.base.type,
        })
    return serialized

def plan(queryset, request):
    """
    Converts a queryset or list of recipes instances
    into a list of dictionaries suitable for JSON response.
    """
    serialized = []
    for obj in queryset:
        serialized.append({
            "id": obj.id,
            "creation_id":obj.base.id,
            "name": obj.base.name,
            "media":obj.base.media  or [static('assets/logo.png')] ,
            "category": obj.base.category,  
            "creator": obj.base.creator.username ,
            "isOwner":json.dumps(obj.base.creator == request.user),
            "shared": json.dumps(obj.base.shared),
            "edited": obj.base.edited.isoformat() ,
            "created": obj.base.created.isoformat(),
            "notes":obj.base.notes ,
            "duration":  obj.duration.days ,
            "goal": obj.goal,
            "details": obj.get_details(),
            "details_flat":json.dumps(details(obj.details.all().order_by('parent_section', 'order'))),
            "type" :obj.base.type, 
        })
    return serialized
    

def details(queryset):
    """
    Converts a queryset or list of recipes instances
    into a list of dictionaries suitable for JSON response.
    """
    serialized = []
    for obj in queryset:
        serialized.append({
            "id": obj.id,
            "section":obj.section,
            "detail": obj.detail,
            "order":obj.order,
            "parent": None if not obj.parent_section else obj.parent_section.id           
        })
    return serialized
    

