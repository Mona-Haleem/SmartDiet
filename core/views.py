from django.shortcuts import render
from django.http import HttpResponse
from django.template import loader
from users.models import User
from users.forms import login_form , register_form
from healthHub.models import Plan ,serializers
# Create your views here.
def index(request,slug="login"):
    if request.user.is_authenticated:
        #user = User.objects.get() 
        allPlans = Plan.objects.filter(base__creator=request.user)
        plans = {
            "diet":{},
            "exercies":{}
        }
        return render(request, 'index.html',{"slug":"","user":request.user,"todayPlans":plans,"allPlans":serializers.plan(allPlans,request)})
    else:
        form = login_form.LoginForm() if slug == "login" else register_form.RegisterForm()
        return render(request, 'auth.html', {
            "form": form,
            "slug": slug ,
        })



