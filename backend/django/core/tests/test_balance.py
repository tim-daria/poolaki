from decimal import Decimal

import pytest

from core.models import Organization, Transaction
from core.services.balance import calculate_org_balance

pytestmark = pytest.mark.django_db


def test_calculate_org_balance_returns_initial_balance_without_transactions(
    personal_org: Organization,
) -> None:
    personal_org.initial_balance = Decimal("100.00")
    personal_org.save(update_fields=["initial_balance"])

    assert calculate_org_balance(personal_org) == Decimal("100.00")


def test_calculate_org_balance_applies_transaction_types(
    personal_org: Organization,
) -> None:
    personal_org.initial_balance = Decimal("100.00")
    personal_org.save(update_fields=["initial_balance"])
    Transaction.objects.create(
        org=personal_org,
        entry_type="income",
        amount=Decimal("25.50"),
        transaction_date="2026-08-24",
    )
    Transaction.objects.create(
        org=personal_org,
        entry_type="expense",
        amount=Decimal("10.25"),
        transaction_date="2026-08-24",
    )
    Transaction.objects.create(
        org=personal_org,
        entry_type="contribution",
        amount=Decimal("5.00"),
        transaction_date="2026-08-24",
    )

    assert calculate_org_balance(personal_org) == Decimal("110.25")


def test_calculate_org_balance_adds_negative_contribution(
    personal_org: Organization,
) -> None:
    personal_org.initial_balance = Decimal("100.00")
    personal_org.save(update_fields=["initial_balance"])
    Transaction.objects.create(
        org=personal_org,
        entry_type="contribution",
        amount=Decimal("15.00"),
        transaction_date="2026-08-24",
    )

    assert calculate_org_balance(personal_org) == Decimal("85.00")


def test_calculate_org_balance_ignores_other_organizations(
    personal_org: Organization,
) -> None:
    personal_org.initial_balance = Decimal("100.00")
    personal_org.save(update_fields=["initial_balance"])
    other_org = Organization.objects.create(name="Other budget", initial_balance=Decimal("0"))
    Transaction.objects.create(
        org=other_org,
        entry_type="income",
        amount=Decimal("500.00"),
        transaction_date="2026-08-24",
    )

    assert calculate_org_balance(personal_org) == Decimal("100.00")
