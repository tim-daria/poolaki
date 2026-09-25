from datetime import date
from decimal import Decimal

from django.db import transaction

from core.models import Membership, NotificationType, Organization, Transaction, User
from core.services.organization import _notify_users


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
    # Creator is excluded; no notification in a personal budget
    # about new transaction.
    _notify_users(
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
