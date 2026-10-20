from decimal import Decimal
from typing import Any

from django.db.models import Q, QuerySet, Sum
from django.db.models.functions import Coalesce, ExtractMonth

from core.models import EntryType, Goal, GoalStatus, Organization, Transaction
from core.services.balance import annotate_goal_balance, get_annotated_goal_balance

_ZERO = Decimal("0")

_REPORTED_TYPES = (EntryType.INCOME, EntryType.EXPENSE)

# Goals that still hold spendable funds. Archived goals are settled (their
# balance is zeroed at archival), so they never contribute.
_REPORTED_GOAL_STATUSES = (GoalStatus.ACTIVE, GoalStatus.COMPLETED)

# category list order: type blocks in metric order, total desc within a block
_TYPE_ORDER = {entry_type.value: idx for idx, entry_type in enumerate(_REPORTED_TYPES)}


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


def _category_breakdown(base: QuerySet[Transaction]) -> list[dict[str, Any]]:
    """Per-category rows with a zero-filled 12-slot monthly series (index 0 =
    January); grouped by type, total desc. The yearly total is the sum of the
    monthly series, so the two cannot drift apart. Shares are client-side
    derivations.
    """
    rows = (
        base.annotate(month=ExtractMonth("transaction_date"))
        .values("category_id", "category__name", "category__type", "month")
        .annotate(total=Sum("amount"))
    )

    categories: dict[int, dict[str, Any]] = {}
    for row in rows:
        entry = categories.setdefault(
            row["category_id"],
            {
                "category_id": row["category_id"],
                "name": row["category__name"],
                "type": row["category__type"],
                "monthly": [_ZERO] * 12,
            },
        )
        entry["monthly"][row["month"] - 1] = row["total"]

    for entry in categories.values():
        entry["total"] = sum(entry["monthly"], _ZERO)

    return sorted(
        categories.values(),
        key=lambda entry: (_TYPE_ORDER[entry["type"]], -entry["total"], entry["name"]),
    )


def _goal_balance(org: Organization) -> Decimal:
    """Current balance across all active and completed goals (one aggregate
    query); a snapshot that ignores the reported year."""
    goals = annotate_goal_balance(Goal.objects.filter(org=org, status__in=_REPORTED_GOAL_STATUSES))
    return sum((get_annotated_goal_balance(goal) for goal in goals), _ZERO)


def get_org_report(org: Organization, year: int) -> dict[str, Any]:
    """Build the yearly report payload; every yearly section is computed only
    from the reported entry types (contribution rows are excluded by design),
    plus the current goal balance as a year-independent snapshot."""
    base = Transaction.objects.filter(
        org=org,
        transaction_date__year=year,
        entry_type__in=_REPORTED_TYPES,
    )
    return {
        "year": year,
        "totals": _metric_totals(base),
        "monthly": _monthly_breakdown(base),
        "categories": _category_breakdown(base),
        "goal_balance": _goal_balance(org),
    }
