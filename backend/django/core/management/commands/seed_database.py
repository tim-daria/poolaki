# your_app/management/commands/seed_test_data.py

from decimal import Decimal
from datetime import date

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import Membership, Organization, Role, Category, CategoryType

from core.services.registration import create_personal_organization
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

            user_org = create_personal_organization(user)

            if user.username == "bob":
                bobs_org = user_org

            users[spec["username"]] = user

        # create one shared organization
        # current_count = Membership.objects.filter(user=user).count()
        shared_org_name = "Boardgame Club"
        user = "bob"

        membership = Membership.objects.filter(
            user=users["bob"],
            org__name=shared_org_name,
        ).first()

        if membership is None:
            shared_org = create_shared_organization(shared_org_name, 5000, users["bob"])
        else:
            shared_org = membership.org

        layout = {
            shared_org_name: [names[0], names[1], names[2], names[3], names[4]],
        }

        for index, username in enumerate(users):
            user = users[username]
            Membership.objects.update_or_create(
                org=shared_org,
                user=user,
                defaults={"role": Role.OWNER if index == 0 else Role.MEMBER},
            )

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

        # create transactions for the club
        # for item in data["transactions_club"]:
        #     user = users[item["username"]]
        
        #     category = Category.objects.get(
        #         org=org,
        #         name=item["category_name"],
        #     )
        
        #     create_transaction_entry(
        #         org=shared_org,
        #         created_by=user,
        #         category_id=category.pk,
        #         goal_id=None,
        #         entry_type=item["entry_type"],
        #         amount=item["amount"],
        #         description=item["description"],
        #         transaction_date=item["transaction_date"],
        #         is_tax_deductible=item["is_tax_deductible"],
        #     )

        self.stdout.write(self.style.SUCCESS("Test data is ready."))
        self.stdout.write(f"Shared organization: {shared_org.name}")
        self.stdout.write(f"Test password for newly created users: {test_password}")