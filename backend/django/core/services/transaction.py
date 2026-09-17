from datetime import date
from decimal import Decimal

from django.db import transaction

from core.models import Organization, Transaction, User


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
    return Transaction.objects.create(
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
