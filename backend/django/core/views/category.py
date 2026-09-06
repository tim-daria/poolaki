from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Category, Organization, User
from core.permissions import IsOrgMember
from core.serializers import CategoryCreateSerializer, CategoryResponseSerializer


class CategoryListCreateView(APIView):
    """
    Manage categories for the authenticated user.

    GET
    Returns a list of categories for current organization where the current user is a member.

    Returns:
    - 200 OK with a list of categories for GET requests.

    POST
    Create a new category for the authenticated user in current organization.

    Request body required:
    - name (string): Transaction type, such as income or expense.
    - type (string): Transaction type, such as income or expense.

    Returns:
    - 201 Created with the created category.
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


# class TransactionGetDeleteView(APIView):

"""
        Retrieve or delete a transaction from the specified organization.

        GET

    Returns:
        - 200 OK with the transaction for GET requests.

        DELETE
        Deletes the requested transaction. Income transactions can be deleted only
        when the organization's current balance is sufficient to cancel the income.

    Returns:
        - 204 No content for successful DELETE requests.
        - 400 Bad Request when an income transaction cannot be cancelled because
                the organization's balance is insufficient.
    """
"""
    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request: Request, org_id: int, transaction_id: int) -> Response:
        assert isinstance(request.user, User)
        transaction = get_object_or_404(
            Transaction,
            id=transaction_id,
            org_id=org_id,
        )
        return Response(
            {"transaction": TransactionResponseSerializer(transaction, many=False).data},
            status=status.HTTP_200_OK,
        )

    def delete(self, request: Request, org_id: int, transaction_id: int) -> Response:
        with db_transaction.atomic():
            org = get_object_or_404(
                Organization.objects.select_for_update(),
                id=org_id,
            )
            transaction = get_object_or_404(
                Transaction,
                id=transaction_id,
                org_id=org_id,
            )
            if (
                transaction.entry_type == EntryType.INCOME
                and calculate_org_balance(org) < transaction.amount
            ):
                raise ValidationError("Insufficient balance to cancel this income transaction.")

            transaction.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
"""
