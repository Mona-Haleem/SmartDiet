from django.shortcuts import render, redirect
from django.contrib.auth import  login, logout
from django.db import IntegrityError
from django.http import  JsonResponse, HttpResponseRedirect
from django.urls import reverse
from core.helpers.ajaxRedirect import ajaxRedirect
from users.models import User
from users.forms.login_form import LoginForm
from users.forms.register_form import RegisterForm
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
        return ajaxRedirect(reverse("index"), "Logged in successfully")
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

