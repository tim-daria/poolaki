# your_app/management/commands/seed_test_data.py

from decimal import Decimal
from datetime import date

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import Membership, Organization, Role, Category, CategoryType

from core.services.category import create_default_categories
from core.services.organization import create_shared_organization
from core.services.transaction import create_transaction_entry

from dotenv import load_dotenv
from pathlib import Path
import json

load_dotenv("/vault/agent/secrets/db-creds.env")

class Command(BaseCommand):
    help = "Create test users, personal organizations, and a shared organization."

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()

        # Change this password for local testing.
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
            else:
                self.stdout.write(f"User already exists: {user.email}")

            users[spec["username"]] = user

            personal_org, _ = Organization.objects.get_or_create(
                name=f"{spec['username'].capitalize()}'s Personal Organization",
                defaults={
                    "initial_balance": Decimal("1337.42"),
                    "is_personal": True,
                },
            )

            if created:
                create_default_categories(personal_org)

            Membership.objects.get_or_create(
                org=personal_org,
                user=user,
                defaults={"role": Role.OWNER},
            )

        # create one shared organization
        org = create_shared_organization("Boardgame Club", 5000, users["elmo"])

        layout = {
            "Boardgame Club": [names[0], names[1], names[2], names[3], names[4]],
        }

        for index, username in enumerate(users):
            user = users[username]
            Membership.objects.update_or_create(
                org=org,
                user=user,
                defaults={"role": Role.OWNER if index == 0 else Role.MEMBER},
            )

        json_path = Path(__file__).resolve().with_name("database_testdata.json")

        with json_path.open("r", encoding="utf=8") as file:
            data = json.load(file)

        # create transactions
        for item in data["transactions"]:
            user = users[item["username"]]
        
            category = Category.objects.get(
                org=org,
                name=item["category_name"],
            )
        
            create_transaction_entry(
                org=org,
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
        self.stdout.write(f"Shared organization: {org.name}")
        self.stdout.write(f"Test password for newly created users: {test_password}")