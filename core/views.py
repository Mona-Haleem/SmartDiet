from django.shortcuts import render
from django.http import HttpResponse
from django.template import loader
from rest_framework.response import Response
from rest_framework.decorators import api_view

# Create your views here.
def index(request):
    return render(request, 'index.html')

@api_view(['GET'])
def test(request):
    return Response({
        "test":'rest0',
        "sucesses":True
    })
