from django import template
from django.utils.safestring import mark_safe

register = template.Library()

class RecurseTreeNode(template.Node):
    def __init__(self, var_name, nodelist):
        self.var_name = var_name
        self.nodelist = nodelist

    def render(self, context):
        data = template.Variable(self.var_name).resolve(context)
        return self.render_nodes(data, context)

    def render_nodes(self, nodes, context):
        output = ''
        for node in nodes:
            context.push()
            context['node'] = node
            # Render children recursively
            if node.get('subSections'):
                context['children'] = self.render_nodes(node['subSections'], context)
            else:
                context['children'] = ''
            output += self.nodelist.render(context)
            context.pop()
        return mark_safe(output)  

@register.tag
def recursetree(parser, token):
    try:
        tag_name, var_name = token.split_contents()
    except ValueError:
        raise template.TemplateSyntaxError("'%s' tag requires a single argument" % token.contents.split()[0])
    
    nodelist = parser.parse(('endrecursetree',))
    parser.delete_first_token()
    return RecurseTreeNode(var_name, nodelist)
