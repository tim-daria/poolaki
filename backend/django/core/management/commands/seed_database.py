# your_app/management/commands/seed_test_data.py

import json
from decimal import Decimal
from pathlib import Path
from typing import Any

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from dotenv import load_dotenv

from core.models import Category, Membership, Organization, Role
from core.services.organization import create_shared_organization
from core.services.registration import create_personal_organization
from core.services.transaction import create_transaction_entry

load_dotenv("/vault/agent/secrets/db-creds.env")


class Command(BaseCommand):
    help = "Create test users, personal organizations, a shared organization and some transactions."

    @transaction.atomic
    def handle(self, *args: Any, **options: Any) -> None:
        User = get_user_model()

        # password for testing.
        test_password = "LocalTest123!"

        # create users and personal organization
        names = ["bob", "john", "maria", "elmo", "walther"]

        user_specs = [
            {"username": names[0], "email": names[0] + "@example.test"},
            {"username": names[1], "email": names[1] + "@example.test"},
            {"username": names[2], "email": names[2] + "@example.test"},
            {"username": names[3], "email": names[3] + "@example.test"},
            {"username": names[4], "email": names[4] + "@example.test"},
        ]

        users = {}

        for spec in user_specs:
            user, created = User.objects.get_or_create(
                email=spec["email"],
                defaults={
                    "username": spec["username"],
                    "is_active": True,
                },
            )

            if created:
                user.set_password(test_password)
                user.save(update_fields=["password"])
                self.stdout.write(f"Created user: {user.email}")
                user_org = create_personal_organization(user)
            else:
                self.stdout.write(f"User already exists: {user.email}")
                user_org = Organization.objects.get(
                    memberships__user=user,
                    is_personal=True,
                )

            if user.username == "bob":
                bobs_org = user_org

            users[spec["username"]] = user

        # create a shared organization
        shared_org_name = "Boardgame Club"

        membership = Membership.objects.filter(
            user=users["bob"],
            org__name=shared_org_name,
        ).first()

        if membership is None:
            shared_org = create_shared_organization(
                shared_org_name, Decimal("200.00"), users["bob"]
            )
        else:
            shared_org = membership.org

        for index, username in enumerate(users):
            user = users[username]
            Membership.objects.update_or_create(
                org=shared_org,
                user=user,
                defaults={"role": Role.OWNER if index == 0 else Role.MEMBER},
            )

        # read testdata file
        json_path = Path(__file__).resolve().with_name("database_testdata.json")

        with json_path.open("r", encoding="utf-8") as file:
            data = json.load(file)

        # create transactions for bob
        for item in data["transactions_bob"]:
            user = users[item["username"]]

            category = Category.objects.get(
                org=bobs_org,
                name=item["category_name"],
            )

            create_transaction_entry(
                org=bobs_org,
                created_by=user,
                category_id=category.pk,
                goal_id=None,
                entry_type=item["entry_type"],
                amount=item["amount"],
                description=item["description"],
                transaction_date=item["transaction_date"],
                is_tax_deductible=item["is_tax_deductible"],
            )

        # create transactions for shared organization
        for item in data["transactions_club"]:
            user = users[item["username"]]

            category = Category.objects.get(
                org=shared_org,
                name=item["category_name"],
            )

            create_transaction_entry(
                org=shared_org,
                created_by=user,
                category_id=category.pk,
                goal_id=None,
                entry_type=item["entry_type"],
                amount=item["amount"],
                description=item["description"],
                transaction_date=item["transaction_date"],
                is_tax_deductible=item["is_tax_deductible"],
            )

        self.stdout.write(self.style.SUCCESS("Test data is ready."))
        self.stdout.write(f"Shared organization: {shared_org.name}")
        self.stdout.write(f"Test password for newly created users: {test_password}")
