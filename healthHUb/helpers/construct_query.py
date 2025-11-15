def construct_query(request,mode):
    filters = {}
    order = '-edited'
    filter_map = {'q':'name__icontains','categories':'category__in','type':'type'}
    for key, value in request.GET.items():
        print(f"{key}: {value}")
        if key in filter_map.keys():
            filters[filter_map[key]] = value.split(',') if key == 'categories' else value 
        elif key == 'order':
            order = value
    if mode == 'user':
        filters['creator']=request.user
    else:
        filters['shared']=True
    return filters , order