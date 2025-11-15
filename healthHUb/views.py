from django.shortcuts import render,get_object_or_404#, redirect
#from django.db import IntegrityError
from django.http import Http404, JsonResponse#, HttpResponseRedirect
#from django.urls import reverse
#from core.helpers.ajaxRedirect import ajaxRedirect
from healthHub.models import UserCreation ,Recipe , Plan
from healthHub.models import serializers as serializer
from healthHub.helpers.paginator import paginator
from healthHub.helpers.construct_query import construct_query
from django.views.decorators.http import require_GET

# Create your views here.

@require_GET
def index(request,mode):
    pageSize = int(request.GET.get('size', 12))
    page = int(request.GET.get('page', 1))

    filters , order = construct_query(request, mode)
    print(filters , order)

    query = UserCreation.objects.filter(**filters).order_by(order) 
    print(query)

    result = paginator(query,pageSize,page)
    print({**result, "items":serializer.user_creation(result["items"])})

    fetch_mode = request.headers.get("Sec-Fetch-Mode")
    print('fetch',fetch_mode)
    is_fullpage_request = (
        fetch_mode == "navigate"
        or fetch_mode is None
    )

    if is_fullpage_request:
        user_filter = {'creator':request.user} if mode == 'user' else {'shared':True}
        allowable_categories = UserCreation.objects.filter(user_filter).values_list('category',flat=True).distinct()
        return render(request, 'list.html',{"result":result,"categories":allowable_categories})
    else:
        return JsonResponse({
            "result":{**result, "items":serializer.user_creation(result["items"])}
            }, status=200)  

@require_GET
def plan_details(request,id,title):
    ele = get_object_or_404(Plan,id=id)
    return render(request,'details.html',{"data":serializer.plan([ele],request)[0]})

@require_GET
def recipe_details(request,id,title):
    # try:
    #     ele = Recipe.objects.get(id=id)
    # except Recipe.DoesNotExist:
    #     raise Http404("Recipe not found")
    ele = get_object_or_404(Recipe,id=id)
    return render(request,'details.html',{"data":serializer.recipe([ele],request)[0]})

def collection(request):
    return