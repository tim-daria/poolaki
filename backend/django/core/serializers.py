from datetime import date
from decimal import Decimal
from typing import Any

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

        # Income/expense must always be categorized: the report partitions
        # totals per category and has no "uncategorized" bucket.
        if entry_type in (EntryType.INCOME, EntryType.EXPENSE) and category is None:
            raise serializers.ValidationError(
                {"category_id": ("A category is required for income and expense transactions.")}
            )

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

        # An explicit null clears the category; income/expense must keep theirs.
        if (
            "category_id" in attrs
            and category is None
            and transaction.entry_type in (EntryType.INCOME, EntryType.EXPENSE)
        ):
            raise serializers.ValidationError(
                {"category_id": ("Income and expense transactions cannot be uncategorized.")}
            )

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


class ReportAmountsSerializer(serializers.Serializer[dict[str, Any]]):
    income = serializers.DecimalField(max_digits=14, decimal_places=2)
    expense = serializers.DecimalField(max_digits=14, decimal_places=2)


class ReportMonthlySerializer(serializers.Serializer[dict[str, Any]]):
    month = serializers.IntegerField()
    income = serializers.DecimalField(max_digits=14, decimal_places=2)
    expense = serializers.DecimalField(max_digits=14, decimal_places=2)


class ReportCategorySerializer(serializers.Serializer[dict[str, Any]]):
    category_id = serializers.IntegerField()
    name = serializers.CharField()
    # Contribution rows are excluded from the report for now
    type = serializers.ChoiceField(choices=[CategoryType.INCOME, CategoryType.EXPENSE])
    total = serializers.DecimalField(max_digits=14, decimal_places=2)
    monthly = serializers.ListField(
        child=serializers.DecimalField(max_digits=14, decimal_places=2),
        min_length=12,
        max_length=12,
    )


class ReportQuerySerializer(serializers.Serializer[dict[str, Any]]):
    year = serializers.IntegerField(required=False, min_value=2000, max_value=2100)


class ReportResponseSerializer(serializers.Serializer[dict[str, Any]]):
    year = serializers.IntegerField()
    totals = ReportAmountsSerializer()
    monthly = ReportMonthlySerializer(many=True)
    categories = ReportCategorySerializer(many=True)
