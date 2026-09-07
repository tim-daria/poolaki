from django.db import transaction as db_transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Category, Organization, User
from core.permissions import IsOrgMember
from core.serializers import (
    CategoryCreateSerializer,
    CategoryResponseSerializer,
    CategoryUpdateSerializer,
)


class CategoryListCreateView(APIView):
    """
    Manage categories for the authenticated user.

    GET
    Returns a list of categories for current organization where the current user is a member.

    Returns:
    - 200 OK with a list of categories for GET requests.
    - 401 Unauthorized when the user is not authenticated.
    - 403 Forbidden when the user is not a member of the organization.
    - 404 Not Found when the category does not belong to the organization.

    POST
    Create a new category for the authenticated user in current organization.

    Request body required:
    - name (string): Category name.
    - type (string): Category type, such as "income", "expense" or "contribution".

    Returns:
    - 201 Created with the created category.
    - 400 Bad Request when validation fails.
    - 401 Unauthorized when the user is not authenticated.
    - 403 Forbidden when the user is not a member of the organization.
    - 404 Not Found when the category does not belong to the organization.
    """

    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request: Request, org_id: int) -> Response:
        assert isinstance(request.user, User)

        categories = Category.objects.filter(org_id=org_id)

        category_type = request.query_params.get("type")
        if category_type is not None:
            categories = categories.filter(type=category_type)

        return Response(
            {"categories": CategoryResponseSerializer(categories, many=True).data},
            status=status.HTTP_200_OK,
        )

    def post(self, request: Request, org_id: int) -> Response:
        assert isinstance(request.user, User)

        org = get_object_or_404(Organization, pk=org_id)

        serializer = CategoryCreateSerializer(
            data=request.data,
            context={"org": org},
        )
        serializer.is_valid(raise_exception=True)

        category = Category.objects.create(
            org=org,
            name=serializer.validated_data["name"],
            type=serializer.validated_data["type"],
        )

        return Response(
            CategoryResponseSerializer(category).data,
            status=status.HTTP_201_CREATED,
        )


class CategoryReadUpdateDeleteView(APIView):
    """
    Retrieve, update, or delete a category from the specified organization.

    GET
    Returns the requested category.

    Returns:
    - 200 OK with the category.
    - 401 Unauthorized when the user is not authenticated.
    - 403 Forbidden when the user is not a member of the organization.
    - 404 Not Found when the category does not belong to the organization.

    PATCH
    Updates one or more category fields.

        Request body required aat least one of the fields:
    - name (string): Category name.
    - type (string): Category type, such as "income", "expense" or "contribution".

    Returns:
    - 200 OK with the updated category.
    - 400 Bad Request when validation fails.
    - 401 Unauthorized when the user is not authenticated.
    - 403 Forbidden when the user is not a member of the organization.
    - 404 Not Found when the category does not belong to the organization.

    DELETE
    Deletes the requested category. Transactions linked to the category are preserved,
    but their category reference is cleared.

    Returns:
    - 204 No Content for a successful DELETE request.
    - 401 Unauthorized when the user is not authenticated.
    - 403 Forbidden when the user is not a member of the organization.
    - 404 Not Found when the category does not belong to the organization.
    """

    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request: Request, org_id: int, category_id: int) -> Response:
        assert isinstance(request.user, User)
        category = get_object_or_404(
            Category,
            id=category_id,
            org_id=org_id,
        )
        return Response(
            {"category": CategoryResponseSerializer(category, many=False).data},
            status=status.HTTP_200_OK,
        )

    def patch(self, request: Request, org_id: int, category_id: int) -> Response:
        assert isinstance(request.user, User)
        category = get_object_or_404(
            Category,
            id=category_id,
            org_id=org_id,
        )
        serializer = CategoryUpdateSerializer(
            category,
            data=request.data,
            context={"category": category},
        )
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(category, field, value)
        category.save(update_fields=serializer.validated_data.keys())

        return Response(
            {"category": CategoryResponseSerializer(category).data},
            status=status.HTTP_200_OK,
        )

    def delete(self, request: Request, org_id: int, category_id: int) -> Response:
        with db_transaction.atomic():
            get_object_or_404(
                Organization.objects.select_for_update(),
                id=org_id,
            )
            category = get_object_or_404(
                Category,
                id=category_id,
                org_id=org_id,
            )

            category.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
