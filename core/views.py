from django.shortcuts import render
from django.http import HttpResponse
from django.template import loader
from users.forms import login_form , register_form

# Create your views here.
def index(request,slug="login"):
    if request.user.is_authenticated:
        return render(request, 'index.html',{"slug":""})
    else:
        form = login_form.LoginForm() if slug == "login" else register_form.RegisterForm()
        return render(request, 'auth.html', {
            "form": form,
            "slug": slug ,
        })



