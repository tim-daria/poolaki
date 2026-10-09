from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Literal

from django.core.paginator import EmptyPage, Paginator
from django.db import transaction
from django.db.models import Count, Q
from django.db.models.query import QuerySet

from core.models import (
    EntryType,
    Membership,
    NotificationType,
    Organization,
    Transaction,
    User,
)
from core.services.notification import notify_users


@dataclass(frozen=True)
class TransactionFilters:
    """Resolved list query parameters; `entry_type=None` is the "all" tab."""

    date_from: date | None = None
    date_to: date | None = None
    category_ids: tuple[int, ...] | None = None
    goal_id: int | None = None
    tax_deductible: bool = False
    q: str = ""
    entry_type: EntryType | None = None
    sort: Literal["newest", "oldest"] = "newest"


@dataclass(frozen=True)
class TransactionPage:
    """One list page; `counts` span all tabs, `rows` and `total` respect the selected one."""

    rows: list[Transaction]
    total: int
    page: int
    page_size: int
    page_count: int
    counts: dict[str, int]


def build_transaction_queryset(org_id: int, filters: TransactionFilters) -> QuerySet[Transaction]:
    """All filters except entry_type (the tab), with ordering applied last."""
    qs = Transaction.objects.filter(org_id=org_id).select_related("category", "created_by", "goal")
    if filters.date_from is not None:
        qs = qs.filter(transaction_date__gte=filters.date_from)
    if filters.date_to is not None:
        qs = qs.filter(transaction_date__lte=filters.date_to)
    if filters.category_ids:
        qs = qs.filter(category_id__in=filters.category_ids)
    if filters.goal_id is not None:
        qs = qs.filter(goal_id=filters.goal_id)
    if filters.tax_deductible:
        qs = qs.filter(is_tax_deductible=True)
    if filters.q:
        qs = qs.filter(
          Q(description__icontains=filters.q) | Q(category__name__icontains=filters.q)
        )
    if filters.sort == "oldest":
        return qs.order_by("transaction_date", "id")
    # id breaks ties within a day; newest first is the page default.
    return qs.order_by("-transaction_date", "-id")


def list_transactions(
    org_id: int, filters: TransactionFilters, page: int, page_size: int
) -> TransactionPage:
    """The entry-type tab filters the table only; tab counts ignore it."""
    base = build_transaction_queryset(org_id, filters)
    counts = count_by_entry_type(base)
    listed = base if filters.entry_type is None else base.filter(entry_type=filters.entry_type)
    paginator = Paginator(listed, page_size)
    try:
        page_obj = paginator.page(page)
    except EmptyPage:
        # A page past the last one is an empty page, not an error (API contract).
        return TransactionPage([], paginator.count, page, page_size, paginator.num_pages, counts)
    return TransactionPage(
        list(page_obj.object_list),
        paginator.count,
        page,
        page_size,
        paginator.num_pages,
        counts,
    )


def count_by_entry_type(qs: QuerySet[Transaction]) -> dict[str, int]:
    """Per-tab counts; run on the queryset without the entry_type filter."""
    counts: dict[str, int] = dict.fromkeys(EntryType.values, 0)
    counts.update(qs.order_by().values_list("entry_type").annotate(Count("id")))
    counts["all"] = sum(counts.values())
    return counts


@transaction.atomic
def create_transaction_entry(
    *,
    org: Organization,
    created_by: User,
    category_id: int | None,
    goal_id: int | None,
    entry_type: str,
    amount: Decimal,
    description: str | None,
    transaction_date: date,
    is_tax_deductible: bool,
) -> Transaction:
    org = Organization.objects.select_for_update().get(pk=org.pk)
    txn = Transaction.objects.create(
        org=org,
        created_by=created_by,
        category_id=category_id,
        goal_id=goal_id,
        entry_type=entry_type,
        amount=amount,
        description=description,
        transaction_date=transaction_date,
        is_tax_deductible=is_tax_deductible,
    )
    # A personal budget has a single member, so no notifications about new transaction.
    notify_users(
        list(
            Membership.objects.filter(org=org)
            .exclude(user=created_by)
            .values_list("user_id", flat=True)
        ),
        NotificationType.TRANSACTION_ADDED,
        {
            "org_name": org.name,
            "added_by": created_by.username,
            "transaction_id": txn.id,
            "amount": str(txn.amount),
            "entry_type": txn.entry_type,
        },
        org=org,
    )
    return txn
