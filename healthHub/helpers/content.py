"""Validate the structured content accepted by recipe and section editors."""
import re
from urllib.parse import urlsplit


def validate_details(details):
    if not isinstance(details, list):
        raise ValueError('Details must be a list')
    def visit(block):
        if not isinstance(block, dict) or block.get('type', 'p') not in ('p', 'ref', 'ul', 'ol', 'div'):
            raise ValueError('Invalid content block')
        if block.get('type') == 'ref':
            href = block.get('href', '')
            if not isinstance(href, str):
                raise ValueError('Invalid reference URL')
            normalized = re.sub(r'[\x00-\x20]', '', href)
            if urlsplit(normalized).scheme.lower() not in ('', 'http', 'https', 'mailto') or normalized.startswith(('//', '\\')):
                raise ValueError('Unsafe reference URL')
        color = block.get('color', '')
        if color and (not isinstance(color, str) or re.search(r'[;{}"\'<>]', color)):
            raise ValueError('Invalid text color')
        content = block.get('content', '')
        if isinstance(content, list):
            for child in content:
                visit(child)
        elif not isinstance(content, str):
            raise ValueError('Content must be text or structured blocks')
    for detail in details:
        visit(detail)
    return details
