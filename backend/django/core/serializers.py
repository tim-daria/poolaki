from datetime import date
from decimal import Decimal
from typing import Any

from rest_framework import serializers

from core.models import (
    Category,
    # CategoryType,
    EntryType,
    Goal,
    GoalStatus,
    Invitation,
    Notification,
    Organization,
    Transaction,
)
from core.services.balance import calculate_goal_balance


class IntListField(serializers.Field[list[int], object, list[int], Any]):
    """A single positive int or a comma-separated list of them: "5,7,12"."""

    default_error_messages = {
        "required": "This field is required.",
        "invalid": "Enter a positive integer or a comma-separated list of integers.",
    }

    def to_internal_value(self, value: object) -> list[int]:
        ids: list[int] = []
        for part in str(value).split(","):
            part = part.strip()
            if not part.isdigit() or int(part) < 1:
                self.fail("invalid")
            ids.append(int(part))
        return ids


class InitialBalanceSerializer(serializers.Serializer[Organization]):
    initial_balance = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=0,
    )


class OrganizationNameSerializer(serializers.Serializer[Organization]):
    name = serializers.CharField(max_length=100, allow_blank=False, trim_whitespace=True)


class OrganizationCreateSerializer(OrganizationNameSerializer):
    initial_balance = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=0,
    )


class GoalCreateSerializer(serializers.Serializer[Goal]):
    name = serializers.CharField(max_length=100, trim_whitespace=True)
    target_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )
    target_date = serializers.DateField()

    def validate(self, attrs: dict[str, object]) -> dict[str, object]:
        org_id = self.context.get("org_id")
        name = attrs["name"]

        if Goal.objects.filter(org_id=org_id, name=name).exists():
            raise serializers.ValidationError(
                {"name": "A goal with this name already exists in this organization."}
            )

        target_date = attrs["target_date"]
        if not isinstance(target_date, date):
            raise serializers.ValidationError({"target_date": "Invalid target date."})
        if target_date < date.today():
            raise serializers.ValidationError(
                {"target_date": "Target date must be today or in the future."}
            )

        return attrs


class GoalUpdateSerializer(serializers.Serializer[Goal]):
    name = serializers.CharField(max_length=100, trim_whitespace=True, required=False)
    target_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0.01"),
        required=False,
    )
    target_date = serializers.DateField(required=False)
    status = serializers.ChoiceField(choices=GoalStatus.choices, required=False)

    def validate(self, attrs: dict[str, object]) -> dict[str, object]:
        goal = self.context["goal"]

        if not attrs:
            raise serializers.ValidationError("At least one field must be provided.")

        target_date = attrs.get("target_date")
        if target_date is not None and not isinstance(target_date, date):
            raise serializers.ValidationError({"target_date": "Invalid target date."})
        if target_date is not None and target_date < date.today():
            raise serializers.ValidationError(
                {"target_date": "Target date must be today or in the future."}
            )

        if "status" in attrs:
            new_status = attrs["status"]
            if goal.status == GoalStatus.ARCHIVED and new_status != GoalStatus.ARCHIVED:
                raise serializers.ValidationError(
                    {"status": "Archived goals cannot be changed back to an active state."}
                )
            if goal.status == GoalStatus.COMPLETED and new_status == GoalStatus.ACTIVE:
                raise serializers.ValidationError(
                    {"status": "Completed goals cannot be moved back to active."}
                )
            if goal.status == GoalStatus.ACTIVE and new_status not in {
                GoalStatus.ACTIVE,
                GoalStatus.COMPLETED,
                GoalStatus.ARCHIVED,
            }:
                raise serializers.ValidationError({"status": "Invalid status transition."})
            if goal.status == GoalStatus.COMPLETED and new_status not in {
                GoalStatus.COMPLETED,
                GoalStatus.ARCHIVED,
            }:
                raise serializers.ValidationError({"status": "Invalid status transition."})
            if goal.status == GoalStatus.ARCHIVED and new_status != GoalStatus.ARCHIVED:
                raise serializers.ValidationError({"status": "Invalid status transition."})

        return attrs


class GoalResponseSerializer(serializers.ModelSerializer[Goal]):
    org = serializers.IntegerField(source="org_id", read_only=True)
    created_by = serializers.CharField(
        source="created_by.username",
        allow_null=True,
        read_only=True,
    )
    saved_amount = serializers.SerializerMethodField()

    class Meta:
        model = Goal
        fields = (
            "id",
            "org",
            "name",
            "target_amount",
            "target_date",
            "status",
            "created_by",
            "created_at",
            "saved_amount",
        )

    def get_saved_amount(self, goal: Goal) -> str:
        return str(calculate_goal_balance(goal.org, goal))


class InvitationCreateSerializer(serializers.Serializer[Invitation]):
    username = serializers.CharField(max_length=150)


class MarkNotificationsReadSerializer(serializers.Serializer[Notification]):
    notification_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)


class TransactionCreateSerializer(serializers.Serializer[Transaction]):
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), allow_null=True, required=False
    )
    entry_type = serializers.ChoiceField(choices=EntryType.choices)
    amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )
    description = serializers.CharField(
        max_length=1024, allow_blank=True, allow_null=True, required=False
    )
    transaction_date = serializers.DateField()
    is_tax_deductible = serializers.BooleanField(required=False, default=False)
    goal_id = serializers.PrimaryKeyRelatedField(
        queryset=Goal.objects.all(), allow_null=True, required=False
    )

    def validate(self, attrs: dict[str, object]) -> dict[str, object]:
        category = attrs.get("category_id")
        entry_type = attrs["entry_type"]

        if isinstance(category, Category) and category.type != entry_type:
            raise serializers.ValidationError(
                {"category_id": ("Category type must match transaction entry type.")}
            )

        if attrs.get("goal_id") is not None and entry_type == EntryType.INCOME:
            raise serializers.ValidationError(
                {"goal_id": ("Goal cannot be set on an income transaction.")}
            )

        return attrs

    def validate_goal_id(self, goal: Goal | None) -> Goal | None:
        org_id = self.context.get("org_id")
        if goal is not None and goal.org_id != org_id:
            raise serializers.ValidationError(["Goal does not belong to this organization."])
        return goal

    def validate_category_id(self, category: Category | None) -> Category | None:
        org_id = self.context.get("org_id")
        if category is not None and category.org_id != org_id:
            raise serializers.ValidationError(["Category does not belong to this organization."])
        return category


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


class TransactionListQuerySerializer(serializers.Serializer[Transaction]):
    """GET /organizations/{org_id}/transactions/ query parameters.

    `entry_type="all"` is the unfiltered sentinel; `goal_id` and `category_id`
    must belong to `context["org_id"]`. `category_id` accepts one ID or a
    comma-separated list; dates are inclusive bounds.
    """

    entry_type = serializers.ChoiceField(
        choices=["all", *EntryType.values], required=False, default="all"
    )
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    category_id = IntListField(required=False)
    goal_id = serializers.IntegerField(required=False, min_value=1)
    tax_deductible = serializers.BooleanField(required=False, default=False)
    sort = serializers.ChoiceField(choices=["newest", "oldest"], required=False, default="newest")
    page = serializers.IntegerField(required=False, default=1, min_value=1)
    page_size = serializers.IntegerField(required=False, default=15, min_value=1, max_value=100)

    def validate(self, attrs: dict[str, object]) -> dict[str, object]:
        date_from = attrs.get("date_from")
        date_to = attrs.get("date_to")
        if isinstance(date_from, date) and isinstance(date_to, date) and date_from > date_to:
            raise serializers.ValidationError(
                {"date_to": ["date_to must not be earlier than date_from."]}
            )
        return attrs

    def validate_goal_id(self, goal_id: int) -> int:
        if not Goal.objects.filter(pk=goal_id, org_id=self.context.get("org_id")).exists():
            raise serializers.ValidationError(["Goal does not belong to this organization."])
        return goal_id

    def validate_category_id(self, category_ids: list[int]) -> list[int]:
        if Category.objects.filter(
            pk__in=category_ids, org_id=self.context.get("org_id")
        ).count() < len(set(category_ids)):
            raise serializers.ValidationError(["Category does not belong to this organization."])
        return category_ids


class TransactionUpdateSerializer(serializers.Serializer[Transaction]):
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), allow_null=True, required=False
    )
    description = serializers.CharField(
        max_length=1024, allow_blank=True, allow_null=True, required=False
    )
    amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal("0.01"),
        required=False,
    )
    transaction_date = serializers.DateField(required=False)
    is_tax_deductible = serializers.BooleanField(required=False)

    def validate(self, attrs: dict[str, object]) -> dict[str, object]:
        category = attrs.get("category_id")
        transaction = self.context["transaction"]

        if isinstance(category, Category) and category.type != transaction.entry_type:
            raise serializers.ValidationError(
                {"category_id": ("Category type must match transaction entry type.")}
            )
        return attrs

    def validate_category_id(self, category: Category | None) -> Category | None:
        org_id = self.context.get("org_id")

        if category is not None and category.org_id != org_id:
            raise serializers.ValidationError(["Category does not belong to this organization."])

        return category


# class CategoryCreateSerializer(serializers.Serializer[Category]):
#     name = serializers.CharField(
# 		max_length=50, allow_blank=False, allow_null=False, required=True
#     )
#     type = serializers.ChoiceField(
#         choices=CategoryType.choices,
#         allow_blank=False,
#         allow_null=False,
#         required=True,
#         error_messages={
#             "invalid_choice": "Invalid category type.",
#             "blank": "Category type may not be blank.",
#             "null": "Category type may not be null.",
#             "required": "Category type is required.",
#         },
#     )

#     def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
#         org = self.context["org"]

#         if Category.objects.filter(
#             org=org,
#             name=attrs["name"],
#             type=attrs["type"],
#         ).exists():
#             raise serializers.ValidationError(
#                 {"name": "This category already exists in this organization."}
#             )

#         return attrs


# class CategoryUpdateSerializer(serializers.Serializer[Category]):
#     name = serializers.CharField(
#       max_length=50, allow_blank=False, allow_null=False, required=False
#     )
#     type = serializers.ChoiceField(
#         choices=CategoryType.choices,
#         allow_blank=False,
#         allow_null=False,
#         required=False,
#         error_messages={
#             "invalid_choice": "Invalid category type.",
#             "blank": "Category type may not be blank.",
#             "null": "Category type may not be null.",
#         },
#     )

#     def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
#         category = self.context["category"]
#         name = attrs.get("name", category.name)
#         category_type = attrs.get("type", category.type)

#         if not attrs:
#             raise serializers.ValidationError("At least one field must be provided.")

#         if (
#             Category.objects.filter(
#                 org=category.org,
#                 name=name,
#                 type=category_type,
#             )
#             .exclude(pk=category.pk)
#             .exists()
#         ):
#             raise serializers.ValidationError(
#                 {"name": "This category already exists in this organization."}
#             )

#         return attrs


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
