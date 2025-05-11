#from django import forms
from datetime import date, timedelta#, datetime
from diet.models import *
from decimal import Decimal
import os
from django.conf import settings
from django.utils.dateparse import parse_date
from django.db.models import F #,ExpressionWrapper, IntegerField,Avg, DurationField
from django.forms.models import model_to_dict
import re
import calendar
"""" profile data processing """
def validate_image(img):
    valid_img_types = ['image/jpeg', 'image/png', 'image/gif']
    error =''
    if img.content_type not in valid_img_types:
        error = 'Unsupported file type.'
        return False , 
    # Validate file size 
    max_size = 5 * 1024**2
    if img.size > max_size:
        error ='File size exceeds 5MB limit.'
   
    if error:
        return False , error
    else:
        return True,None         

def update_profile_image(img,request):
    print(f"Received file: {img.name}, size: {img.size}")
    _ , ext =  img.name.split('.')
       
    img_name = f'{request.user.username}_avatar.{ext}'
            
    # Delete old image if it exists
    if request.user.image_exists():
        img_path = os.path.join(settings.MEDIA_ROOT,'profile_images',img_name)
        print('PATH' , img_path)
        os.remove(img_path)
    request.user.avatar_img.save(img_name, img)
    return request.user.avatar_img.url          

def update_username(username,user):
    exist = User.objects.filter(username=username).exclude(id=user.id)
    if exist:
        return {'error': 'Invalid username'},400
    else:
        user.username = username
        user.save()
        return {'username': username},200

def update_profile_data(request):
    for key, value in request.POST.items():
        if hasattr(request.user, key):
           field = getattr(request.user, key)
        print(key,value,not isinstance(field, str))
        if isinstance(field, date):
            setattr(request.user, key, parse_date(value))
            request.user.save()
            return request.user.age()
        elif not isinstance(field, str):
            value = Decimal(value)
            if value > 0 :
                setattr(request.user, key, value)
        else:
            setattr(request.user, key, value)
    request.user.save()

"""
    viewer data retrival
"""
def get_user_planes(user,filters,order):
    return UserPlan.objects.filter(user=user).filter(**filters).select_related('plan', 'plan__user').annotate(
                element_id=F('plan__id'),
                title=F('plan__title'),
                creation_date=F('plan__creation_date'),
                last_modification=F('plan__last_modification'),
                type=F('plan__plan_type'), 
                duration=F('plan__duration'),
                goal=F('plan__goal'),
                creator=F('plan__user__username'),
                image_url=F('plan__media')    
            ).values(
                'id','favourite', 
                'element_id','title','creation_date','last_modification',
                'type','duration','goal',
                'creator','image_url'
            ).order_by(order)

def get_user_recipes(user,filters,order):
    return  UserRecipe.objects.filter(user=user).filter(**filters).select_related('Recipe', 'Recipe__user').annotate(
                element_id=F('recipe__id'),
                title=F('recipe__title'),
                creation_date=F('recipe__creation_date'),
                last_modification=F('recipe__last_modification'),
                category=F('recipe__category'), 
                creator=F('recipe__user__username') ,
                image_url=F('recipe__media')    
            ).values(
                'id','favourite', 
                'element_id','title','creation_date','last_modification','image_url',
                'category',
                'creator',
            ).order_by(order)

def get_user_collections(user,filters,order):
    collections = Collection.objects.filter(user=user).filter(**filters).order_by(order).values()
    print(collections)
    return collections


def set_filters(request,type,is_collection):
    filters = {}
    filter = request.POST.getlist('filter')
    order = request.POST.get('order')
    search = request.POST.get('search')
    group_id = request.POST.get('group_id')
    print('-----------------------',filter,order,search,group_id)
   # if group_id and group_id != '':

    if search:
        key ='' if type =='collection' else f'{type}__' 
        filters[f'{key}title__icontains'] = search  
    if type != 'collection' and len(filter) > 0:
        if is_collection:
            if type == 'plan':
                filter = [item for item in filter if item in ['diet', 'full', 'exercies']] 
            else:
                filter = [item for item in filter if item not in ['diet', 'full', 'exercies','plans','recipes']] 
        key = 'plan__plan_type' if type == 'plan' else 'recipe__category' 
        if filter:
            filters[f'{key}__in'] = filter
        #else :
         #   filters[f'{key}__isnull'] = True
    if is_collection == 'true' and group_id != 'null' and group_id != '':
        key = 'parent' if type =='collection' else f'groups'
        if int(group_id) == 0 :
            filters[f'{key}__isnull'] = True
        else:
            filters[key] = Collection.objects.get(id=group_id)
    if not order:
        order = '-creation_date' if type =='collection' else '-last_modification'
    elif type =='collection' and order not in ['title','-creation_date','creation_date']:
        order =  '-creation_date'
    return filters , order

def get_elements(is_collection,request,type):
    # retrive filters
    filters , order =  set_filters(request, type[0:len(type)-1],is_collection)
    print('-------------used',filters,order)
    if type == 'collections':
        elements = list(get_user_collections(request.user,filters,order))
    elif type == 'plans':
        elements =list(get_user_planes(request.user,filters,order))
    else:
        elements = list(get_user_recipes(request.user,filters,order))

    return elements

def get_page(elements,anchor,size,type,ele_typ):
    print(anchor,size,type,ele_typ)
    start = 0
    try:
        index = 0
        for i,ele in enumerate(elements):
            if ele['id'] == int(anchor):
                print(ele)
                index = i
                if (ele_typ == 'plans' and 'type' in ele) or (ele_typ == 'recipes' and 'category' in ele) or (ele_typ == 'collection' and 'parent_id' in ele ):
                    break 
    except ValueError:
        index = None
    print(anchor,index)
    if type == 'relode':
        start=index
    elif type == 'prev':
        start = max(index - size,0)
        prev_ele = (start != 0)
    elif anchor != 0:
        start = index + 1
    end = min(len(elements),start+size)
    next_ele = (end != len(elements))
    prev_ele = (start != 0)
    user_plans = elements[start:end]
    return user_plans , next_ele , prev_ele


"""
    collection processing functions
"""

def create_collection(user, parent_id):
    if not parent_id or int(parent_id) == 0:
        parent = None
    else:
        parent = Collection.objects.get(id=parent_id)
    count = 0
    while True:
        try:
            new_collection = Collection.objects.create(
                user=user,
                parent=parent,
                description='',
                title=f'Untitled {count}' if count > 0 else 'Untitled' 
            )
            new_collection.save() 
            collection = model_to_dict(new_collection)
            collection['creation_date'] = new_collection.creation_date
            return collection  
        except:
            count +=1

"""
    plans processing functions
"""
def get_linked_plans(id):
    details = []
    linked_plans = list(
            LinkedPlan.objects.filter(full_plan__id=id)
            .select_related('diet_plan', 'exercies_plan', 'diet_plan__user', 'exercies_plan__user')
           )
    if linked_plans:
        linked_plans = linked_plans[0]
    else:
        return
    diet = linked_plans.diet_plan
    exercies =linked_plans.exercies_plan
    if diet:
        diet_dict = diet.__dict__
        diet_dict["user"] = diet.user.username
        del diet_dict['_state']

        details.append(
            {'section':'diet_plan',
            'details':diet_dict,
            'sub_sections':get_full_details(diet.id)
            })
    
    if exercies:
        exercies_dict = exercies.__dict__
        exercies_dict["user"] = exercies.user.username
        del exercies_dict['_state']

        details.append(
            {'section':'exercies_plan',
                'details':exercies_dict,
                'sub_sections':get_full_details(exercies.id)
                })        
    return details

def get_full_details(plan_id,parent=None):
    plan_details = PlanDetail.objects.filter(plan__id=plan_id,parent_section=parent).order_by('order')
    result = []
    if len(list(plan_details)) > 0:
        for ele in plan_details:
            result.append({
                'id':ele.id,
                'section':ele.section,
                'details':markup_to_HTML(ele.detail),
                'order':ele.order,
                'sub_sections':get_full_details(plan_id,ele)
            })
            
    return result

def populate_planDetails(plan_type,plan,duration):
    if plan_type!='full':
        summery_details = PlanDetail.objects.create(
            plan=plan,
            section='Day 1' if duration == 1 else 'Weekly Schedule' if duration == 7 else 'Schedule'
        )
        summery_details.save()
    if duration > 1 and plan_type!='full' :
        for i in range(duration):
            detail = PlanDetail.objects.create(
                    parent_section = summery_details,
                    plan=plan,
                    section=f'Day {i}'
                )
            detail.save()
    elif duration == 1 and plan_type == 'diet':
        detail_list = ['breakfast','launch','dinner','snack']
        for ele in detail_list:
            detail = PlanDetail.objects.create(
                    parent_section = summery_details,
                    plan=plan,
                    section=ele
                )
            detail.save()

"""
    logs and current plan related functions
"""
def format_logs(logs):
    formated_logs = {}
    for log in logs:
        date = log.date.strftime('%d-%m-%Y')
        if not date in formated_logs:
            formated_logs[date] = [None,None]
        formated = {
                'id' :log.id,
                'title':log.plan.title,
                'type':log.plan.plan_type,
                'score':log.score,
                'feedback':log.feedback
                }
        if log.plan.plan_type == 'diet':
            formated_logs[date][0] = formated
        elif log.plan.plan_type == 'exercies':
            formated_logs[date][1] = formated
        else:
            linked = LinkedPlan.objects.filter(full_plan__id=log.plan.id).values('diet_plan__title', 'exercies_plan__title')[0]
            formated_logs[date] = formated
            formated_logs[date]['diet'] = linked['diet_plan__title']
            formated_logs[date]['exercies']=linked['exercies_plan__title']
    return formated_logs

def get_current_plans(user):
    today_plan = UserLog.get_current_plan(user,'diet') 
    prefix = ''
    if today_plan and today_plan.plan_type == 'full':
        prefix = today_plan.title +' - '
        diet_plan,exercies_plan =None,None
        today_plan.details =[]
        today_plan.images =[]
        get_linked_plans(today_plan.id,today_plan)
        for sec in today_plan.details:
            if sec.get('section') == 'diet_plan':
                diet_plan = sec.get('details')
            if sec.get('section') == 'exercies_plan': 
                exercies_plan = sec.get('details')
    else:
        diet_plan = today_plan
        exercies_plan = UserLog.get_current_plan(user,'exercies')
    diet_plan.image = get_image_url('plans',diet_plan.id, diet_plan.title)    
    exercies_plan.image = get_image_url('plans',exercies_plan.id, exercies_plan.title)   
    return diet_plan ,exercies_plan,prefix

def get_today_tasks(plan,user,task_list='weekly schedule'):
   day = get_plan_day(plan,user)
   details = PlanDetail.objects.filter(plan=plan)
   today_tasks = {}
   for detail in details:
       if detail.section.lower() == task_list:
           today_tasks = detail.__dict__
           today_tasks['sub_sections'] = get_full_details(plan.id,detail)
           
   print(today_tasks)            

def get_plan_day(plan,user):
    last_date = date.today()
    logs = UserLog.objects.filter(user=user,plan=plan,date__lt=last_date).order_by('-date')
    day = 1
    for log in logs:
        if last_date - log.date == timedelta(days=1):
            day+=1
            last_date -=timedelta(days=1)
        else:
            break
    day = plan.duration.days if day%plan.duration.days == 0 else day%plan.duration.days
    print(day)
    return day

"""extra function may delete """
def get_image_url(type, element_id, title,all=False):
    base_image = os.path.join(settings.STATIC_URL, 'images/logo.png') 
    folder_path = os.path.join(settings.MEDIA_ROOT, f'{type}_images/{element_id}_{title}')
    print(folder_path)
    if not os.path.exists(folder_path):
        return [base_image] if all else base_image
  
    image_files = [f for f in os.listdir(folder_path) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]
    if image_files:
            image_urls = [os.path.join(settings.MEDIA_URL , f'{type}_images/{element_id}_{title}/{image_file}') for image_file in image_files]
            return image_urls if all else image_urls[0]
    
    return [base_image] if all else base_image

def markup_to_HTML(content):
    if not content:
        return ''
    html_output = ''
    lines = content.split('\n')
    in_list = False
    in_order_list =False
    for line in lines:
        if len(line.strip()) > 0:
            # convert headings
            match = re.search(r'^(#{1,6})\s*(.*)', line)
            if match:
                level = len(match.group(1))
                text = match.group(2)
                line = f'<h{level}>{text}</h{level}>'
            # convert Bold
            line = re.sub(r"\*\*(.*?)\*\*", r'<b>\1</b>', line)
            # convert unordereded lists
            match = re.search(r'^[\-\*\+]\s+(.*)', line)
            if match :
                text = match.group(1)
                if not in_list:
                    in_list = True
                    line = '<ul>' + '<li>'+ text + '</li>'
                else:
                    line = '<li>'+ text + '</li>'
            elif in_list:
                in_list = False
                line = '</ul>' + line 
             # convert unordereded lists
            match = re.search(r'^\d*\.\s+(.*)', line)
            if match :
                text = match.group(1)
                if not in_order_list:
                    in_order_list = True
                    line = '<ol>' + '<li>'+ text + '</li>'
                else:
                    line = '<li>'+ text + '</li>'
            elif in_order_list:
                in_order_list = False
                line = '</ol>' + line 
            # convert links
            line = re.sub(r"\[(.*?)\]\((.*?)\)", r'<a href="\2">\1</a>', line)
            # convert paragraphs
            if not re.search(r'^<.+>.*', line):
                line = '<p>' + line + '</p>'
            html_output+=line
    return html_output