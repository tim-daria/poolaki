from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from django.db import transaction
from django.db.models.query import QuerySet

from core.models import (
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
    category_id: int | None = None
    goal_id: int | None = None
    tax_deductible: bool = False
    entry_type: str | None = None
    sort: str = "newest"


def build_transaction_queryset(org_id: int, filters: TransactionFilters) -> QuerySet[Transaction]:
    """The list query with all given filters applied; ordering is last."""
    qs = Transaction.objects.filter(org_id=org_id).select_related("category", "created_by", "goal")
    if filters.date_from is not None:
        qs = qs.filter(transaction_date__gte=filters.date_from)
    if filters.date_to is not None:
        qs = qs.filter(transaction_date__lte=filters.date_to)
    if filters.category_id is not None:
        qs = qs.filter(category_id=filters.category_id)
    if filters.goal_id is not None:
        qs = qs.filter(goal_id=filters.goal_id)
    if filters.tax_deductible:
        qs = qs.filter(is_tax_deductible=True)
    if filters.entry_type is not None:
        qs = qs.filter(entry_type=filters.entry_type)
    if filters.sort == "oldest":
        return qs.order_by("transaction_date", "id")
    # id breaks ties within a day; newest first is the page default.
    return qs.order_by("-transaction_date", "-id")


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
