from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Category, User
from core.permissions import IsOrgMember
from core.serializers import CategoryResponseSerializer


class CategoryListView(APIView):
    """List categories for an organization member."""

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


class CategoryReadView(APIView):
    """Retrieve a category owned by an organization."""

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
