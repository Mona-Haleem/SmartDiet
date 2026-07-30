from django.db.models import Q

def construct_query(request,mode):
    filters = {}
    exclude = {}
    order = '-edited'
    filter_map = {'q':'name__icontains','categories':'category__in','type':'type'}
    for key, value in request.GET.items():
        print(f"{key}: {value}")
        if key in filter_map.keys() and value:
            filters[filter_map[key]] = value.split(',') if key == 'categories' else value 
        elif key == 'order' and value:
            order = value
        elif key in ["favorite","shared"]:
            filters[key] = bool(value) 
    if mode == 'user':
        filters['creator']=request.user
    else:
        filters['shared']=True
        exclude['creator']=request.user
    return filters , order ,exclude