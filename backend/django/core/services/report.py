"""Aggregate yearly organization finances, categories, and goal snapshots."""

from datetime import date
from decimal import Decimal
from typing import Any

from django.db.models import Case, DecimalField, F, Q, QuerySet, Sum, When
from django.db.models.functions import Coalesce, ExtractMonth

from core.models import (
    Category,
    CategoryType,
    EntryType,
    Goal,
    GoalStatus,
    Organization,
    Transaction,
)
from core.services.balance import annotate_goal_balance

_ZERO = Decimal("0")

_REPORTED_TYPES = (
    EntryType.INCOME,
    EntryType.EXPENSE,
    EntryType.CONTRIBUTION,
    EntryType.WITHDRAW,
)
_CATEGORY_TYPES = (EntryType.INCOME, EntryType.EXPENSE)

# Goals that still hold spendable funds. Archived goals are settled (their
# balance is zeroed at archival), so they never contribute.
_REPORTED_GOAL_STATUSES = (GoalStatus.ACTIVE, GoalStatus.COMPLETED)

# category list order: type blocks in metric order, total desc within a block
_TYPE_ORDER = {entry_type.value: idx for idx, entry_type in enumerate(_REPORTED_TYPES)}


def _reported_transactions(org: Organization, year: int) -> QuerySet[Transaction]:
    """The one year filter every report section shares, so totals and
    categories can never disagree about which transactions count."""
    return Transaction.objects.filter(
        org=org,
        transaction_date__year=year,
        entry_type__in=_REPORTED_TYPES,
    )


def _metric_totals(base: QuerySet[Transaction]) -> dict[str, Decimal]:
    """Yearly income, expense, and net goal transfer totals."""
    return base.aggregate(
        income=Coalesce(Sum("amount", filter=Q(entry_type=EntryType.INCOME)), _ZERO),
        expense=Coalesce(Sum("amount", filter=Q(entry_type=EntryType.EXPENSE)), _ZERO),
        goals_balance=Coalesce(Sum(_goal_balance_expression()), _ZERO),
    )


def _monthly_breakdown(base: QuerySet[Transaction]) -> list[dict[str, Any]]:
    """12 rows with income, expense, and net goal transfer sums."""
    monthly_rows = (
        base.annotate(month=ExtractMonth("transaction_date"))
        .values("month")
        .annotate(
            income=Coalesce(Sum("amount", filter=Q(entry_type=EntryType.INCOME)), _ZERO),
            expense=Coalesce(Sum("amount", filter=Q(entry_type=EntryType.EXPENSE)), _ZERO),
            goals_balance=Coalesce(Sum(_goal_balance_expression()), _ZERO),
        )
        .order_by("month")
    )
    rows_by_month = {row["month"]: row for row in monthly_rows}
    monthly = []
    for month in range(1, 13):
        row = rows_by_month.get(month)
        monthly.append(
            {
                "month": month,
                "income": row["income"] if row is not None else _ZERO,
                "expense": row["expense"] if row is not None else _ZERO,
                "goals_balance": row["goals_balance"] if row is not None else _ZERO,
            }
        )
    return monthly


def _monthly_by_category(base: QuerySet[Transaction]) -> dict[int, list[Decimal]]:
    """Per-category 12-slot monthly series (index 0 = January), zero-filled;
    categories without rows are absent, so callers zero-fill them themselves."""
    rows = (
        base.annotate(month=ExtractMonth("transaction_date"))
        .values("category_id", "month")
        .annotate(total=Sum("amount"))
    )

    by_category: dict[int, list[Decimal]] = {}
    for row in rows:
        by_category.setdefault(row["category_id"], [_ZERO] * 12)[row["month"] - 1] = row["total"]
    return by_category


def get_org_category_breakdown(
    org: Organization, year: int, include_inactive: bool = False
) -> list[dict[str, Any]]:
    """Per-category rows with a zero-filled 12-slot monthly series for `year`
    (index 0 = January), shared by the yearly report and the AI service.
    Ordered: income block first, then expense; within a type by total desc,
    then name. The yearly total is the sum of the monthly series, so the two
    cannot drift apart. By default only categories with transactions in the
    year appear; with `include_inactive` every org income/expense category is
    returned, zero-filled when it has no activity, so the AI service can
    distinguish "no spending" from "the category does not exist". Contribution
    categories are excluded by design (shared report/AI rule).
    """
    category_transactions = _reported_transactions(org, year).filter(entry_type__in=_CATEGORY_TYPES)
    monthly_by_category = _monthly_by_category(category_transactions)

    if include_inactive:
        categories = Category.objects.filter(
            org=org, type__in=(CategoryType.INCOME, CategoryType.EXPENSE)
        )
    else:
        categories = Category.objects.filter(pk__in=monthly_by_category)

    entries = []
    for category in categories:
        monthly = monthly_by_category.get(category.pk, [_ZERO] * 12)
        entries.append(
            {
                "category_id": category.pk,
                "name": category.name,
                "type": category.type,
                "total": sum(monthly, _ZERO),
                "monthly": monthly,
            }
        )

    return sorted(
        entries,
        key=lambda entry: (_TYPE_ORDER[entry["type"]], -entry["total"], entry["name"]),
    )


def _goal_balance_expression(amount_field: str = "amount") -> Case:
    return Case(
        When(entry_type=EntryType.CONTRIBUTION, then=F(amount_field)),
        When(entry_type=EntryType.WITHDRAW, then=-F(amount_field)),
        default=_ZERO,
        output_field=DecimalField(max_digits=14, decimal_places=2),
    )


def _reported_goals(org: Organization) -> list[Goal]:
    goals = Goal.objects.filter(org=org, status__in=_REPORTED_GOAL_STATUSES)
    return list(annotate_goal_balance(goals))


def _goal_report(org: Organization, year: int, goals: list[Goal]) -> list[dict[str, Any]]:
    """Return selected-year balances and monthly contribution-withdrawal changes."""
    start = date(year, 1, 1)
    end = date(year + 1, 1, 1)
    goal_transactions = Transaction.objects.filter(
        org=org,
        goal__in=goals,
        entry_type__in=(EntryType.CONTRIBUTION, EntryType.WITHDRAW),
    )
    current_rows = (
        goal_transactions.filter(transaction_date__gte=start, transaction_date__lt=end)
        .values("goal_id")
        .annotate(balance=Sum(_goal_balance_expression()))
    )
    current = {row["goal_id"]: row["balance"] or _ZERO for row in current_rows}
    monthly_rows = (
        goal_transactions.filter(transaction_date__gte=start, transaction_date__lt=end)
        .annotate(month=ExtractMonth("transaction_date"))
        .values("goal_id", "month")
        .annotate(balance=Sum(_goal_balance_expression()))
    )
    monthly = {(row["goal_id"], row["month"]): row["balance"] or _ZERO for row in monthly_rows}

    result = []
    for goal in goals:
        monthly_balances = [monthly.get((goal.pk, month), _ZERO) for month in range(1, 13)]
        result.append(
            {
                "goal_id": goal.pk,
                "name": goal.name,
                "status": goal.status,
                "target_amount": goal.target_amount,
                "balance": current.get(goal.pk, _ZERO),
                "monthly": monthly_balances,
            }
        )
    return result


def _goal_balance(org: Organization, year: int, goals: list[Goal]) -> Decimal:
    """Selected-year balance across all active and completed goals."""
    total = Transaction.objects.filter(
        org=org,
        goal__in=goals,
        transaction_date__year=year,
        entry_type__in=(EntryType.CONTRIBUTION, EntryType.WITHDRAW),
    ).aggregate(balance=Sum(_goal_balance_expression()))["balance"]
    return total or _ZERO


def get_org_report(org: Organization, year: int) -> dict[str, Any]:
    """Build the yearly report payload and goal snapshots."""
    base = _reported_transactions(org, year)
    goals = _reported_goals(org)
    return {
        "year": year,
        "totals": _metric_totals(base),
        "monthly": _monthly_breakdown(base),
        "categories": get_org_category_breakdown(org, year),
        "goal_balance": _goal_balance(org, year, goals),
        "goals": _goal_report(org, year, goals),
    }
