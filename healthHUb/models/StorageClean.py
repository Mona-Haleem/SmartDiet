import os
from django.db.models.signals import pre_delete
from django.dispatch import receiver
from healthHub.models import UserCreation

@receiver(pre_delete, sender=UserCreation)
def delete_usercreation_media(sender, instance, **kwargs):
    """
    Deletes local media files if no other UserCreation uses them
    """
    for media_path in instance.media:
        # Check if any other UserCreation uses this file
        exists = UserCreation.objects.filter(media__contains=[media_path]).exclude(pk=instance.pk).exists()
        if not exists:
            # Safe to delete from storage
            if os.path.exists(media_path):
                os.remove(media_path)
