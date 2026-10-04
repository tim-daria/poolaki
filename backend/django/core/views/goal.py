from datetime import date
from decimal import Decimal

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import EntryType, Goal, GoalStatus, Membership, User
from core.permissions import IsOrgMember
from core.serializers import GoalCreateSerializer, GoalResponseSerializer, GoalUpdateSerializer
from core.services.balance import calculate_goal_balance
from core.services.transaction import create_transaction_entry


class GoalListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request: Request, org_id: int) -> Response:
        assert isinstance(request.user, User)
        queryset = Goal.objects.filter(org_id=org_id).order_by("created_at", "id")

        status_filter = request.query_params.get("status")
        valid_statuses = {choice[0] for choice in GoalStatus.choices}
        if status_filter is not None:
            if status_filter not in valid_statuses:
                return Response({"goals": []}, status=status.HTTP_200_OK)
            queryset = queryset.filter(status=status_filter)

        return Response(
            {"goals": GoalResponseSerializer(queryset, many=True).data},
            status=status.HTTP_200_OK,
        )

    def post(self, request: Request, org_id: int) -> Response:
        assert isinstance(request.user, User)
        serializer = GoalCreateSerializer(data=request.data, context={"org_id": org_id})
        serializer.is_valid(raise_exception=True)

        goal = Goal.objects.create(
            org_id=org_id,
            name=serializer.validated_data["name"],
            target_amount=serializer.validated_data["target_amount"],
            target_date=serializer.validated_data["target_date"],
            status=GoalStatus.ACTIVE,
            created_by=request.user,
        )
        return Response(GoalResponseSerializer(goal).data, status=status.HTTP_201_CREATED)


class GoalReadUpdateView(APIView):
    permission_classes = [IsAuthenticated, IsOrgMember]

    def get_object(self, org_id: int, goal_id: int) -> Goal:
        return get_object_or_404(Goal, org_id=org_id, id=goal_id)

    def get(self, request: Request, org_id: int, goal_id: int) -> Response:
        goal = self.get_object(org_id, goal_id)
        return Response({"goal": GoalResponseSerializer(goal).data}, status=status.HTTP_200_OK)

    def patch(self, request: Request, org_id: int, goal_id: int) -> Response:
        assert isinstance(request.user, User)
        goal = self.get_object(org_id, goal_id)

        has_owner_access = Membership.objects.filter(
            user=request.user,
            org_id=org_id,
            role="owner",
        ).exists()
        if request.user != goal.created_by and not has_owner_access:
            return Response(
                {
                    "detail": (
                        "Only the organization owner and the goal creator can update this goal."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = GoalUpdateSerializer(data=request.data, context={"goal": goal})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        new_status = data.get("status")
        if new_status == GoalStatus.ARCHIVED and goal.status != GoalStatus.ARCHIVED:
            remaining_balance = calculate_goal_balance(goal.org, goal)
            if remaining_balance < Decimal("0"):
                return Response(
                    {"detail": "Goal balance cannot be archived while negative."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if remaining_balance > Decimal("0"):
                create_transaction_entry(
                    org=goal.org,
                    created_by=request.user,
                    category_id=None,
                    goal_id=goal.id,
                    entry_type=EntryType.WITHDRAW,
                    amount=remaining_balance,
                    description="Goal archived.",
                    transaction_date=date.today(),
                    is_tax_deductible=False,
                )
                if calculate_goal_balance(goal.org, goal) != Decimal("0"):
                    return Response(
                        {"detail": "Goal balance must reach zero before archiving."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        for field, value in data.items():
            setattr(goal, field, value)
        goal.save()

        return Response({"goal": GoalResponseSerializer(goal).data}, status=status.HTTP_200_OK)


class GoalBalanceView(APIView):
    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request: Request, org_id: int, goal_id: int) -> Response:
        goal = get_object_or_404(Goal, org_id=org_id, id=goal_id)
        return Response(
            {"goal_id": goal.id, "balance": str(calculate_goal_balance(goal.org, goal))},
            status=status.HTTP_200_OK,
        )
