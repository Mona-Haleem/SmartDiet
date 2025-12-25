from django.shortcuts import render, redirect
from django.contrib.auth import  login, logout
from django.db import IntegrityError
from django.http import  JsonResponse, HttpResponseRedirect
from django.urls import reverse
from django.views import View
from core.helpers.ajaxRedirect import ajaxRedirect
from core.helpers.validators import validate_image
from users.helpers.profile_update import *
from users.models import User ,UserRestriction ,MedicalIssues,SLEEP_QUALITY_CHOICES ,ACTIVITY_LEVEL_CHOICES ,RESTRICTIONS_TYPE_CHOICES 
from users.forms.login_form import LoginForm
from users.forms.register_form import RegisterForm
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator

import json
# Create your views here.
def login_user(request):
    if request.method == "POST":
        form = LoginForm(request.POST)
        if form.is_valid():
            login(request, form.user)
            return ajaxRedirect(reverse("index"), "Logged in successfully")
        else:
            return JsonResponse({
            "message": "There were validation errors.",
            "errors": form.errors,
            }, status=400)
        
    elif request.method  == "GET":
        print(request.headers.get("HX-request"))
        if request.headers.get("HX-Request") == "true":
            return render(request, "components/authForm.html", {
                "form": LoginForm(),
                "slug":"login"
            })
        return HttpResponseRedirect(reverse("index",args=["login"]))
    
    else:
        return JsonResponse({"message": "Method not allowed"}, status=405)



def register(request):
    if request.method == "POST":
        form = RegisterForm(request.POST)
        if not form.is_valid():
            return JsonResponse({
            "message": "There were validation errors.",
            "errors": form.errors,
            }, status=400)        
        email = request.POST["email"]
        username = email.split('@')[0]
        password = request.POST["password"]
        
        try:
            user = User.objects.create_user(username.lower(), email, password)
            user.save()
        except IntegrityError:
            return JsonResponse({
                "message": "Email already taken.",
                "errors": "Email already taken.",
            }, status=400)  
        login(request, user)
        return ajaxRedirect(reverse("profile"), "Logged in successfully")
    elif request.method  == "GET":
        print(request.headers.get("HX-request"))
        if request.headers.get("HX-Request") == "true":
            print("htmx request")
            return render(request, "components/authForm.html", {
                "form": RegisterForm(),
                "slug":"register"
            })
        return HttpResponseRedirect(reverse("index",args=["register"]))
    else:
        return JsonResponse({"message": "Method not allowed"}, status=405)

    

def logout_user(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))

@login_required
def profile(request):
    print("-------gettting users -------------")
    user = User.objects.get(email=request.user.email)
    restrictions = UserRestriction.objects.all()
    medicalRestrictions = MedicalIssues.objects.all().order_by("category","name_en")
    print("-----user------\n",user)
    return render(request,"profile.html",{
                                            "user":user.serialize(),
                                            "restrictions":[r.serialize() for r in restrictions],
                                            "ACTIVITY_LEVEL_CHOICES":ACTIVITY_LEVEL_CHOICES,
                                            "SLEEP_QUALITY_CHOICES":SLEEP_QUALITY_CHOICES,
                                            "RESTRICTIONS_TYPE_CHOICES":RESTRICTIONS_TYPE_CHOICES, 
                                            "medicalRestrictions":medicalRestrictions,                        
                                        })

@login_required
def profileUpdate(request):
    print("method called")
    if request.method == 'POST':
        print("Patch detected")
        if request.FILES.get('avatar_img'):
            print("File Found")

            avatar_img = request.FILES['avatar_img']
            valid,error = validate_image(avatar_img)
            if not valid:
                return JsonResponse({'error': error }, status=400)   
            image_url = update_profile_image(avatar_img, request)
            return JsonResponse({'image_url': image_url}, status=200)
    elif request.method == 'PATCH':
        data = json.loads(request.body)
        if 'username' in data:
            username = data['username']
            msg, status = update_username(username,request.user)
            return JsonResponse(msg ,status = status)         
        else :
            age  = update_profile_data(request)
            if age :
                return JsonResponse({'age': age}, status=200)
            
            return JsonResponse({}, status=200)
    return JsonResponse({'error': 'Invalid request'}, status=400)

@method_decorator(login_required, name='dispatch')
class restrictionsManger(View):
    # def get(self,request,id):
    #     return JsonResponse({"method": "GET"})
   
    def post(self, request,id):
        data = json.loads(request.body)
        type = data.get("type")
        remark = data.get("remark","")
        if type == "medical":
            issueId = int(data.get("name"))
            issue = MedicalIssues.objects.get(id=issueId)
            name = issue.name_en
        else:
            issue = None
            name = data.get("name")
        
        newRestriction = UserRestriction.objects.create(
            name=name,
            user=request.user,
            type=type,
            remark=remark,
            ref = issue
        )
        print(newRestriction ,"===============")

        return JsonResponse({'success': True,"restriction":newRestriction.serialize()},status=200)


    # def patch(self,request,id):
    #     return JsonResponse({"message": "Element updated successfully", "data": {key: value}})

    def put(self, request, id):
        data = json.loads(request.body)
        remark = data.get("remark","")
        type = data.get("type")
        if type == "medical":
            issueId = data.get("name")
            issue = MedicalIssues.objects.get(id=issueId)
            name = issue.name_en
        else:
            issue = None
            name = data.get("name")
        restriction = UserRestriction.objects.get(id=id)
        restriction.name = name
        restriction.remark = remark
        restriction.ref = issue
        restriction.save()
        
        return JsonResponse({'success': True,"restriction":restriction.serialize()},status=200)


    def delete(self, request, id):
        try:
            info  = UserRestriction.objects.get(id=id)
            info.delete()
        except UserRestriction.DoesNotExist:
            return JsonResponse({"error": "Section not found"}, status=404)
        return JsonResponse({"message":"info Deleted Sucessfully"} , status=200)
    
