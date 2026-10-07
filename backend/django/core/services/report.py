from decimal import Decimal
from typing import Any

from django.db.models import Q, QuerySet, Sum
from django.db.models.functions import Coalesce, ExtractMonth

from core.models import EntryType, Organization, Transaction

_ZERO = Decimal("0")

# Contributions are out of the report until the planned `withdraw` entry
# type exists: savings metrics only make sense net of withdrawals, so
# contribution and withdraw must be designed together. Any entry type not
# listed here is ignored by every report section.
_METRICS = (
    ("income", EntryType.INCOME),
    ("expenses", EntryType.EXPENSE),
)

# category list order: type blocks in metric order, total desc within a block
_TYPE_ORDER = {entry_type: idx for idx, (_, entry_type) in enumerate(_METRICS)}


def _metric_sums() -> dict[str, Any]:
    return {
        key: Coalesce(Sum("amount", filter=Q(entry_type=entry_type)), _ZERO)
        for key, entry_type in _METRICS
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
        for key, _ in _METRICS:
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


def get_org_report(org: Organization, year: int) -> dict[str, Any]:
    """Build the yearly report payload; every section is computed only from
    the reported entry types (contribution rows are excluded by design)."""
    base = Transaction.objects.filter(
        org=org,
        transaction_date__year=year,
        entry_type__in=[entry_type for _, entry_type in _METRICS],
    )
    return {
        "year": year,
        "totals": _metric_totals(base),
        "monthly": _monthly_breakdown(base),
        "categories": _category_breakdown(base),
    }
