# from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Category, User
from core.permissions import IsOrgMember
from core.serializers import (
    CategoryResponseSerializer,
    # CategoryCreateSerializer,
    # CategoryUpdateSerializer,
)


class CategoryListCreateView(APIView):
    """List and create categories for an organization member."""

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


# Functionality to add a new category

# def post(self, request: Request, org_id: int) -> Response:
#     assert isinstance(request.user, User)

#     org = get_object_or_404(Organization, pk=org_id)

#     serializer = CategoryCreateSerializer(
#         data=request.data,
#         context={"org": org},
#     )
#     serializer.is_valid(raise_exception=True)

#     try:
#         with transaction.atomic():
#             category = Category.objects.create(
#                 org=org,
#                 name=serializer.validated_data["name"],
#                 type=serializer.validated_data["type"],
#             )
#     except IntegrityError as exc:
#         raise serializers.ValidationError(
#             {"name": "This category already exists in this organization."}
#         ) from exc

#     return Response(
#         CategoryResponseSerializer(category).data,
#         status=status.HTTP_201_CREATED,
#     )


class CategoryReadUpdateDeleteView(APIView):
    """Retrieve, update, or delete a category owned by an organization."""

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


# Functionality to edit and delete a category

# def patch(self, request: Request, org_id: int, category_id: int) -> Response:
#     assert isinstance(request.user, User)
#     category = get_object_or_404(
#         Category,
#         id=category_id,
#         org_id=org_id,
#     )
#     serializer = CategoryUpdateSerializer(
#         category,
#         data=request.data,
#         context={"category": category},
#     )
#     serializer.is_valid(raise_exception=True)

#     try:
#         with transaction.atomic():
#             for field, value in serializer.validated_data.items():
#                 setattr(category, field, value)
#             category.save(update_fields=serializer.validated_data.keys())
#     except IntegrityError as exc:
#         raise serializers.ValidationError(
#             {"name": "This category already exists in this organization."}
#         ) from exc

#     return Response(
#         {"category": CategoryResponseSerializer(category).data},
#         status=status.HTTP_200_OK,
#     )

# def delete(self, request: Request, org_id: int, category_id: int) -> Response:
#     category = get_object_or_404(
#         Category,
#         id=category_id,
#         org_id=org_id,
#     )
#     category.delete()
#     return Response(status=status.HTTP_204_NO_CONTENT)
