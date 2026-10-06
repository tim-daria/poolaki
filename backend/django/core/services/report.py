from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from django.db.models import Q, QuerySet, Sum
from django.db.models.functions import Coalesce, ExtractMonth

from core.models import EntryType, Organization, Transaction

_ZERO = Decimal("0")
_TWO_PLACES = Decimal("0.01")

# response key -> EntryType value; order matches the documented contract
_METRICS = (
    ("income", EntryType.INCOME),
    ("expenses", EntryType.EXPENSE),
    ("contribution", EntryType.CONTRIBUTION),
)


def _quantize(value: Decimal | None) -> Decimal:
    return (value or _ZERO).quantize(_TWO_PLACES)


def _metric_sums() -> dict[str, Any]:
    return {
        key: Coalesce(Sum("amount", filter=Q(entry_type=entry_type)), _ZERO)
        for key, entry_type in _METRICS
    }


def _category_share(total: Decimal, type_total: Decimal) -> float:
    if type_total <= _ZERO:
        return 0.0
    share = (total * 100 / type_total).quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)
    return float(share)


def _metric_totals(base: QuerySet[Transaction]) -> dict[str, Decimal]:
    """Yearly income/expenses/contribution totals, quantized to 2 places."""
    sums = base.aggregate(**_metric_sums())
    return {key: _quantize(sums[key]) for key, _ in _METRICS}


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
            entry[key] = _quantize(row[key]) if row is not None else _ZERO
        monthly.append(entry)
    return monthly


def _monthly_totals_by_category(
    base: QuerySet[Transaction],
) -> dict[tuple[int | None, int], Decimal]:
    """(category_id, month) -> quantized total; category_id None is the uncategorized bucket."""
    rows = (
        base.annotate(month=ExtractMonth("transaction_date"))
        .values("category_id", "month")
        .annotate(total=Sum("amount"))
    )
    return {(row["category_id"], row["month"]): _quantize(row["total"]) for row in rows}


def _monthly_series(
    category_id: int | None, monthly_by_category: dict[tuple[int | None, int], Decimal]
) -> list[Decimal]:
    """12-slot zero-filled series for one category; index 0 is January."""
    return [monthly_by_category.get((category_id, month), _ZERO) for month in range(1, 13)]


def _category_breakdown(
    base: QuerySet[Transaction],
    totals: dict[str, Decimal],
    monthly_by_category: dict[tuple[int | None, int], Decimal],
) -> list[dict[str, Any]]:
    """Per-category rows with share_percent of the type total, sorted by total desc."""
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
            "total": _quantize(row["total"]),
            "monthly": _monthly_series(row["category_id"], monthly_by_category),
        }
        for row in categorized
    ]
    entries.extend(
        {
            "category_id": None,
            "name": "Uncategorized",
            "type": row["entry_type"],
            "total": _quantize(row["total"]),
            "monthly": _monthly_series(None, monthly_by_category),
        }
        for row in uncategorized
    )
    entries.sort(key=lambda entry: (-entry["total"], entry["type"], entry["name"]))

    # type totals equal the yearly metric totals: categorized + uncategorized
    # rows partition all transactions of that entry type
    type_totals = {entry_type: totals[key] for key, entry_type in _METRICS}
    return [
        {**entry, "share_percent": _category_share(entry["total"], type_totals[entry["type"]])}
        for entry in entries
    ]


def get_org_report(org: Organization, year: int) -> dict[str, Any]:
    """Build the yearly report payload; all money values are quantized Decimals."""
    base = Transaction.objects.filter(org=org, transaction_date__year=year)
    totals = _metric_totals(base)
    return {
        "year": year,
        "totals": totals,
        "monthly": _monthly_breakdown(base),
        "categories": _category_breakdown(base, totals, _monthly_totals_by_category(base)),
    }
