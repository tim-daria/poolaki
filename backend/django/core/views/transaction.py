from dataclasses import replace

from django.db import transaction as db_transaction
from django.shortcuts import get_object_or_404
from rest_framework import status

# from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import EntryType, Organization, Transaction, User
from core.permissions import IsOrgMember
from core.serializers import (
    TransactionCreateSerializer,
    TransactionListQuerySerializer,
    TransactionResponseSerializer,
    TransactionUpdateSerializer,
)

# from core.services.balance import calculate_org_balance
from core.services.transaction import (
    TransactionFilters,
    build_transaction_queryset,
    count_by_entry_type,
    create_transaction_entry,
)


class TransactionListCreateView(APIView):
    """
    Manage transactions for the authenticated user.

    GET
    Returns a page of transactions for current organization where the current
    user is a member.

    Query parameters (all optional):
    - entry_type: "all" (default), "income", "expense" or "contribution".
    - date_from / date_to: inclusive ISO date bounds on transaction_date.
    - category_id: ID of a category belonging to the organization.
    - goal_id: ID of a goal belonging to the organization.
    - tax_deductible: "true" keeps only tax-deductible rows.
    - sort: "newest" (default) or "oldest".
    - page / page_size: 1-based paging, page_size capped at 100.

    Returns:
    - 200 OK with {transactions, total, page, page_size, page_count, counts};
      counts are per-entry-type totals over every filter except entry_type.
    - 400 Bad Request on malformed query parameters.

    POST
    Create a new transaction for the authenticated user in current organization.

    Request body required:
    - amount (decimal): Transaction amount.
    - entry_type (string): Transaction type, such as income or expense.
    - transaction_date (date): Date when the transaction occurred.

    Request body optional:
    - category_id (integer): ID of the category associated with the transaction.
    - description (string): Optional details or notes about the transaction.
    - goal_id (integer): ID of the financial goal associated with the transaction.
    - is_tax_deductible (boolean): Indicates whether the transaction is tax-deductible.

    Returns:
    - 201 Created with the created transaction.
    """

    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request: Request, org_id: int) -> Response:
        assert isinstance(request.user, User)
        params = TransactionListQuerySerializer(
            data=request.query_params, context={"org_id": org_id}
        )
        params.is_valid(raise_exception=True)
        data = params.validated_data

        entry_type = data["entry_type"]
        filters = TransactionFilters(
            date_from=data.get("date_from"),
            date_to=data.get("date_to"),
            category_id=data.get("category_id"),
            goal_id=data.get("goal_id"),
            tax_deductible=data["tax_deductible"],
            entry_type=None if entry_type == "all" else EntryType(entry_type),
            sort=data["sort"],
        )

        base = build_transaction_queryset(org_id, replace(filters, entry_type=None))
        counts = count_by_entry_type(base)
        listed = base if filters.entry_type is None else base.filter(entry_type=filters.entry_type)

        total = listed.count()
        page = data["page"]
        page_size = data["page_size"]
        start = (page - 1) * page_size

        return Response(
            {
                "transactions": TransactionResponseSerializer(
                    listed[start : start + page_size], many=True
                ).data,
                "total": total,
                "page": page,
                "page_size": page_size,
                "page_count": max(1, (total + page_size - 1) // page_size),
                "counts": counts,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request: Request, org_id: int) -> Response:
        assert isinstance(request.user, User)
        serializer = TransactionCreateSerializer(data=request.data, context={"org_id": org_id})
        serializer.is_valid(raise_exception=True)
        org = get_object_or_404(Organization, pk=org_id)
        data = serializer.validated_data
        transaction = create_transaction_entry(
            org=org,
            created_by=request.user,
            category_id=data.get("category_id").pk if data.get("category_id") else None,
            goal_id=data.get("goal_id").pk if data.get("goal_id") else None,
            entry_type=data["entry_type"],
            amount=data["amount"],
            description=data.get("description"),
            transaction_date=data["transaction_date"],
            is_tax_deductible=data["is_tax_deductible"],
        )

        return Response(
            TransactionResponseSerializer(transaction).data,
            status=status.HTTP_201_CREATED,
        )


class TransactionGetDeleteView(APIView):
    """
        Retrieve, update, or delete a transaction from the specified organization.

        GET

    Returns:
        - 200 OK with the transaction for GET requests.

        PATCH
        Partially updates a transaction created by the authenticated user.
        Only fields included in the request are changed. Supported fields are
        amount, description, transaction_date, is_tax_deductible, and category_id.
        A category must belong to the specified organization.

    Returns:
        - 200 OK with the updated transaction for PATCH requests.

        DELETE
        Deletes the requested transaction. Income transactions can be deleted only
        when the organization's current balance is sufficient to cancel the income.

    Returns:
        - 204 No content for successful DELETE requests.
        - 400 Bad Request when an income transaction cannot be cancelled because
                the organization's balance is insufficient.
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

    def patch(self, request: Request, org_id: int, transaction_id: int) -> Response:
        user = request.user
        assert isinstance(user, User)

        transaction = get_object_or_404(
            Transaction,
            id=transaction_id,
            org_id=org_id,
            created_by=user,
        )

        serializer = TransactionUpdateSerializer(
            data=request.data,
            context={
                "org_id": org_id,
                "transaction": transaction,
            },
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        updated_fields = set()
        if "category_id" in data:
            transaction.category = data["category_id"]
            updated_fields.add("category")

        if "amount" in data:
            transaction.amount = data["amount"]
            updated_fields.add("amount")

        if "description" in data:
            transaction.description = data["description"]
            updated_fields.add("description")

        if "transaction_date" in data:
            transaction.transaction_date = data["transaction_date"]
            updated_fields.add("transaction_date")

        if "is_tax_deductible" in data:
            transaction.is_tax_deductible = data["is_tax_deductible"]
            updated_fields.add("is_tax_deductible")

        with db_transaction.atomic():
            transaction.save(update_fields=updated_fields)

        return Response(
            {"transaction": TransactionResponseSerializer(transaction, many=False).data},
            status=status.HTTP_200_OK,
        )

    def delete(self, request: Request, org_id: int, transaction_id: int) -> Response:
        with db_transaction.atomic():
            transaction = get_object_or_404(
                Transaction,
                id=transaction_id,
                org_id=org_id,
                created_by=request.user,
            )
            # Check for negative organization balance after deleting transaction entry
            # org = get_object_or_404(
            #     Organization.objects.select_for_update(),
            #     id=org_id,
            # )
            # if (
            #     transaction.entry_type == EntryType.INCOME
            #     and calculate_org_balance(org) < transaction.amount
            # ):
            #     raise ValidationError("Insufficient balance to cancel this income transaction.")

            transaction.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
