from datetime import date
from decimal import Decimal
import os
from django.conf import settings
from django.utils.dateparse import parse_date
from users.models import User
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
import json
import os

def update_profile_image(img, request):
    print(f"Received file: {img.name}, size: {img.size}")
    
    # Safely get file extension
    file_parts = img.name.rsplit('.', 1) 
    ext = file_parts[1] if len(file_parts) > 1 else 'jpg'  

    # Generate new image name
    img_name = f'{request.user.username}_avatar.{ext}'
    
    # Delete old image if it exists
    if request.user.avatar_img:
        old_path = request.user.avatar_img.path
        try:
            if os.path.isfile(old_path):
                os.remove(old_path)
                print(f'Deleted old image: {old_path}')
        except Exception as e:
            print(f'Error deleting old image: {e}')
            # Continue anyway - we don't want to fail upload because of delete issues
    
    # Save new image
    request.user.avatar_img.save(img_name, img, save=True)
    print("Returned_img ==>",request.user.avatar_img.url)
    return request.user.avatar_img.url

def update_username(username,user):
    exist = User.objects.filter(username=username).exclude(id=user.id)
    if exist:
        return {'error': 'Invalid username'},400
    else:
        user.username = username
        user.save()
        return {'username': username},200

def update_profile_data(request):
    data = json.loads(request.body)
    allowed = {"birth_date", "gender", "weight", "height", "activity_level",
               "fluid_intake", "sleep_quality", "sleep_duration"}
    if not isinstance(data, dict) or not data or set(data) - allowed:
        raise ValidationError("Unsupported profile field.")
    values = {}
    for key, raw in data.items():
        value = User._meta.get_field(key).clean(raw, request.user)
        if key in {"weight", "height", "fluid_intake", "sleep_duration"}:
            if not value.is_finite() or value <= 0:
                raise ValidationError({key: "Enter a positive finite value."})
        if key == "birth_date" and value > timezone.localdate():
            raise ValidationError({key: "Birth date cannot be in the future."})
        values[key] = value
    with transaction.atomic():
        for key, value in values.items():
            setattr(request.user, key, value)
        request.user.full_clean()
        request.user.save(update_fields=list(values))
    return request.user.age if "birth_date" in values else None

