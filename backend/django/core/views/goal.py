"""API views for listing, updating, and inspecting organization goals."""

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Goal, Organization, User
from core.permissions import IsGoalCreatorOrOrgOwner, IsOrgMember
from core.serializers import (
    GoalCreateSerializer,
    GoalListQuerySerializer,
    GoalResponseSerializer,
    GoalUpdateSerializer,
)
from core.services.balance import annotate_goal_balance, get_annotated_goal_balance
from core.services.goal import GoalArchivalError, create_goal, update_goal


class GoalListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request: Request, org_id: int) -> Response:
        assert isinstance(request.user, User)
        queryset = annotate_goal_balance(
            Goal.objects.filter(org_id=org_id).select_related("created_by")
        ).order_by("created_at", "id")

        params = GoalListQuerySerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        status_filter = params.validated_data.get("status")
        if status_filter is not None:
            queryset = queryset.filter(status=status_filter)

        goals = GoalResponseSerializer(queryset, many=True).data
        return Response(
            {
                "goals": goals,
                "total": len(goals),
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request: Request, org_id: int) -> Response:
        assert isinstance(request.user, User)
        serializer = GoalCreateSerializer(data=request.data, context={"org_id": org_id})
        serializer.is_valid(raise_exception=True)
        org = get_object_or_404(Organization, pk=org_id)
        data = serializer.validated_data
        goal = create_goal(
            org,
            request.user,
            name=data["name"],
            target_amount=data["target_amount"],
            target_date=data["target_date"],
        )
        return Response(GoalResponseSerializer(goal).data, status=status.HTTP_201_CREATED)


class GoalReadUpdateView(APIView):
    permission_classes = [IsAuthenticated, IsOrgMember, IsGoalCreatorOrOrgOwner]

    def get_object(self, org_id: int, goal_id: int) -> Goal:
        return get_object_or_404(
            annotate_goal_balance(
                Goal.objects.select_related("created_by").filter(org_id=org_id, id=goal_id)
            )
        )

    def get(self, request: Request, org_id: int, goal_id: int) -> Response:
        goal = self.get_object(org_id, goal_id)
        return Response({"goal": GoalResponseSerializer(goal).data}, status=status.HTTP_200_OK)

    def patch(self, request: Request, org_id: int, goal_id: int) -> Response:
        assert isinstance(request.user, User)
        goal = self.get_object(org_id, goal_id)
        self.check_object_permissions(request, goal)

        serializer = GoalUpdateSerializer(data=request.data, context={"goal": goal})
        serializer.is_valid(raise_exception=True)
        try:
            update_goal(goal, serializer.validated_data, request.user)
        except GoalArchivalError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)

        goal = self.get_object(org_id, goal_id)
        return Response({"goal": GoalResponseSerializer(goal).data}, status=status.HTTP_200_OK)


class GoalBalanceView(APIView):
    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request: Request, org_id: int, goal_id: int) -> Response:
        goal = get_object_or_404(
            annotate_goal_balance(Goal.objects.filter(org_id=org_id, id=goal_id))
        )
        return Response(
            {"goal_id": goal.id, "balance": str(get_annotated_goal_balance(goal))},
            status=status.HTTP_200_OK,
        )
