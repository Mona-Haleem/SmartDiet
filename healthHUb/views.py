from django.shortcuts import render,get_object_or_404#, redirect
#from django.db import IntegrityError
from django.http import Http404, JsonResponse#, HttpResponseRedirect
from django.conf import settings

#from django.urls import reverse
from core.helpers.validators import validate_image
from healthHub.helpers.creationManage import CreationHelper
from healthHub.models import UserCreation ,Recipe , Plan ,PlanDetail
from healthHub.models.plan import PlanType
from healthHub.models import serializers as serializer
from healthHub.helpers.paginator import paginator
from healthHub.helpers.construct_query import construct_query
from healthHub.helpers.helpers import format_plan_details ,getLinksData
from healthHub.helpers.nurtientCalculator import get_nutrition_info_usda
from healthHub.helpers.nurtientCalculator import *
from django.views.decorators.http import require_GET
from django.views import View
from django.db.models import F

from datetime import date, datetime, timedelta
import json
import math
import uuid
import os

# Create your views here.

@require_GET
def index(request,mode,userId=None):
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
    if(userId):
        filters["creator__id"] = userId
    query = UserCreation.objects.filter(**filters).exclude(**exclude).order_by(order) 
    print("total items",len(query))

   

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
        db_categories = list(
            UserCreation.objects
            .filter(**user_filter)
            .exclude(category__in=[PlanType.choices])
            .values_list('category', flat=True)
            .distinct()
        )

        all_categories = {choice.value for choice in PlanType}

        allowable_categories = list(set(db_categories) | all_categories)
        allPlans = list(
            Plan.objects.filter(base__creator=request.user)
                        .exclude(base__category='full')
                        .annotate(
                            name=F('base__name'),
                            category=F('base__category')
                        )
                        .values("id", "name", "category")
        )
        return render(request, 'browser.html',{
            "result":{**result, "items":json.dumps(serializer.user_creation(result["items"]))},
            "categories":allowable_categories,
            "recipeCategories":db_categories,
            "children_template":"components/browser/cardList.html",
            "mode":mode,
            "allPlans":allPlans
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

class DetailsView(View):

    def dispatch(self, request, *args, **kwargs):
        if request.resolver_match.url_name == 'plans':
            self.type = 'plan'
        else:
            self.type = 'recipe'
        print("dispatch done")
        return super().dispatch(request, *args, **kwargs)
    
    def get(self,request,id,name):
        try:
            ele = Plan.objects.get(id=id) if self.type == 'plan' else Recipe.objects.get(id=id)
        except Plan.DoesNotExist or Recipe.DoesNotExist:
            raise Http404(f"{self.type.capitalize} not found")
        if ele.base.creator != request.user and ele.base.shared == False:
            raise Http404(f"{self.type.capitalize} not found")
        print(ele ,ele.id)
        refs = getLinksData(request,ele)
        return render(request,'details.html',{""
            "ele":serializer.plan([ele],request)[0] if self.type == 'plan' else serializer.recipe([ele],request)[0],
            "children_template":"components/details/detailPage.html",
            "refs":refs
        })
   
    def post(self, request,id,name):
        """Handle creation of new elements"""
        if id == 'new' :
            print("start creation logic")
            success, data, status = CreationHelper.create_element(request,self.type)
        else:
            ele = UserCreation.objects.filter(id=id).first()
            if not ele or ele.shared == False:
                return JsonResponse({'error': 'Permission denied'}, status=403)
            if ele.creator == request.user:
                return JsonResponse({'error': 'user already own this ele'}, status=403)
            success, data, status =  CreationHelper.create_Clone(request,self.type,ele)
        return JsonResponse(data, status=status)

    def patch(self,request,id,name):
        data = json.loads(request.body)
        if self.type=='plan':
            ele = Plan.objects.get(id=id)
        else:
            ele = Recipe.objects.get(id=id)
        if ele.base.creator != request.user:
            return JsonResponse({'error': 'not allowed'},status=400)

        key, value = list(data.items())[0]
        if key == 'name':
            dublicate = UserCreation.objects.filter(creator=request.user,name=value,type=ele.base.type).exclude(id=ele.base.id)
            if dublicate.exists():
                return JsonResponse({'error': 'Invalid username'},status=400)
        if key in ['name' ,'notes','media',"shared","favorite"]:
            if key in ["shared","favorite"]:
                value = bool(value)
                print(ele)
            setattr(ele.base, key, value)
            ele.base.save()
            return JsonResponse({"message": "Element updated successfully", "data": {key: value}})
        if key == 'duration'or key == 'prep_time':
            value= timedelta(minutes=int(value))
        print(key,value)
        setattr(ele, key, value)
        ele.save()
        if key == 'directions':
            detail = {
                "type": "div",
                "content": value,
                "effects": []
            }
            print(detail)
            return render(request, "components/details/detailContent.html", {
                "detail":detail
            })
        if key == 'ingredients':
            ele.nutrients = get_nutrition_info_usda(ele)
            ele.save()
            return JsonResponse({"message": "Element updated successfully", "data": {key: value,"nutrients":ele.nutrients}})

        return JsonResponse({"message": "Element updated successfully", "data": {key: value}})
 

    def put(self, request, id, name):
        return JsonResponse({"method": "PUT"})

    def delete(self, request, id, name):
        if self.type == "plan":
            ele = UserCreation.objects.get(plan__id=id)
        else:
            ele = UserCreation.objects.get(recipe__id=id)
        if ele.creator != request.user:
            return JsonResponse({'error': 'Permission denied'}, status=403)
        ele.delete()

        return JsonResponse({"method": "DELETE"})


def mediaManager(request,type,id):
    if request.method == "POST":
        print(request.FILES)
        if not request.FILES.get('media'):
            return JsonResponse({'error': 'No image provided'}, status=400)

        img = request.FILES['media']
        valid,error = validate_image(img)
        print(valid,error)
        if not valid:
            return JsonResponse({'error': error }, status=400)   
        
        ext = os.path.splitext(img.name)[1].lower()
        img_name = f"{uuid.uuid4().hex}{ext}"

        upload_dir = os.path.join(settings.MEDIA_ROOT, type+'s', str(id))
        os.makedirs(upload_dir, exist_ok=True)

        image_path = os.path.join(upload_dir, img_name)

        # Save file
        with open(image_path, 'wb+') as destination:
            for chunk in img.chunks():
                destination.write(chunk)
        ele = UserCreation.objects.get(id=id)
        img_url = f"/media/{type}s/{id}/{img_name}"
        ele.media.append(img_url)
        ele.save()
        return JsonResponse({'mediaUrl': img_url}, status=200)
    elif request.method == "PATCH":
        data = json.loads(request.body)
        media_url = data.get('mediaUrl')
        if not media_url:
            return JsonResponse({'error': 'No media URL provided'}, status=400)
        if(f"/media/{type}s/" in media_url):
            media_url = f"/media/{type}s/" +media_url.split(f"/media/{type}s/")[-1]
        print("Deleting media:", media_url)
        stillInUse = UserCreation.objects.filter(media__icontains=media_url).exclude(id=id).exists()

        ele = UserCreation.objects.get(id=id)
        if media_url in ele.media:
            ele.media.remove(media_url)
            ele.save()
            if not stillInUse:
                file_path = os.path.join(settings.MEDIA_ROOT, media_url.replace('/media/', ''))
                if os.path.exists(file_path):
                    os.remove(file_path)
            return JsonResponse({'message': 'Media deleted successfully'}, status=200)
        else:
            return JsonResponse({'error': 'Media URL not found in element'}, status=404)


class sectionsManager(View):
    def get(self,request,id):
        return JsonResponse({"method": "GET"})
   
    def post(self, request,id):
        data = json.loads(request.body)
        section_name = data.get("section", "section")
        detail = data.get("detail", [])
        target_id = id
        target_relation = data.get("targetRelation")  
        order = data.get("order", 1)

        if target_relation == "parent":
            parent_section = get_object_or_404(PlanDetail, id=target_id)
        else:
            sibling = get_object_or_404(PlanDetail, id=target_id)
            parent_section = sibling.parent_section
        
        if parent_section:
            plan = parent_section.plan
        else:
            plan = sibling.plan

        
        # Shift order of siblings if needed
        siblings = PlanDetail.objects.filter(parent_section=parent_section).filter(order__gte=order)
        siblings.update(order=F('order') + 1)

        # Create new section
        new_section = PlanDetail.objects.create(
            parent_section=parent_section,
            plan=plan,
            section=section_name,
            detail=detail,
            order=order
        )
        details =format_plan_details([new_section])

         # Render the HTML fragment
        html = render(request, "components/details/section.html", {"details": details,"ele":{"isOwner":"true"}}).content.decode()
        print("html =======>" ,details,html,new_section)
        # Return JSON
        response_data = {
            "detail":details,
            "html": html,
        }

        return JsonResponse(response_data, status=201)


    def patch(self,request,id):
        print(id)
        data = json.loads(request.body)
        ele = PlanDetail.objects.get(id=id)
        key, value = list(data.items())[0]
            
        print(key)
        if key == 'detail':
            ele.detail = value
            ele.save()
            if len(value) == 1:
                detail = value[0]
            else:
                detail = {
                    "type": "div",
                    "content": value,
                    "effects": []
                }
            print(detail)
            return render(request, "components/details/detailContent.html", {
                "detail":detail
            })
        elif key == 'section':
            if PlanDetail.objects.filter(
                parent_section=ele.parent_section,
                section=value
            ).exists():
                return JsonResponse(
                    {"error": "This section name already exists."},
                    status=400
                )
            ele.section = value
        elif key == 'order':
            parent_id = data.get("parentId")
            parent_section = PlanDetail.objects.get(id=parent_id) if parent_id else None
            ele.parent_section = parent_section
            ele.order = value
            PlanDetail.objects.filter(
                parent_section=parent_section
            ).exclude(
                id=ele.id
            ).filter(
             order__gte=ele.order
            ).update(order=F('order') + 1)
        else:
            return JsonResponse(
                {"error": "Invalid field."},
                status=400
            )
        print(ele.section , ele.order , ele.parent_section)
        ele.save()
        return JsonResponse({"message": "Element updated successfully", "data": {key: value}})

    def put(self, request, id):
        return JsonResponse({"method": "PUT"})

    def delete(self, request, id):
        try:
            section = PlanDetail.objects.get(id=id)
            plan = section.plan
            section.delete()
        except PlanDetail.DoesNotExist:
            return JsonResponse({"error": "Section not found"}, status=404)
        details = plan.get_details()
        return JsonResponse({"details":details} , status=200)