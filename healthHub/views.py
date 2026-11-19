from django.utils.decorators import method_decorator
from core.helpers.api import api_endpoint, read_object, number
from healthHub.helpers.content import validate_details
from healthHub.forms import RecipeForm
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
from django.db import transaction

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
    query = UserCreation.objects.filter(**filters).exclude(**exclude).select_related(
        "creator", "recipe", "plan"
    ).order_by(order, "pk")

   

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
        except (Plan.DoesNotExist, Recipe.DoesNotExist):
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
            relation = "plan" if self.type == "plan" else "recipe"
            ele = UserCreation.objects.filter(**{f"{relation}__id": id}).first()
            if not ele or ele.shared == False:
                return JsonResponse({'error': 'Permission denied'}, status=403)
            if ele.creator == request.user:
                return JsonResponse({'error': 'user already own this ele'}, status=403)
            success, data, status =  CreationHelper.create_Clone(request,self.type,ele)
        return JsonResponse(data, status=status)

    @method_decorator(api_endpoint)
    def patch(self, request, id, name):
        item = get_object_or_404(Plan if self.type == 'plan' else Recipe, pk=id)
        if item.base.creator_id != request.user.pk:
            return JsonResponse({'error': 'Permission denied'}, status=403)
        data = read_object(request)
        if len(data) != 1:
            raise ValueError('Update one supported field at a time')
        key, value = next(iter(data.items()))
        base_fields = {'name', 'notes', 'media', 'shared', 'favorite'}
        allowed = base_fields | ({'goal', 'duration'} if self.type == 'plan' else {'serv', 'prep_time', 'directions', 'ingredients'})
        if key not in allowed:
            raise ValueError('Unsupported field')
        if key in {'name', 'notes', 'goal'} and not isinstance(value, str):
            raise ValueError('Text is required')
        if key == 'name':
            if not value.strip() or len(value) > 100 or UserCreation.objects.filter(creator=request.user, name=value).exclude(pk=item.base_id).exists():
                raise ValueError('Choose a valid, unique name')
        if key in {'shared', 'favorite'} and not isinstance(value, bool):
            raise ValueError('A boolean is required')
        if key == 'media' and (not isinstance(value, list) or any(not isinstance(v, str) for v in value)):
            raise ValueError('Media must be a list of URLs')
        if key in {'duration', 'prep_time', 'serv'}:
            numeric = number(value)
            if not numeric.is_integer() or numeric < (0 if key == 'prep_time' else 1):
                raise ValueError('Enter a valid positive integer')
            value = timedelta(minutes=int(numeric)) if key != 'serv' else int(numeric)
        if key == 'directions':
            validate_details(value)
        if key == 'ingredients':
            form = RecipeForm({'serv': item.serv, 'ingredients': value}, calculate_nutrition=False)
            if not form.is_valid():
                raise ValueError(str(form.errors))
            value = form.cleaned_data['ingredients']
            item.nutrients = get_nutrition_info_usda(value)
        target = item.base if key in base_fields else item
        setattr(target, key, value)
        target.save()
        if key == 'directions':
            return render(request, 'components/details/detailContent.html', {'detail': {'type': 'div', 'content': value, 'effects': []}})
        return JsonResponse({'message': 'Element updated successfully', 'data': {key: data[key], **({'nutrients': item.nutrients} if key == 'ingredients' else {})}})

 

    def put(self, request, id, name):
        return JsonResponse({"method": "PUT"})

    def delete(self, request, id, name):
        if self.type == "plan":
            ele = get_object_or_404(UserCreation, plan__id=id)
        else:
            ele = get_object_or_404(UserCreation, recipe__id=id)
        if ele.creator != request.user:
            return JsonResponse({'error': 'Permission denied'}, status=403)
        ele.delete()

        return JsonResponse({"method": "DELETE"})


def mediaManager(request,type,id):
    # Authorize the base creation before validation, upload, or remote deletion.
    get_object_or_404(UserCreation, id=id, creator=request.user, type=type)

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
    @method_decorator(api_endpoint)
    def dispatch(self, request, *args, **kwargs):
        self.section = get_object_or_404(
            PlanDetail.objects.select_related("plan__base"),
            id=kwargs["id"], plan__base__creator=request.user,
        )
        return super().dispatch(request, *args, **kwargs)

    def get(self,request,id):
        return JsonResponse({"method": "GET"})
   
    def post(self, request,id):
        data = read_object(request)
        section_name = data.get("section", "section")
        detail = data.get("detail", [])
        if not isinstance(section_name, str) or not section_name.strip():
            raise ValueError('Section name is required')
        validate_details(detail)
        target_id = id
        target_relation = data.get("targetRelation")  
        order = data.get("order", 1)

        if not isinstance(order, int) or isinstance(order, bool) or order < 1:
            raise ValueError('Order must be a positive integer')
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
        siblings = PlanDetail.objects.filter(plan=plan, parent_section=parent_section, order__gte=order)
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
        data = read_object(request)
        ele = self.section
        if not data or set(data) - {'detail', 'section', 'order', 'parentId'}:
            raise ValueError('Unsupported section fields')
        key, value = next(iter(data.items()))
        if key == 'section' and (not isinstance(value, str) or not value.strip()):
            raise ValueError('Section name is required')
        if key == 'order' and (not isinstance(value, int) or isinstance(value, bool) or value < 1):
            raise ValueError('Order must be a positive integer')
        if key == 'detail':
            validate_details(value)
            
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
                plan=ele.plan,
                parent_section=ele.parent_section,
                section=value
            ).exclude(pk=ele.pk).exists():
                return JsonResponse(
                    {"error": "This section name already exists."},
                    status=400
                )
            ele.section = value
        elif key == 'order':
            parent_id = data.get("parentId")
            parent_section = get_object_or_404(PlanDetail, id=parent_id, plan=ele.plan) if parent_id else None
            ancestor = parent_section
            while ancestor:
                if ancestor.pk == ele.pk:
                    return JsonResponse({'error': 'A section cannot contain itself'}, status=400)
                ancestor = ancestor.parent_section
            ele.parent_section = parent_section
            ele.order = value
            PlanDetail.objects.filter(
                plan=ele.plan,
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
            section = self.section
            plan = section.plan
            section.delete()
        except PlanDetail.DoesNotExist:
            return JsonResponse({"error": "Section not found"}, status=404)
        details = plan.get_details()
        return JsonResponse({"details":details} , status=200)
