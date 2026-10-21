from decimal import Decimal
from typing import Any

from django.db.models import Q, QuerySet, Sum
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
from core.services.balance import annotate_goal_balance, get_annotated_goal_balance

_ZERO = Decimal("0")

_REPORTED_TYPES = (EntryType.INCOME, EntryType.EXPENSE)

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


def _metric_sums() -> dict[str, Any]:
    return {
        entry_type.value: Coalesce(Sum("amount", filter=Q(entry_type=entry_type)), _ZERO)
        for entry_type in _REPORTED_TYPES
    }


def _metric_totals(base: QuerySet[Transaction]) -> dict[str, Decimal]:
    """Yearly income/expense totals."""
    return base.aggregate(**_metric_sums())


def _monthly_breakdown(base: QuerySet[Transaction]) -> list[dict[str, Any]]:
    """12 rows (month 1-12) with per-metric sums; empty months are zero-filled."""
    monthly_rows = (
        base.annotate(month=ExtractMonth("transaction_date"))
        .values("month")
        .annotate(**_metric_sums())
        .order_by("month")
    )
    rows_by_month = {row["month"]: row for row in monthly_rows}
    monthly = []
    for month in range(1, 13):
        row = rows_by_month.get(month)
        entry: dict[str, Any] = {"month": month}
        for entry_type in _REPORTED_TYPES:
            key = entry_type.value
            entry[key] = row[key] if row is not None else _ZERO
        monthly.append(entry)
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
    monthly_by_category = _monthly_by_category(_reported_transactions(org, year))

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


def _goal_balance(org: Organization) -> Decimal:
    """Current balance across all active and completed goals (one aggregate
    query); a snapshot that ignores the reported year."""
    goals = annotate_goal_balance(Goal.objects.filter(org=org, status__in=_REPORTED_GOAL_STATUSES))
    return sum((get_annotated_goal_balance(goal) for goal in goals), _ZERO)


def get_org_report(org: Organization, year: int) -> dict[str, Any]:
    """Build the yearly report payload; every section is computed only from
    the reported entry types (contribution rows are excluded by design),
    plus the current goal balance as a year-independent snapshot."""
    base = _reported_transactions(org, year)
    return {
        "year": year,
        "totals": _metric_totals(base),
        "monthly": _monthly_breakdown(base),
        "categories": get_org_category_breakdown(org, year),
        "goal_balance": _goal_balance(org),
    }
