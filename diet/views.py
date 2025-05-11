from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render,get_object_or_404,redirect
from django.urls import reverse
#from django import forms
from datetime import date, datetime, timedelta
from .models import *
from decimal import Decimal
import os
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.utils.dateparse import parse_date
from django.db.models import F,ExpressionWrapper, IntegerField,Avg, DurationField
from django.forms.models import model_to_dict
from .utils.helpers import *
from .utils.forms import *

import re
import calendar

#from collections import defaultdict
#from django.forms.models import model_to_dict
#from django.core.paginator import Paginator

import json

def index(request):
    if request.user.is_authenticated:
        diet_plan ,exercies_plan, prefix = get_current_plans(request.user)
        all_plans = UserPlan.objects.filter(user=request.user).annotate(duration=ExpressionWrapper(
                            F('plan__duration') / timedelta(days=1),
                            output_field=IntegerField()
                        ))
        get_today_tasks(exercies_plan,request.user)
        return render(request, "diet/index.html",{'diet':diet_plan,
                                                'exercies':exercies_plan,
                                                'prefix':prefix,
                                                'all_plans':all_plans
                                                })
    else:
        return render(request, "diet/login.html")

def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username.lower(), password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "diet/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "diet/login.html")

def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))

def register(request):
    if request.method == "POST":
        
        email = request.POST["email"]
        username = email.split('@')[0]
        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "diet/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username.lower(), email, password)
            user.save()
        except IntegrityError:
            return render(request, "diet/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("profile"))
    else:
        return render(request, "diet/register.html")
    
@login_required
def view_profile(request):
    user = User.objects.get(id=request.user.id)
    form = ProfileForm(instance=user)
    issues = MedicalIssue.objects.all().values()
    diet_plan ,exercies_plan, prefix = get_current_plans(user)
    print('D',diet_plan,'E',exercies_plan)
    all_plans = UserPlan.objects.filter(user=user).annotate(duration=ExpressionWrapper(
                            F('plan__duration') / timedelta(days=1),
                            output_field=IntegerField()
                        ))

    return render(request, "diet/profile.html",{'user':user.serialize(),
                                                'form':form,
                                                'medical_form':MedicalForm(),
                                                'remarks_form':RemarksForm(),
                                                'diet':diet_plan,
                                                'exercies':exercies_plan,
                                                'prefix':prefix,
                                                'issues':issues,
                                                'all_plans':all_plans
                                                })

@login_required
@csrf_exempt
def get_data(request, req_data):
    if req_data == 'remarks':
        infos = UserRemarks.objects.filter(user=request.user).order_by('remark')
        data = [{'id':info.id,'item':info.item,'remark':info.remark} for info in infos]
    else:
        issues = MedicalHistory.objects.filter(user=request.user)
        if req_data == 'medical':
            infos = issues.filter(relation__gt=0)   
        else:
            infos = issues.filter(relation=0)
        data = [{'id':info.id,'issue':str(info),'relation':info.get_relation_display()} for info in infos]
    
    
    return JsonResponse({'data': data})
    
@login_required
def update_profile(request):
    if request.method == 'POST':
        print(request.POST,request.FILES.get('avatar_img'))
        if request.FILES.get('avatar_img'):
            avatar_img = request.FILES['avatar_img']
            valid,error = validate_image(avatar_img)
            if not valid:
                return JsonResponse({'error': error }, status=400)   
            image_url = update_profile_image(avatar_img, request)
            return JsonResponse({'image_url': image_url}, status=200)
        elif 'username' in request.POST.keys():
            username = request.POST['username']
            msg, status = update_username(username,request.user)
            return JsonResponse(msg ,status = status)         
        else :
            age  = update_profile_data(request)
            if age :
                return JsonResponse({'age': age}, status=200)
            
            return JsonResponse({}, status=200)
    return JsonResponse({'error': 'Invalid request'}, status=400)

@login_required
def delete_info(request,type,item_id):
    if request.method == 'DELETE':
        try:
            if type == 'remarks':
                info =  get_object_or_404(UserRemarks, id=item_id)
               
            else:
                info = get_object_or_404(MedicalHistory, id=item_id)
            info.delete()

            return JsonResponse({"message": "Info deleted successfully"}, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    
    return JsonResponse({"error": "Unsupported method"}, status=405)

@login_required
def add_info(request,info_type):
    if request.method == 'POST':
        print(request.POST,info_type)
        if info_type == 'remarks':
            item = request.POST.get('item').strip()
            remark = request.POST.get('remark').strip()
            if len(item) > 0 and len(remark) > 0: 
                UserRemarks.objects.create(
                    user=request.user,
                    item=item,
                    remark=remark
                )
        else:
            issue = request.POST.get('issue')
            print(issue)
            issue, created = MedicalIssue.objects.get_or_create(issue_name=issue)
            MedicalHistory.objects.create(
                user=request.user,
                issue=issue,
                relation=int(request.POST.get('relation')),
                degree=int(request.POST.get('degree'))
            )
        return JsonResponse({'success': True})
    else:
        return JsonResponse({'success': False, 'message': 'Invalid request method'})
     
@csrf_exempt
def viewer(request,type):
    if request.method =='POST':
        is_collection = request.POST.get('isCollection')
        size = request.POST.get('size')
        size = int(size)
        anchor = request.POST.get('anchor')
        anchor = int(anchor)
        filter = request.POST.getlist('filter')
        order = request.POST.get('order') or '-last_modification'

        if order.startswith('-'):
            field = order[1:]
            desc = True
        else:
            field = order
            desc = False
        print(is_collection == 'true',type,field)
        # get required elements
        if is_collection == 'true':
            collections = get_elements(is_collection,request,'collections')
            elements =[]
            if 'plans' in filter or len(filter) == 0:
                elements += get_elements(is_collection,request,'plans')
            if 'recipes' in filter or len(filter) == 0:
                elements += get_elements(is_collection,request,'recipes')
            if elements:
                elements = sorted(elements,key=lambda ele: ele.get(field),reverse=desc)
            elements = collections + elements
        else:
            elements = get_elements(is_collection,request,type)
        
        print('--------------',size)
       
        #for test
        # new_eles = []
        # for i in range(15):
        #     for j, ele in enumerate(elements):
        #             if ('type' in ele or 'category' in ele):
        #                 new_ele =  {key: value for key, value in ele.items()}
        #                 new_ele['id'] = i*3 +j
        #                 new_eles.append(new_ele)
        #             elif i == 0:
        #                 new_ele =  {key: value for key, value in ele.items()}
        #                 new_eles.append(new_ele)
        # elements =new_eles
        
      
        print(anchor,len(elements))
        # handel pageination
        next = False 
        prev = False
        if len(elements) > size :
            user_elements , next , prev = get_page(elements,anchor,size ,request.POST.get('type'),type) 
        else:
            user_elements = elements

        for ele in user_elements:
            if 'type' in ele or 'category' in ele:
                if ele['image_url']:
                    ele['image_url'] =  ele['image_url'][0]
                    print(ele['image_url'],'---------------------------------------')
                else: 
                    ele['image_url'] = '/static/images/logo.png'    
        
        types = []
        if is_collection == 'true':
            types += ['plans','recipes']
        if type == 'plans' or is_collection == 'true': 
            types += list(Plan.objects.values_list('plan_type', flat=True).distinct())
        if type == 'recipes' or is_collection == 'true':
            types += list(Recipe.objects.values_list('category', flat=True).distinct())
    
        # send data
        return JsonResponse({'success': True,'elements':user_elements,'next':next,'prev':prev,'types':types})
   
    # get filter categories
    if type == 'plans': 
        types = Plan.objects.values_list('plan_type', flat=True).distinct()
    else:
        types = Recipe.objects.values_list('category', flat=True).distinct()
    return render(request, "diet/viewer.html",{'types':types})

def edit_ele(request,type='',id=0):
    if request.method == 'POST':
        parent = request.POST.get('parent')
        title = request.POST.get('title').strip()
        type = request.POST.get('type')
        print(f'title    {title}')
        if parent and int(parent) != 0:
            parent = Collection.objects.get(id=parent)
        else:
            parent =None
        all_titles = list(Plan.objects.filter(user=request.user,title__regex=fr'^{title}(\s\d+)?$').values_list('title',flat = True))
        print(title,all_titles)
        if all_titles:
            count = 0
            new_title =title
            while new_title in all_titles:
                count+=1
                new_title = f'{title} {count}'
                print(new_title,all_titles)
            title=new_title
        print(title,all_titles)

        if type == 'plans':
            plan_type = request.POST.get('plan_category')
            duration = request.POST.get('duration')
            duration = int(duration) if duration else 0
            new_ele = Plan.objects.create(
                    user=request.user,
                    duration=timedelta(days=duration),
                    title=title,
                    plan_type=plan_type   
                )
            new_ele.save()
            populate_planDetails(plan_type,new_ele,duration)
            user_ele=UserPlan.objects.create(
                user=request.user,
                plan=new_ele
            )
            user_ele.save()
        else:
            category = request.POST.get('recipe_category')
            new_ele = Recipe.objects.create(
                    user=request.user,
                    title=title,
                    category=category   
                )
            new_ele.save()
            user_ele=UserRecipe.objects.create(
                user=request.user,
                recipe=new_ele
            )
            user_ele.save()
        if parent:
            user_ele.groups.add(parent)
        url = reverse('details', args=[type, new_ele.id, new_ele.title])
        return redirect(url)
    elif request.method == "PATCH":
        data = json.loads(request.body)
        if type=='plans':
            ele = Plan.objects.get(id=id)
        else:
            ele = Recipe.objects.get(id=id)
        key, value = list(data.items())[0]
        if key == 'title':
            if type == 'plans':
                dublicate = Plan.objects.filter(user=request.user,title=value).exclude(id=id)
            else:
                dublicate = Recipe.objects.filter(user=request.user,title=value).exclude(id=id)
            if dublicate.exists():
                return JsonResponse({'error': 'Invalid username'},status=400)
        elif key == 'duration'or key == 'prep_time':
            value= timedelta(minutes=int(value))
        setattr(ele, key, value)
        print(key,value)
        ele.save()
        return JsonResponse({"message": "Element updated successfully", "data": {key: value}})
    elif request.method == 'DELETE':
        if type == 'plans':
            ele = UserPlan.objects.get(id=id)
        else:
            ele = UserRecipe.objects.get(id=id)
        ele.delete()
        return JsonResponse({'success': True})

def edit_sec(request,id):
    if request.method == 'POST':
        data = json.loads(request.body)
        parent = data['parent_id']
        order = data['order']
        plan = Plan.objects.get(id=id)
        parent_sec = PlanDetail.objects.get(id=parent) if parent else None
        dublicate  = PlanDetail.objects.filter(plan=plan,parent_section=parent_sec,section__regex=r'^section( \d+)?$').order_by('section').values_list('section', flat=True)
        print('p_id',parent,parent_sec,'[]',dublicate,'plan',plan,'o',order)
        if dublicate.exists():
            parts = dublicate.last().split(' ')
            i = 1 + int(parts[1]) if len(parts) == 2 else 1
            title = f'section {i}'
        else:
            title ='section'
        pushed_Element = PlanDetail.objects.filter(parent_section=parent_sec,order__gte=order)
        pushed_Element.update(order=F('order') + 1)
        print(title)
        new_ele = PlanDetail.objects.create(
                    parent_section = parent_sec,
                    plan = plan,
                    section = title,
                    detail = '',
                    order = order 
                )
        new_ele.save()
        return JsonResponse({"success": True, "data": {'id':new_ele.id,'section':new_ele.section,'details':new_ele.detail,'order':order}}, status=201) 
        
    elif request.method == 'PATCH':
        data = json.loads(request.body)
        ele = PlanDetail.objects.get(id=id)
        key, value = list(data.items())[0]
        if key == 'parent_section':
            orders = data['orders']
            value = PlanDetail.objects.get(id=value) if int(value) != 0 else None
            data ={}
        else:
            data = {key: value}
        setattr(ele, key, value)
        print(key,value)
        ele.save()
        if key == 'parent_section':
            for order in orders:
                curr_ele = PlanDetail.objects.get(id=order['id'])
                curr_ele.order = order['order']
                print(curr_ele,order)
                curr_ele.save()
                print(curr_ele.section,curr_ele.order,curr_ele.id,order['id'])
    
        return JsonResponse({"message": "Element updated successfully", "data": data})
    elif request.method == 'DELETE':
        ele = PlanDetail.objects.get(id=id)     
        ele.delete()
        return JsonResponse({'success': True})

def edit_img_list(request,id):
    if request.method == 'POST':
        print(request.POST,request.FILES.get('img'))
        if request.FILES.get('img'):
            img = request.FILES['img']
            type = request.POST['type']
            #title = request.POST['title'].strip().replace(' ','_')
            img.name = img.name.replace(' ','_')
            exist = False
            valid,error = validate_image(img)
            if not valid:
                return JsonResponse({'error': error }, status=400)   
            
            upload_dir = os.path.join(settings.MEDIA_ROOT, f'{type}_images/{id}')
            if not os.path.exists(upload_dir):
                os.makedirs(upload_dir)
            image_url = os.path.join(upload_dir, img.name)
            print(image_url)
            with open(image_url, 'wb+') as destination:
                for chunk in img.chunks():
                    destination.write(chunk)
            if type == 'plans':
                ele = Plan.objects.get(id=id)
            else:
                ele = Recipe.objects.get(id=id)
            print(request.POST,ele.media)
            saved_url = f'{type}_images/{id}/{img.name}'
            if not saved_url in ele.media:
                ele.media.append(saved_url)
            else:
                print('already exist')
                exist = True
            ele.save()
            
            return JsonResponse({'image_url': saved_url,'exist':exist}, status=200)
    elif request.method == 'PATCH':
        data = json.loads(request.body)
        img_src = data.get('img_src')
        type = data.get('type')
        if type == 'plans':
            ele = Plan.objects.get(id=id)
        else:
            ele = Plan.objects.get(id=id)
        if 'delete' in data:
            image_path = os.path.join(settings.MEDIA_ROOT,img_src)
            print(image_path.replace('/','\\'),os.path.exists(image_path.replace('/','\\')))
            if os.path.exists(image_path.replace('/','\\')):
                os.remove(image_path.replace('/','\\'))
            if img_src in ele.media:
                ele.media.remove(img_src)
                ele.save()
        else:
            pattern =re.compile(r'^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|bmp|svg))$|^data:image\/(jpeg|png|gif|bmp|svg)\;base64,.+', re.IGNORECASE)

            if not img_src in ele.media and re.match(pattern, img_src) :
                ele.media.append(img_src)
                ele.save()
        print(ele.media)
        return JsonResponse({}, status=200)

def edit_linked_plans(request,id):
    if request.method == 'PATCH':
        data = json.loads(request.body)
        type = data.get('type')
        title = data.get('title')
        full_plan = LinkedPlan.objects.get(full_plan__id=id)
        new_plan = UserPlan.objects.get(user=request.user,plan__title=title)
        print(type,title,full_plan)
        if type == 'diet':
            full_plan.diet_plan = new_plan.plan
        else:
            full_plan.exercies_plan = new_plan.plan
        full_plan.save()
        details = get_linked_plans(id)
        print(details)
        return JsonResponse({'details': details}, status=200)




@csrf_exempt
def details(request,type, id , title):
    if type == 'plans':
        ele = Plan.objects.get(id=id)
        ele.user_ele_id =UserPlan.objects.get(user=request.user, plan__id=id).id
        ele.details = get_full_details(id)
        ele.groups = list(UserPlan.objects.filter(user=request.user, plan__id=id,groups__isnull=False)
                   .values_list('groups__title','groups__id'))
        data = {
           'user':ele.user.username,
           'user_id':ele.user.id,
           'id':ele.id,
           'title':ele.title,
           'plan_type':ele.plan_type,
           'goal':ele.goal,
           'duration' :ele.duration,
           'media':ele.media,
           'creation_date' :ele.creation_date,
           'last_modification' :ele.last_modification
         }
    else:
        ele = Recipe.objects.get(id=id)
        ele.user_ele_id =UserRecipe.objects.get(user=request.user, recipe__id=id).id
        ele.prep_time=str(ele.prep_time)
        ele.groups = list(UserRecipe.objects.filter(user=request.user, recipe__id=id,groups__isnull=False)
                   .values_list('groups__title','groups__id'))
        ele.details =[{'details':ele.ingredients,'section':"Ingredients",'sub_sections':[]},
                      {'details':markup_to_HTML(ele.directions),'section':"Directions",'sub_sections':[]}]
        data , ingredients = get_nurtient_data()
        if not ele.total_nurtients or ele.total_nurtients == '[]':
            Recipe.objects.filter(id=id).update(total_nurtients=format_nutrition(data),
                    ingredients_nurtients = format_ingredient_nutrition(ingredients))
        print(ele)
        data = {
           'user':ele.user.username,
           'user_id':ele.user.id,
           'id':ele.id,
           'title':ele.title,
           'media':ele.media,
           'category':ele.category,
           'serv':ele.serv,
           'prepTime':ele.prep_time,
           'creation_date' :ele.creation_date,
           'last_modification' :ele.last_modification,
           'total_nurtients': simplify_nutrition(ele.total_nurtients),
           'ingredients_nurtients':ele.ingredients_nurtients
        }
    print(ele,ele.user_ele_id)
    all_groups = Collection.objects.filter(user=request.user).values_list('title','id')
    if type == 'plans' and ele.plan_type == 'full':
       ele.details = get_linked_plans(id)
    if request.method == 'POST':
        return JsonResponse({'success': True,'type':type,'details':ele.details,'data':data,'media':ele.media})
    return render(request, "diet/details.html",{'type':type,'ele':ele,'all_groups':all_groups})

def collections(request,id):
    if request.method == 'POST':
        data = json.loads(request.body)
        ele_type = data['eleType']
        ele_id= data['eleId']
        collection_id = data['collectionId']
        collection = None if int(collection_id) == 0 else Collection.objects.get(id=collection_id)
        data = []
        print(ele_type,ele_id,collection_id,collection)
        if 'back' in ele_type:
                collection = collection.parent
        if 'collection' in ele_type:
            ele = Collection.objects.get(id=ele_id)
            ele.parent = collection
            ele.save()
        else:
            if 'plan' in ele_type :
                ele = UserPlan.objects.get(id=ele_id)
            else:
                ele = UserRecipe.objects.get(id=ele_id)
            if collection:
                ele.groups.add(collection)
            
            current_collection = '' if int(id) == 0 else Collection.objects.get(id=id)
            if current_collection:
                ele.groups.remove(current_collection)
        if collection:
            data = [collection.title,collection.id]
    return JsonResponse({'success': True,'collection':data})

def update_collections(request,action,id):
    if request.method == 'POST':
        if request.body:
            data = json.loads(request.body)
        if action == 'new':
            collection = create_collection(request.user, id)
            return JsonResponse({'success': True,'collection':collection})
        elif action == 'rename':
            title = data['title']
            existing_collections = Collection.objects.filter(user=request.user).exclude(id=id).values_list('title',flat=True)
            if title.strip() in existing_collections:
                return JsonResponse({'error': 'the name already exist' }, status=400)
            else:
                collection =Collection.objects.get(id=id)
                collection.title =title
                collection.save()   
                return JsonResponse({'success': True})
        else:
            description=data['description']
            collection =Collection.objects.get(id=id)
            collection.description =description
            collection.save() 
            return JsonResponse({'success': True})

    elif request.method == 'DELETE':
        collection = Collection.objects.get(id=id)
        collection.delete()
        return JsonResponse({'success': True})

@csrf_exempt
def logs(request):
    if request.method =='POST':
        data = json.loads(request.body)
        current_year = data['year']
        current_month = data['month']
        first_day = datetime(current_year, current_month, 1)
        empty = (first_day.weekday() + 2) % 7
        logs = UserLog.objects.filter(
            user=request.user,
            date__year=current_year,
            date__month=current_month
        ).order_by('date','plan__plan_type')
        formated_logs = format_logs(logs)
        return JsonResponse({
            'success': True,
            'logs':formated_logs,
            'empty':empty,
            'days':calendar.monthrange(current_year, current_month)[1]+empty
            })

    """else:
        
        Monthely / weekly /plan duration summery
          -avg score of month
          - all days score 
          - progress to the goal 
          - advice from the ai 
          - before and after values
        day summery
        - feedback
        - score
        - goal prgress values
        - total deviation

        """
    return render(request, "diet/log.html")

def summery(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        period = data['period']
        value = data['value']
        today = date.today()
        year = today.year
        month = today.month-1
        if period == 'month':
            score = UserLog.objects.filter(user=request.user,date__month=month, date__year=year).aggregate(Avg('score'))['score__avg']
            values = UserLog.objects.filter(user=request.user,date__month=month, date__year=year).values_list('date','score')
            """           
                values = UserLog.objects.filter(user=request.user, date__month=month, date__year=year).annotate(day=TruncDate('date')).values('day').annotate(
                            avg_score=Avg('score'), 
                            max_goal=Max('score')  
                ).values_list('day', 'avg_score', 'max_goal') 
            """
        return JsonResponse({
            'success': True,
            'period':period,
            'score':score ,
            'values':list(values),
            })
    

def current_plan(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        plan_id = data.get('plan_id')
        replace = data.get('replace')
        print(plan_id,replace)
        curr_plan = Plan.objects.get(id=int(plan_id))
        today = date.today()
        UserLog.set_plan(request.user, curr_plan, today, True, replace)
        plan = curr_plan.__dict__

        if plan['plan_type'] == 'full':
            linked_plan = LinkedPlan.objects.get(full_plan=curr_plan)
            plan['diet'] = linked_plan.diet_plan.title if linked_plan.diet_plan else None
            plan['diet_img'] = get_image_url('plans', linked_plan.diet_plan.id, linked_plan.diet_plan.title)
            plan['exercise'] = linked_plan.exercies_plan.title if linked_plan.exercies_plan else None
            plan['exercise_img'] = get_image_url('plans', linked_plan.exercies_plan.id, linked_plan.exercies_plan.title)
        
        plan['img'] = get_image_url('plans', plan['id'], plan['title'])
        
        del plan['_state']
        return JsonResponse({'success': True,'plan':plan},status = 200)

def test(request):
    ele = Plan.objects.get(id=2)
    ele.groups = list(UserPlan.objects.filter(user=request.user, plan__id=1,groups__isnull=False)
                   .values_list('groups__title','groups__id'))
    all_groups = Collection.objects.filter(user=request.user).values_list('title','id')
    exercies = UserPlan.objects.filter(user=request.user,plan__plan_type='exercies').values_list('plan__title',flat=True)
    diets = UserPlan.objects.filter(user=request.user,plan__plan_type='diet').values_list('plan__title',flat=True)
    print(diets,exercies)
    return  render(request, "diet/test.html",{'type':'plans','ele':ele,'all_groups':all_groups,'diets':diets,'exercies':exercies})#'nurtiont':nurtiont
    # ele = Recipe.objects.get(id=1)
    # ele.groups = list(UserRecipe.objects.filter(user=request.user, recipe__id=1,groups__isnull=False)
    #                .values_list('groups__title','groups__id'))
    # all_groups = Collection.objects.filter(user=request.user).values_list('title','id')
    # return  render(request, "diet/test.html",{'type':'recipes','ele':ele,'all_groups':all_groups})

import requests

def get_nurtient_data():
   # Replace these with your Edamam API credentials
    APP_ID = '0a1b3c0a'
    APP_KEY = 'c19c791b755f912ea91866a14cb48ef2	'

    # Endpoint URL
    url = f'https://api.edamam.com/api/nutrition-details?app_id={APP_ID}&app_key={APP_KEY}'

    # Example data (a list of ingredients)
    data = {
        "title": "Hot chocolete",
        "ingr": [
            "1 1⁄2 cups unsweetened cocoa powder",
            "3 cups instant powdered milk",
            "2 cups powdered sugar",
            "1⁄4 tsp salt",
            " 1 1⁄2 cups white or dark chocolate chips",
            ".5 liters (2 cups) water"
        ]
    }

    # Send the POST request
    response = requests.post(url, json=data)

    # Check the response
    if response.status_code == 200:
        nutrition_data = response.json()
        total_nutrients = nutrition_data.get("totalNutrients", {})
        ingredients = nutrition_data.get("ingredients", {})

        print(total_nutrients,'---------------------------------------------\n',ingredients)
        return total_nutrients,ingredients
    else:
        print(f"Error: {response.status_code}, {response.text}")


def format_nutrition(nutrition_dict):
    formatted_data = {}
    for key, value in nutrition_dict.items():
        label = value.get('label', '')
        quantity = value.get('quantity', 0)
        unit = value.get('unit', '')
        formatted_data[label] = f"{float(quantity):.2f} {unit}"
    return formatted_data


def simplify_nutrition(nutrition_data):
    # Mapping original labels to simpler ones
    label_map = {
        'Energy': 'Calories',
        'Total lipid (fat)': 'Fats',
        'Carbohydrate, by difference': 'Carbs',
        'Fiber, total dietary': 'Fiber',
        'Sugars, total including NLEA': 'Sugars',
        'Protein': 'Protein',
        'Cholesterol': 'Cholesterol',
        'Sodium, Na': 'Sodium',
        'Calcium, Ca': 'Calcium',
        'Magnesium, Mg': 'Magnesium',
        'Potassium, K': 'Potassium',
        'Iron, Fe': 'Iron'
    }

    # List of keys to keep
    keys_to_keep = set(label_map.keys())
    
    # Filter and rename the nutrition data
    simplified_data = {
        label_map[key]: value
        for key, value in nutrition_data.items()
        if key in keys_to_keep
    }
    
    return simplified_data

def format_ingredient_nutrition(ingredients_data):
    ingredient_list = []
    
    for ingredient in ingredients_data:
        name = ingredient['parsed'][0]['foodMatch']
        nutrients = ingredient['parsed'][0]['nutrients']

        print('---------------------------------------------\n',ingredient)
        ingredient_list.append({
            name: {
                'unit':ingredient['parsed'][0]['measure'],
                'amount':ingredient['parsed'][0]['quantity'],
                'nutrients':format_nutrition(nutrients)
            }
        })
    
    return ingredient_list