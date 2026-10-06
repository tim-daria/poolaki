from decimal import Decimal
from typing import Any

from django.db.models import Q, QuerySet, Sum
from django.db.models.functions import Coalesce, ExtractMonth

from core.models import EntryType, Organization, Transaction

_ZERO = Decimal("0")

# response key -> EntryType value; order matches the documented contract
_METRICS = (
    ("income", EntryType.INCOME),
    ("expenses", EntryType.EXPENSE),
    ("contribution", EntryType.CONTRIBUTION),
)

# category list order: type blocks in metric order, total desc within a block
_TYPE_ORDER = {entry_type: idx for idx, (_, entry_type) in enumerate(_METRICS)}


def _metric_sums() -> dict[str, Any]:
    return {
        key: Coalesce(Sum("amount", filter=Q(entry_type=entry_type)), _ZERO)
        for key, entry_type in _METRICS
    }


def _metric_totals(base: QuerySet[Transaction]) -> dict[str, Decimal]:
    """Yearly income/expenses/contribution totals."""
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


def _monthly_totals_by_category(
    base: QuerySet[Transaction],
) -> dict[tuple[int | None, int], Decimal]:
    """(category_id, month) -> total; category_id None is the uncategorized bucket."""
    rows = (
        base.annotate(month=ExtractMonth("transaction_date"))
        .values("category_id", "month")
        .annotate(total=Sum("amount"))
    )
    return {(row["category_id"], row["month"]): row["total"] for row in rows}


def _category_breakdown(
    base: QuerySet[Transaction], monthly_by_category: dict[tuple[int | None, int], Decimal]
) -> list[dict[str, Any]]:
    """Per-category rows with a zero-filled 12-slot monthly series (index 0 =
    January); grouped by type, total desc. Shares are client-side derivations.
    """
    # Python sort below is authoritative; no DB ordering needed
    categorized = (
        base.filter(category__isnull=False)
        .values("category_id", "category__name", "category__type")
        .annotate(total=Sum("amount"))
    )
    uncategorized = (
        base.filter(category__isnull=True).values("entry_type").annotate(total=Sum("amount"))
    )

    entries: list[dict[str, Any]] = [
        {
            "category_id": row["category_id"],
            "name": row["category__name"],
            "type": row["category__type"],
            "total": row["total"],
            "monthly": [
                monthly_by_category.get((row["category_id"], m), _ZERO) for m in range(1, 13)
            ],
        }
        for row in categorized
    ]
    entries.extend(
        {
            "category_id": None,
            "name": "Uncategorized",
            "type": row["entry_type"],
            "total": row["total"],
            "monthly": [monthly_by_category.get((None, m), _ZERO) for m in range(1, 13)],
        }
        for row in uncategorized
    )
    entries.sort(key=lambda entry: (_TYPE_ORDER[entry["type"]], -entry["total"], entry["name"]))
    return entries


def get_org_report(org: Organization, year: int) -> dict[str, Any]:
    """Build the yearly report payload"""
    base = Transaction.objects.filter(org=org, transaction_date__year=year)
    totals = _metric_totals(base)
    return {
        "year": year,
        "totals": totals,
        "monthly": _monthly_breakdown(base),
        "categories": _category_breakdown(base, _monthly_totals_by_category(base)),
    }
