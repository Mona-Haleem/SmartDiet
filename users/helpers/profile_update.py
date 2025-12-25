from datetime import date
from decimal import Decimal
import os
from django.conf import settings
from django.utils.dateparse import parse_date
from users.models import User
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
    age = None
    data = json.loads(request.body)
    for key, value in data.items():
        if hasattr(request.user, key):
            field_type = type(getattr(request.user, key))
            
            if field_type == date:
                setattr(request.user, key, parse_date(value))
                age = request.user.age
            elif field_type in (Decimal, float, int):
                value = Decimal(value)
                if value > 0:
                    setattr(request.user, key, value)
            else:
                setattr(request.user, key, value)
    
    request.user.save()
    return age

