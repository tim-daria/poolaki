from rest_framework import serializers

from core.models import Invitation, Organization


class InitialBalanceSerializer(serializers.Serializer[Organization]):
    initial_balance = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=0,
    )


class InvitationCreateSerializer(serializers.Serializer[Invitation]):
    invited_user = serializers.CharField(max_length=150)
