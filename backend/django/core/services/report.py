from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from django.db.models import Q, Sum
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


def get_org_report(org: Organization, year: int) -> dict[str, Any]:
    """Build the yearly report payload; all money values are quantized Decimals."""
    base = Transaction.objects.filter(org=org, transaction_date__year=year)

    totals = base.aggregate(**_metric_sums())

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

    # Python sort below is authoritative; no DB ordering needed
    categorized = (
        base.filter(category__isnull=False)
        .values("category_id", "category__name", "category__type")
        .annotate(total=Sum("amount"))
    )
    uncategorized = (
        base.filter(category__isnull=True).values("entry_type").annotate(total=Sum("amount"))
    )

    entries = [
        {
            "category_id": row["category_id"],
            "name": row["category__name"],
            "type": row["category__type"],
            "total": _quantize(row["total"]),
        }
        for row in categorized
    ]
    entries.extend(
        {
            "category_id": None,
            "name": "Uncategorized",
            "type": row["entry_type"],
            "total": _quantize(row["total"]),
        }
        for row in uncategorized
    )
    entries.sort(key=lambda entry: (-entry["total"], entry["type"], entry["name"]))

    # type totals equal the yearly metric totals: categorized + uncategorized
    # rows partition all transactions of that entry type
    type_totals = {entry_type: totals[key] for key, entry_type in _METRICS}
    categories = [
        {**entry, "share_percent": _category_share(entry["total"], type_totals[entry["type"]])}
        for entry in entries
    ]

    return {
        "year": year,
        "totals": {key: _quantize(totals[key]) for key, _ in _METRICS},
        "monthly": monthly,
        "categories": categories,
    }
