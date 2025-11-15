import math 

def paginator(data , pageSize , page):
    if not isinstance(page, int) or not isinstance(pageSize, int):
        raise TypeError("Page and pageSize must be integers")
    if pageSize <= 0:
        raise ValueError("Page size must be greater than zero")
    if page < 1:
        raise ValueError("Invalid Page number")

    total_items = len(data)
    total_pages = math.ceil(total_items / pageSize) if total_items > 0 else 0

    start = (page - 1) * pageSize
    end = start + pageSize

    if page > total_pages and total_pages > 0:
        raise ValueError("Invalid Page number")
    else:
        items = data[start:end]

    has_next = page < total_pages
    has_prev = page > 1

    return {
        "items": items,
        "page": page,
        #"pageSize": pageSize,
        #"total_items": total_items,
        #"total_pages": total_pages,
        "next": has_next,
        "prev": has_prev
    }
