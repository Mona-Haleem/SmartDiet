def user_creation(queryset):
    """
    Converts a queryset or list of UserCreation instances
    into a list of dictionaries suitable for JSON response.
    """
    serialized = []
    for obj in queryset:
        serialized.append({
            "id": obj.id,
            "name": obj.name,
            "media":obj.media[0] or '/static/images/logo.png' ,
            "category": obj.category,  
            "type": obj.type,
            "creator": obj.creator.username if obj.creator else None,
            "shared": obj.shared,
            "edited": obj.edited.isoformat() ,
            "created": obj.created.isoformat() 
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
            "media":obj.base.media or ['/static/images/logo.png'] ,
            "category": obj.base.category,  
            "creator": obj.base.creator.username ,
            "isOwner":obj.base.creator == request.user,
            "shared": obj.base.shared,
            "edited": obj.base.edited.isoformat() ,
            "created": obj.base.created.isoformat(),
            "notes":obj.base.notes ,
            "prep_time": (
                str(obj.prep_time) if obj.prep_time is not None else None
            ),
            "serv": obj.serv,
            "ingredients": obj.ingredients or [],
            "directions": obj.directions or "",
            "nutrients": obj.nutrients or {},

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
            "media":obj.base.media or ['/static/images/logo.png'] ,
            "category": obj.base.category,  
            "creator": obj.base.creator.username ,
            "isOwner":obj.base.creator == request.user,
            "shared": obj.base.shared,
            "edited": obj.base.edited.isoformat() ,
            "created": obj.base.created.isoformat(),
            "notes":obj.base.notes ,
            "duration": (
                str(obj.duration) if obj.duration is not None else None
            ),
            "goal": obj.goal,
            "detials": obj.get_details(),
          
        })
    return serialized
    
