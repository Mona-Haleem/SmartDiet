from collections import defaultdict
from django.db.models import F

def format_plan_details(details):
    """Format hierarchical plan details from flat queryset"""
    # Build lookup table: parent_id -> list of children
    section_map = defaultdict(list)
    for detail in details:
        section_map[detail.parent_section_id].append(detail)

    # Sort children by 'order' (ensures display order consistency)
    for children in section_map.values():
        children.sort(key=lambda x: x.order)

    # Recursive builder using in-memory data
    def build(parent_id=None):
        sections = []
        if len(details) == 1 :
            detail = details[0] 
            return [{
                "id":detail.id,
                "section": detail.section,
                "detail": remove_Orphaned_refs(detail.detail),
                "order": detail.order,
                "subSections": []
            }]
        for detail in section_map.get(parent_id, []):
            sections.append({
                "id":detail.id,
                "section": detail.section,
                "detail": remove_Orphaned_refs(detail.detail),
                "order": detail.order,
                "subSections": build(detail.id)
            })
            print(sections, "<=====")
        return sections

    return build(None)

def remove_Orphaned_refs(detailsList):
    from healthHub.models import Recipe,PlanDetail
    if len(detailsList) == 0:
        return detailsList
    cleanedDetails = []
    for d in detailsList:
        print(d)
        if d["type"] == "ref":
            ele = None
            if d["refType"] == "recipe":
                ele = Recipe.objects.filter(id=d["eleId"]).first()
            elif d["refType"] == "detail":
                ele = PlanDetail.objects.filter(id=d["eleId"]).first()
            if not d["href"] or (d["refType"] != "link" and not ele):
                    d = {
                        "type":"p",
                        "content":d["content"],
                        "color":d["color"],
                        "effect":d["effects"]
                    }
        cleanedDetails.append(d)
    return cleanedDetails

def getLinksData(request,ele):
    from healthHub.models import Recipe,PlanDetail
    qs = (
        Recipe.objects
        .filter(base__creator=request.user)
        .values(
            'base__category',
            'id',
            name=F('base__name'),
        )
    )

    recipeRefs = defaultdict(list)
    for r in qs:
        recipeRefs[r['base__category']].append({
            'id': r['id'],
            'name': r['name'],
        })
    categoryFilter={}
    if ele.base.type == 'plan':
        categoryFilter = {"plan__base__category":ele.base.category}    
    
    qs = (
        PlanDetail.objects
        .filter(plan__base__creator=request.user, **categoryFilter)
        .values(
            'plan__id',
            'plan__base__name',
            'id',
            'section',
        )
    )

    detailRefs = defaultdict(lambda: {
        'plan_id': None,
        'plan_name': None,
        'details': []
    })

    for row in qs:
        plan_id = row['plan__id']
        detailRefs[plan_id]['plan_id'] = plan_id
        detailRefs[plan_id]['plan_name'] = row['plan__base__name']
        detailRefs[plan_id]['details'].append({
            'id': row['id'],
            'section': row['section'],
        })

    detailRefs = list(detailRefs.values())
    return { "recipe":dict(recipeRefs.items()), "detail":detailRefs }


