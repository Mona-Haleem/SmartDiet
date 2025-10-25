from django.shortcuts import render, redirect
from django.contrib.auth import  login, logout
from django.db import IntegrityError
from django.http import  JsonResponse, HttpResponseRedirect
from django.urls import reverse
from django_htmx.http import HttpResponseClientRedirect  
from users.helpers import auth
from users.models import User
from users.forms.login_form import LoginForm
from users.forms.register_form import RegisterForm
# Create your views here.
def login_user(request):
    if request.method == "POST":
        form = LoginForm(request.POST)
        if form.is_valid():
            login(request, form.user)
            return redirect("index")
        else:
            return render(request, "components/errorMsg.html", {"form": form})
    else:
        if request.htmx:
            return render(request, "components/authForm.html", {
                "form": LoginForm(),
                "slug":"login"
            })
        return HttpResponseRedirect(reverse("index",args=["login"]))



def register(request):
    if request.method == "POST":
        form = RegisterForm(request.POST)
        if not form.is_valid():
            return render(request, "components/errorMsg.html", {
                "form": form
            })
        
        email = request.POST["email"]
        username = email.split('@')[0]
        password = request.POST["password"]
        
        try:
            user = User.objects.create_user(username.lower(), email, password)
            user.save()
        except IntegrityError:
            return render(request, "components/errorMsg.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return redirect("index")
    else:
        if request.htmx:
            return render(request, "components/authForm.html", {
                "form": RegisterForm(),
                "slug":"register"
            })
        return HttpResponseRedirect(reverse("index",args=["register"]))

    

def logout_user(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))

