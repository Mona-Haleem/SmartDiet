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
import json
import math
# Create your views here.

@require_GET
def index(request,mode):
    
    pageSize = request.GET.get('size', 24 )
    page = request.GET.get('page', 1)
    try:
        page = int(page)
        pageSize = int(pageSize)
    except (TypeError, ValueError):
        page = 1

    try:
        pageSize = int(pageSize)
    except (TypeError, ValueError):
        pageSize = 24

    if pageSize <= 0 or pageSize > 24:
        pageSize = 24
    if page < 1:
        page = 1

    filters , order , exclude = construct_query(request, mode)
    print(page, pageSize ,filters , order)

    query = UserCreation.objects.filter(**filters).exclude(**exclude).order_by(order) 
    print(len(query))

   

    try:
        result = paginator(query,pageSize,page)
    except (ValueError) as e:
        page = max(1, math.ceil(query.count() / pageSize))
        result = paginator(query,pageSize,page)
    
    print("dataSet", pageSize, len(result["items"]))
    
    fetch_mode = request.headers.get("Sec-Fetch-Mode")
    is_fullpage_request = (
        fetch_mode == "navigate"
        or fetch_mode is None
    )

    if is_fullpage_request:
        user_filter = {'creator':request.user} if mode == 'user' else {'shared':True}
        allowable_categories = list(
                        UserCreation.objects.filter(**user_filter).values_list('category',flat=True).distinct()
                        )
      
        return render(request, 'browser.html',{
            "result":{**result, "items":json.dumps(serializer.user_creation(result["items"]))},
            "categories":allowable_categories,
            "children_template":"components/browser/cardList.html",
            "mode":mode
            })
    else:
        return JsonResponse({
            "result":{**result, "items":serializer.user_creation(result["items"])}
            }, status=200)  

@require_GET
def plan_details(request,id,name):
    try:
        ele = Plan.objects.get(id=id)
    except Plan.DoesNotExist:
        raise Http404("Plan not found")
    if ele.base.creator != request.user and ele.base.shared == False:
        raise Http404("Plan not found")
    print(ele ,ele.id)
    return render(request,'details.html',{""
        "ele":serializer.plan([ele],request)[0],
        "children_template":"components/details/detailPage.html",
    })

@require_GET
def recipe_details(request,id,name):
    try:
        ele = Recipe.objects.get(id=id)
    except Recipe.DoesNotExist:
        raise Http404("Recipe not found")
    if ele.base.creator != request.user and ele.base.shared == False:
        raise Http404("Recipe not found")
   
    return render(request,'details.html',{
        "ele":serializer.recipe([ele],request)[0],
        "children_template":"components/details/detailPage.html",
        })

def collection(request):
    return