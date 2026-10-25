"""API views for listing, creating, updating, and deleting transactions."""

from django.db import transaction as db_transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError

# from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import EntryType, Goal, GoalStatus, Organization, Transaction, User
from core.permissions import IsOrgMember
from core.serializers import (
    TransactionCreateSerializer,
    TransactionListQuerySerializer,
    TransactionResponseSerializer,
    TransactionUpdateSerializer,
)
from core.services.balance import (
    GoalBalanceMutation,
    calculate_goal_balance,
    lock_goal_and_validate_balance,
)
from core.services.goal import allowed_entry_types
from core.services.transaction import (
    TransactionFilters,
    create_transaction_entry,
    list_transactions,
)


class TransactionListCreateView(APIView):
    """
    Manage transactions for the authenticated user.

    GET
    Returns a page of transactions for current organization where the current
    user is a member.

    Query parameters (all optional):
    - q: case-insensitive substring search on description, category name and
      creator's username.
    - entry_type: "all" (default), "income", "expense", "contribution" or "withdraw".
    - date_from / date_to: inclusive ISO date bounds on transaction_date.
    - category_id: one category ID or a comma-separated list (e.g. "3,7");
      rows in any listed category are returned. All must belong to the org.
    - goal_id: ID of a goal belonging to the organization.
    - tax_deductible: "true" keeps only tax-deductible rows.
    - created_by: one user ID or a comma-separated list; rows created by any
      listed member are returned. All must be members of the org.
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
    - entry_type (string): Transaction type, such as income, expense, contribution or withdraw.
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
        category_ids = data.get("category_id")
        created_by_ids = data.get("created_by")
        filters = TransactionFilters(
            date_from=data.get("date_from"),
            date_to=data.get("date_to"),
            category_ids=tuple(category_ids) if category_ids else None,
            goal_id=data.get("goal_id"),
            created_by_ids=tuple(created_by_ids) if created_by_ids else None,
            tax_deductible=data["tax_deductible"],
            q=data.get("q", "").strip(),
            entry_type=None if entry_type == "all" else EntryType(entry_type),
            sort=data["sort"],
        )
        result = list_transactions(org_id, filters, data["page"], data["page_size"])

        return Response(
            {
                "transactions": TransactionResponseSerializer(result.rows, many=True).data,
                "total": result.total,
                "page": result.page,
                "page_size": result.page_size,
                "page_count": result.page_count,
                "counts": result.counts,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request: Request, org_id: int) -> Response:
        assert isinstance(request.user, User)
        serializer = TransactionCreateSerializer(data=request.data, context={"org_id": org_id})
        serializer.is_valid(raise_exception=True)
        org = get_object_or_404(Organization, pk=org_id)
        data = serializer.validated_data
        goal = data.get("goal_id")
        if data["entry_type"] == EntryType.WITHDRAW and isinstance(goal, Goal):
            with db_transaction.atomic():
                locked_goal = Goal.objects.select_for_update().get(pk=goal.pk)
                if data["entry_type"] not in allowed_entry_types(locked_goal):
                    raise ValidationError("Withdrawals can only be made from active goals.")
                if data["amount"] > calculate_goal_balance(locked_goal):
                    raise ValidationError(
                        {"amount": ("Withdrawal amount cannot exceed the goal balance.",)}
                    )
                transaction = create_transaction_entry(
                    org=org,
                    created_by=request.user,
                    category_id=data.get("category_id").pk if data.get("category_id") else None,
                    goal_id=locked_goal.pk,
                    entry_type=data["entry_type"],
                    amount=data["amount"],
                    description=data.get("description"),
                    transaction_date=data["transaction_date"],
                    is_tax_deductible=data["is_tax_deductible"],
                )
        else:
            transaction = create_transaction_entry(
                org=org,
                created_by=request.user,
                category_id=data.get("category_id").pk if data.get("category_id") else None,
                goal_id=goal.pk if isinstance(goal, Goal) else None,
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
        Deletes the requested transaction. Deleting a contribution or withdrawal
        validates the resulting goal balance and rejects changes that violate the
        goal invariant, including transactions associated with archived goals.
        Income deletion is not restricted by the organization's balance.

    Returns:
        - 204 No content for successful DELETE requests.
        - 400 Bad Request when deleting a goal transaction would violate the goal
                balance invariant.
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

        with db_transaction.atomic():
            transaction = get_object_or_404(
                Transaction.objects.select_for_update(),
                id=transaction_id,
                org_id=org_id,
                created_by=user,
            )
            goal = (
                Goal.objects.select_for_update().get(pk=transaction.goal_id)
                if transaction.goal_id is not None
                else None
            )
            serializer = TransactionUpdateSerializer(
                data=request.data,
                context={
                    "org_id": org_id,
                    "transaction": transaction,
                    "goal": goal,
                },
            )
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data

        with db_transaction.atomic():
            if transaction.goal_id is not None and transaction.entry_type in (
                EntryType.CONTRIBUTION,
                EntryType.WITHDRAW,
            ):
                locked_goal = lock_goal_and_validate_balance(
                    transaction.goal_id,
                    GoalBalanceMutation.update(
                        transaction.entry_type,
                        transaction.amount,
                        data.get("amount", transaction.amount),
                    ),
                )
                transaction = get_object_or_404(
                    Transaction.objects.select_for_update(),
                    id=transaction_id,
                    org_id=org_id,
                    created_by=user,
                    goal_id=locked_goal.id,
                )
            else:
                transaction = get_object_or_404(
                    Transaction.objects.select_for_update(),
                    id=transaction_id,
                    org_id=org_id,
                    created_by=user,
                )

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
            if transaction.goal_id is not None:
                goal = Goal.objects.select_for_update().get(pk=transaction.goal_id)
                if goal.status == GoalStatus.ARCHIVED:
                    raise ValidationError(
                        {
                            "amount": [
                                "Transactions associated with archived goals cannot be deleted."
                            ]
                        }
                    )
                if transaction.entry_type in (EntryType.CONTRIBUTION, EntryType.WITHDRAW):
                    lock_goal_and_validate_balance(
                        goal.id,
                        GoalBalanceMutation.delete(transaction.entry_type, transaction.amount),
                    )
                    transaction = get_object_or_404(
                        Transaction.objects.select_for_update(),
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
