from collections import defaultdict

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
                "detail": detail.detail,
                "order": detail.order,
                "subSections": []
            }]
        for detail in section_map.get(parent_id, []):
            sections.append({
                "id":detail.id,
                "section": detail.section,
                "detail": detail.detail,
                "order": detail.order,
                "subSections": build(detail.id)
            })
            print(sections, "<=====")
        return sections

    return build(None)