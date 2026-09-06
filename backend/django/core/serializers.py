from rest_framework import serializers

from core.models import (
    Category,
    CategoryType,
    EntryType,
    Goal,
    Invitation,
    Notification,
    Organization,
    Transaction,
)


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


class TransactionCreateSerializer(serializers.Serializer[Transaction]):
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), allow_null=True, required=False
    )
    entry_type = serializers.ChoiceField(choices=EntryType.choices)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    description = serializers.CharField(
        max_length=1024, allow_blank=True, allow_null=True, required=False
    )
    transaction_date = serializers.DateField()
    is_tax_deductible = serializers.BooleanField(required=False, default=False)
    goal_id = serializers.PrimaryKeyRelatedField(
        queryset=Goal.objects.all(), allow_null=True, required=False
    )

    def validate_goal_id(self, goal: Goal | None) -> Goal | None:
        org_id = self.context.get("org_id")
        if goal is not None and goal.org_id != org_id:
            raise serializers.ValidationError("Goal does not belong to this organization.")
        return goal


class TransactionResponseSerializer(serializers.ModelSerializer[Transaction]):
    org_id = serializers.IntegerField(read_only=True)
    goal_id = serializers.IntegerField(allow_null=True, read_only=True)
    category_id = serializers.IntegerField(allow_null=True, read_only=True)
    created_by = serializers.CharField(
        source="created_by.username", allow_null=True, read_only=True
    )

    class Meta:
        model = Transaction
        fields = (
            "id",
            "org_id",
            "goal_id",
            "category_id",
            "entry_type",
            "amount",
            "description",
            "transaction_date",
            "is_tax_deductible",
            "created_by",
            "created_at",
        )


class CategoryCreateSerializer(serializers.Serializer[Category]):
    org = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(), allow_null=False, required=True
    )
    name = serializers.CharField(max_length=50, allow_blank=False, allow_null=False, required=True)
    type = serializers.ChoiceField(
        choices=CategoryType.choices,
        allow_blank=False,
        allow_null=False,
        required=True,
        error_messages={
            "invalid_choice": "Invalid category type.",
            "blank": "Category type may not be blank.",
            "null": "Category type may not be null.",
            "required": "Category type is required.",
        },
    )


class CategoryResponseSerializer(serializers.ModelSerializer[Category]):
    org = serializers.IntegerField(source="org_id", read_only=True)
    name = serializers.CharField(read_only=True)
    type = serializers.CharField(read_only=True)

    class Meta:
        model = Category
        fields = (
            "id",
            "org",
            "name",
            "type",
        )
