from django.http import  JsonResponse

def ajaxRedirect(url, message):
  response = JsonResponse({"message": message})
  response["X-Redirect"] = url  
  return response

