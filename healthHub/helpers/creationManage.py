from django.views import View
from django.http import JsonResponse, Http404
from django.shortcuts import render
from django.urls import reverse
from healthHub.forms import BaseCreationForm, RecipeForm, PlanForm
from healthHub.models.base import UserCreation, ElementType
from healthHub.models.recipe import Recipe
from healthHub.models.plan import Plan, PlanDetail, LinkedPlan, PlanType
from django.db import transaction
from datetime import timedelta
import json


class CreationHelper:
    """Helper class for creating UserCreation instances (Recipe/Plan)"""
    
    @staticmethod
    def create_element(request,type):
        """
        Main creation logic - validates and creates Recipe or Plan
        Returns: tuple (success: bool, data: dict, status_code: int)
        """
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return False, {'errors': {'__all__': ['Invalid JSON']}}, 400

        print("data loaded")

        if type not in [ElementType.RECIPE, ElementType.PLAN]:
            return False, {'errors': {'type': ['Invalid type']}}, 400

        try: 
            # Initialize forms with JSON data
            base_form = BaseCreationForm(data, user=request.user)
            specific_form = (
                RecipeForm(data)
                if type == ElementType.RECIPE
                else PlanForm(data)
            )
        except json.JSONDecodeError:
            print("forms error")    
            return False, {'errors': {'__all__': ['Invalid form']}}, 400

        print("forms based")
        # Validate both forms
        if not (base_form.is_valid() and specific_form.is_valid()):
            print("form errored")
            errors = {
                **base_form.errors,
                **specific_form.errors,
            }
            print("form errored",errors)
            print("forms failed")    
           
            return False, {'errors': errors}, 400


        try:
            # Merge validated data only
            creation_data = {
                **base_form.cleaned_data,
                **specific_form.cleaned_data,
                "media":[]
            }
            

            user_creation = UserCreation.objects.create(
                creator=request.user,
                **creation_data,
            )
            print(type)
            if type == 'recipe':
                redirect_url = reverse(
                    'recipes',
                    kwargs={'id': user_creation.recipe.id, 'name': user_creation.name}
                )
            else:
                redirect_url = reverse(
                    'plans',
                    kwargs={'id': user_creation.plan.id, 'name': user_creation.name}
                )

            return True, {
                'success': True,
                'redirect': redirect_url,
                'id':user_creation.get_concrete().id,
                'name':user_creation.name,
                'category' :user_creation.category,
                'message': f'{type.capitalize()} created successfully!',
            }, 200


        except Exception as e:
            print("creation failed")
        return False, {'errors': {'__all__': [str(e)]}}, 500

    def create_Clone(request,type,ele):
        
        with transaction.atomic():
            ele_data = CreationHelper.clone_fields(
                ele,
                exclude=("creator", "created", "edited","plan","recipe")
            )
            original_name = ele_data['name']
            counter = 1
            while UserCreation.objects.filter(creator=request.user, name=ele_data['name'], type=ele_data['type']).exists():
                ele_data['name'] = f"{original_name} ({counter})"
                counter += 1

            creation_data = CreationHelper.clone_fields(ele.get_concrete(), exclude=("id", "base"))
            ele_data.update(creation_data)

            if ele.type == "plan" and ele.category == PlanType.FULL:
                try:
                    linked = ele.plan.linked_plan
                    ele_data["diet_plan_id"] = linked.diet_plan_id
                    ele_data["exercise_plan_id"] = linked.exercise_plan_id
                except Exception:  # no linked plan
                    ele_data["diet_plan_id"] = None
                    ele_data["exercise_plan_id"] = None

            new_ele = UserCreation.objects.create(
                creator=request.user,
                **ele_data
            )
            if type == 'plan':
                # Clone PlanDetails only
                old_plan = ele.plan
                new_plan = new_ele.plan
                CreationHelper.clone_plan_details(old_plan, new_plan)
        redirect_url = reverse(
                    f'{type}s',
                    kwargs={'id': new_ele.get_concrete().id, 'name': new_ele.name}
                )
        return True, {
                'success': True,
                'redirect': redirect_url,
                'message': f'{type.capitalize()} created successfully!',
            }, 200
               
        

    def clone_fields(instance, exclude=()):
        data = {}
        for field in instance._meta.fields:
            if field.primary_key or field.name in exclude:
                continue
            data[field.name] = getattr(instance, field.name)
        return data

    def clone_plan_details(old_plan, new_plan):
        """
        Clone all PlanDetail objects, preserving parent/sub hierarchy
        """
        old_details = old_plan.details.all()
        detail_map = {}  # old_id -> new_instance

        # First pass: create all sections without parents
        for detail in old_details:
            data = CreationHelper.clone_fields(detail, exclude=("plan", "parent_section"))
            new_detail = PlanDetail.objects.create(
                plan=new_plan,
                **data
            )
            detail_map[detail.id] = new_detail

        # Second pass: set parent_section
        for detail in old_details:
            if detail.parent_section_id:
                new_detail = detail_map[detail.id]
                new_detail.parent_section = detail_map[detail.parent_section_id]
                new_detail.save(update_fields=["parent_section"])


  

  

