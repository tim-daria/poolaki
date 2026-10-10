# your_app/management/commands/seed_test_data.py

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import Membership, Organization, Role

from core.services.category import create_default_categories
from core.services.organization import create_shared_organization

from dotenv import load_dotenv

load_dotenv("/vault/agent/secrets/db-creds.env")

class Command(BaseCommand):
    help = "Create test users, personal organizations, and a shared organization."

    @transaction.atomic
    def handle(self, *args, **options):
        User = get_user_model()

        # Change this password for local testing. Do not use it in production.
        test_password = "LocalTest123!"

        # create users and personal organization

        names = ["alice", "bob", "carol", "tim", "ben", "susann", "heinz", "john", "maria", "elmo",
                "django", "elli", "walther", "sandra", "peter"
        ]
        
        user_specs = [
            {"username": names[0], "email": names[0] + "@example.test"},
            {"username": names[1], "email": names[1] + "@example.test"},
            {"username": names[2], "email": names[2] + "@example.test"},
            {"username": names[3], "email": names[3] + "@example.test"},
            {"username": names[4], "email": names[4] + "@example.test"},
            {"username": names[5], "email": names[5] + "@example.test"},
            {"username": names[6], "email": names[6] + "@example.test"},
            {"username": names[7], "email": names[7] + "@example.test"},
            {"username": names[8], "email": names[8] + "@example.test"},
            {"username": names[9], "email": names[9] + "@example.test"},
            {"username": names[10], "email": names[10] + "@example.test"},
            {"username": names[11], "email": names[11] + "@example.test"},
            {"username": names[12], "email": names[12] + "@example.test"},
            {"username": names[13], "email": names[13] + "@example.test"},
            {"username": names[14], "email": names[14] + "@example.test"},
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

        # create shared organizations

        # orgs = {}
        # for org_name in ["Sportsclub", "Family", "my-tiny-business", "MAX-MEMBER"]:
        #     org, _ = Organization.objects.get_or_create(
        #         name=org_name,
        #         is_personal=False,
        #         defaults={"initial_balance": 5000},
        #     )
        #     orgs[org_name] = org

        create_shared_organization("Sportsclub", 3000, names[0])

        # First user in each list becomes the owner, the rest are members.
        layout = {
            "Sportsclub": [names[0], names[1], names[2], names[3], names[4], names[5]],
            "Family": [names[3], names[4], names[5], names[6], names[7]],
            "my-tiny-business": [names[10], names[11], names[12]],
            "MAX-MEMBER": [names[0], names[1], names[2], names[3], names[4], names[5], names[6], names[7], names[8], names[9]]
        }

        for org_name, member_usernames in layout.items():
            org = orgs[org_name]
            for index, username in enumerate(member_usernames):
                user = users[username]
                Membership.objects.update_or_create(
                    org=org,
                    user=user,
                    defaults={"role": Role.OWNER if index == 0 else Role.MEMBER},
                )
            # create_default_categories(org)

        # create transactions

        transactions = [
            "rent", "groceries", "public transport", "cinema", "car repair", "new monitor",
            "new phone", "insurance", "gas", "electric bill", "pizza place", "cat food",
            "dentist bill", "doctors bill", "juice", "wine",
        ]

        # for expense in transaction.items():
            

        self.stdout.write(self.style.SUCCESS("Test data is ready."))
        self.stdout.write(f"Shared organization: {org.name}")
        self.stdout.write(f"Test password for newly created users: {test_password}")