from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Organization, Transaction, User
from core.permissions import IsOrgMember
from core.serializers import TransactionCreateSerializer, TransactionResponseSerializer
from core.services.transaction import create_transaction_entry


class TransactionListCreateView(APIView):
    """
    Manage transactions for the authenticated user.

    GET /api/organizations/{org_id}/transactions/:
    Returns a list of transactions for current organisation where the current user is a member.

    Returns:
    - 200 OK with a list of transactions for GET requests.

    POST /api/organizations/{org_id}/transactions/:
    Create a new transaction for the authenticated user in current organisation.

    Request body:
    - name (string): Organization name.
    - initial_balance (decimal): Initial balance for the organization.

    Returns:
    - 201 Created with the created transaction.
    """

    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request: Request, org_id: int) -> Response:
        assert isinstance(request.user, User)
        transactions = Transaction.objects.filter(org_id=org_id).select_related(
            "category", "created_by", "goal"
        )
        return Response(
            {"transactions": TransactionResponseSerializer(transactions, many=True).data},
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
