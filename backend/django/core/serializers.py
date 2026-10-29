from datetime import date
from decimal import Decimal
from typing import Any, cast

from django.utils import timezone
from rest_framework import serializers

from core.models import (
    Category,
    CategoryType,
    EntryType,
    Goal,
    GoalStatus,
    Invitation,
    Membership,
    Notification,
    Organization,
    Transaction,
)
from core.services.balance import calculate_goal_balance, get_annotated_goal_balance
from core.services.goal import allowed_entry_types


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
    target_date = serializers.DateField(
        required=False,
        allow_null=True,
        default=None,
    )

    def validate(self, attrs: dict[str, object]) -> dict[str, object]:
        org_id = self.context.get("org_id")
        name = attrs["name"]

        if Goal.objects.filter(org_id=org_id, name=name).exists():
            raise serializers.ValidationError(
                {"name": "A goal with this name already exists in this workspace."}
            )

        target_date = cast(date | None, attrs["target_date"])
        if target_date is not None and target_date < date.today():
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
    target_date = serializers.DateField(required=False, allow_null=True)
    status = serializers.ChoiceField(choices=GoalStatus.choices, required=False)

    def validate(self, attrs: dict[str, object]) -> dict[str, object]:
        goal = self.context["goal"]

        if not attrs:
            raise serializers.ValidationError("At least one field must be provided.")
        if goal.status == GoalStatus.ARCHIVED:
            raise serializers.ValidationError("Archived goals cannot be updated.")

        name = attrs.get("name")
        if (
            name is not None
            and Goal.objects.filter(org_id=goal.org_id, name=name).exclude(pk=goal.pk).exists()
        ):
            raise serializers.ValidationError(
                {"name": "A goal with this name already exists in this workspace."}
            )

        target_date = cast(date | None, attrs.get("target_date"))
        if target_date is not None and target_date < date.today():
            raise serializers.ValidationError(
                {"target_date": "Target date must be today or in the future."}
            )

        return attrs


class GoalListQuerySerializer(serializers.Serializer[Goal]):
    """GET /organizations/{org_id}/goals/ query parameters."""

    status = serializers.ChoiceField(choices=GoalStatus.choices, required=False)


class GoalResponseSerializer(serializers.ModelSerializer[Goal]):
    org = serializers.IntegerField(source="org_id", read_only=True)
    created_by = serializers.CharField(
        source="created_by.username",
        allow_null=True,
        read_only=True,
    )
    balance = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    overdue = serializers.SerializerMethodField()
    spendable = serializers.SerializerMethodField()

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
            "completed_at",
            "balance",
            "progress",
            "overdue",
            "spendable",
        )

    def _get_goal_balance(self, goal: Goal) -> Decimal:
        return get_annotated_goal_balance(goal)

    def get_balance(self, goal: Goal) -> str:
        return str(self._get_goal_balance(goal))

    def get_progress(self, goal: Goal) -> str:
        progress = self._get_goal_balance(goal) / goal.target_amount
        return str(progress.quantize(Decimal("0.01")))

    def get_overdue(self, goal: Goal) -> bool:
        return goal.target_date is not None and date.today() > goal.target_date

    def get_spendable(self, goal: Goal) -> bool:
        return EntryType.EXPENSE in allowed_entry_types(goal)


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
        goal = attrs.get("goal_id")

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

        goal_entry_types = {EntryType.CONTRIBUTION, EntryType.WITHDRAW}
        if entry_type in goal_entry_types and goal is None:
            raise serializers.ValidationError(
                {"goal_id": ("A goal is required for this transaction type.")}
            )

        if isinstance(goal, Goal) and entry_type not in allowed_entry_types(goal):
            error_messages: dict[str, str] = {
                EntryType.INCOME: "Goal cannot be set on an income transaction.",
                EntryType.CONTRIBUTION: "Contributions can only be made to active goals.",
                EntryType.WITHDRAW: "Withdrawals can only be made from active goals.",
                EntryType.EXPENSE: (
                    "Expenses can only be made against completed or permanent goals."
                ),
            }
            raise serializers.ValidationError({"goal_id": (error_messages[str(entry_type)],)})

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

    `entry_type="all"` is the unfiltered sentinel; `goal_id`, `category_id` and
    `created_by` must belong to `context["org_id"]`. `category_id` and
    `created_by` accept one ID or a comma-separated list; dates are inclusive
    bounds.
    """

    entry_type = serializers.ChoiceField(
        choices=["all", *EntryType.values], required=False, default="all"
    )
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    category_id = IntListField(required=False)
    goal_id = serializers.IntegerField(required=False, min_value=1)
    tax_deductible = serializers.BooleanField(required=False, default=False)
    created_by = IntListField(required=False)
    q = serializers.CharField(required=False, allow_blank=True, max_length=100)
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

    def validate_created_by(self, user_ids: list[int]) -> list[int]:
        if Membership.objects.filter(
            user_id__in=user_ids, org_id=self.context.get("org_id")
        ).count() < len(set(user_ids)):
            raise serializers.ValidationError(["User is not a member of this organization."])
        return user_ids


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

        if "amount" in attrs and transaction.goal_id is not None:
            goal = self.context.get("goal") or transaction.goal
            current_balance = calculate_goal_balance(goal)
            old_signed_amount = (
                transaction.amount
                if transaction.entry_type == EntryType.CONTRIBUTION
                else -transaction.amount
            )
            new_amount = cast(Decimal, attrs["amount"])
            new_signed_amount = (
                new_amount if transaction.entry_type == EntryType.CONTRIBUTION else -new_amount
            )
            resulting_balance = current_balance - old_signed_amount + new_signed_amount

            if goal.status == GoalStatus.ARCHIVED and resulting_balance != Decimal("0"):
                raise serializers.ValidationError(
                    {
                        "amount": (
                            "Transactions associated with archived goals must keep the goal "
                            "balance at zero.",
                        )
                    }
                )
            if transaction.entry_type == EntryType.WITHDRAW and resulting_balance < Decimal("0"):
                raise serializers.ValidationError(
                    {"amount": ("Withdrawal amount cannot exceed the goal balance.",)}
                )
        return attrs

    def validate_category_id(self, category: Category | None) -> Category | None:
        org_id = self.context.get("org_id")

        if category is not None and category.org_id != org_id:
            raise serializers.ValidationError(["Category does not belong to this organization."])

        return category


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


class AiChatRequestSerializer(serializers.Serializer[dict[str, str]]):
    question = serializers.CharField(min_length=1, max_length=1000, trim_whitespace=True)


# Rows are capped at 14 digits by the model. A sum of them has no fixed
# width, so a sum declares only its scale: max_digits=None makes DRF
# quantize to two decimals without checking how many digits are in front.
class ReportAmountsSerializer(serializers.Serializer[dict[str, Any]]):
    income = serializers.DecimalField(max_digits=None, decimal_places=2)
    expense = serializers.DecimalField(max_digits=None, decimal_places=2)
    goals_balance = serializers.DecimalField(max_digits=None, decimal_places=2)


class ReportMonthlySerializer(serializers.Serializer[dict[str, Any]]):
    month = serializers.IntegerField()
    income = serializers.DecimalField(max_digits=None, decimal_places=2)
    expense = serializers.DecimalField(max_digits=None, decimal_places=2)
    goals_balance = serializers.DecimalField(max_digits=None, decimal_places=2)


class ReportCategorySerializer(serializers.Serializer[dict[str, Any]]):
    category_id = serializers.IntegerField()
    name = serializers.CharField()
    type = serializers.ChoiceField(choices=[CategoryType.INCOME, CategoryType.EXPENSE])
    total = serializers.DecimalField(max_digits=None, decimal_places=2)
    monthly = serializers.ListField(
        child=serializers.DecimalField(max_digits=None, decimal_places=2),
        min_length=12,
        max_length=12,
    )


class ReportGoalSerializer(serializers.Serializer[dict[str, Any]]):
    goal_id = serializers.IntegerField()
    name = serializers.CharField()
    status = serializers.ChoiceField(choices=GoalStatus.choices)
    target_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    balance = serializers.DecimalField(max_digits=None, decimal_places=2)
    monthly = serializers.ListField(
        child=serializers.DecimalField(max_digits=None, decimal_places=2),
        min_length=12,
        max_length=12,
    )


class ReportQuerySerializer(serializers.Serializer[dict[str, Any]]):
    year = serializers.IntegerField(required=False, min_value=1900, max_value=2099)


class ReportResponseSerializer(serializers.Serializer[dict[str, Any]]):
    year = serializers.IntegerField()
    totals = ReportAmountsSerializer()
    monthly = ReportMonthlySerializer(many=True)
    categories = ReportCategorySerializer(many=True)
    goal_balance = serializers.DecimalField(max_digits=None, decimal_places=2)
    goals = ReportGoalSerializer(many=True)


class OrganizationBalanceSerializer(serializers.Serializer[dict[str, Any]]):
    org_id = serializers.IntegerField()
    # A sum, like the report's: scale only, see the note above.
    balance = serializers.DecimalField(max_digits=None, decimal_places=2)


class AiQuerySerializer(serializers.Serializer[dict[str, Any]]):
    """Inside internal endpoints user and org arrive
    in the body (service-to-service convention), not in the session or URL."""

    user_id = serializers.IntegerField()
    organization_id = serializers.IntegerField()
    year = serializers.IntegerField(
        min_value=1900, max_value=2099, default=lambda: timezone.now().year
    )


class AiAnalyticsSummaryResponseSerializer(serializers.Serializer[dict[str, Any]]):
    year = serializers.IntegerField()
    balance = serializers.DecimalField(max_digits=None, decimal_places=2)
    totals = ReportAmountsSerializer()
    months = ReportMonthlySerializer(many=True)


class AiCategoriesResponseSerializer(serializers.Serializer[dict[str, Any]]):
    year = serializers.IntegerField()
    categories = ReportCategorySerializer(many=True)


class AiTransactionSerializer(serializers.Serializer[dict[str, Any]]):
    id = serializers.IntegerField()
    date = serializers.DateField()
    description = serializers.CharField(allow_null=True)
    entry_type = serializers.ChoiceField(choices=EntryType.choices)
    category = serializers.CharField(allow_null=True)
    goal = serializers.CharField(allow_null=True)
    amount = serializers.DecimalField(max_digits=None, decimal_places=2)


class AiTransactionsResponseSerializer(serializers.Serializer[dict[str, Any]]):
    transactions = AiTransactionSerializer(many=True)


"""Serialize API request and response payloads for the core application."""
