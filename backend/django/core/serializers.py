from rest_framework import serializers

from core.models import Invitation, Notification, Organization


class InitialBalanceSerializer(serializers.Serializer[Organization]):
    initial_balance = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=0,
    )


class InvitationCreateSerializer(serializers.Serializer[Invitation]):
    username = serializers.CharField(max_length=150)


class MarkNotificationsReadSerializer(serializers.Serializer[Notification]):
    notification_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
