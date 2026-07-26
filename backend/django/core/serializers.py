from rest_framework import serializers

from core.models import Organization


class InitialBalanceSerializer(serializers.Serializer[Organization]):
    initial_balance = serializers.DecimalField(max_digits=14, decimal_places=2)
