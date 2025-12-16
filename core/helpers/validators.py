def validate_image(img):
    valid_img_types = ['image/jpeg', 'image/png', 'image/gif','image/webp']
    error =''
    if img.content_type not in valid_img_types:
        error = 'Unsupported file type.'
        return False , 
    # Validate file size 
    max_size = 5 * 1024**2
    if img.size > max_size:
        error ='File size exceeds 5MB limit.'
   
    if error:
        return False , error
    else:
        return True,None   