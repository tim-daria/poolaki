"""Seeds the categories and goals the transaction form offers, for one workspace.

IDs match SEED_CATEGORIES in frontend/src/lib/categories.ts and SEED_GOALS in
frontend/src/lib/goals.ts, which is what the form posts. Goes through the ORM,
so a database whose schema drifted from these models fails loudly.

Usage:
  docker compose exec -T backend python manage.py seed_transaction_fixtures <org_id> [--dry-run]
"""

from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import connection, transaction

from core.models import Category, Goal, Organization

# (id, name, type)
CATEGORIES = [
    (1, "Groceries", "expense"),
    (2, "Eating out", "expense"),
    (3, "Shopping", "expense"),
    (4, "Transport", "expense"),
    (5, "Housing", "expense"),
    (6, "Health", "expense"),
    (7, "Other", "expense"),
    (8, "Salary", "income"),
    (9, "Gift", "income"),
    (10, "Other income", "income"),
]
# (id, name, target_amount, target_date); target_date is NOT NULL, so
# "Emergency fund" gets one here although the frontend seed has none.
GOALS = [
    (1, "New laptop", "2000.00", "2026-12-31"),
    (2, "Emergency fund", "3000.00", "2026-12-31"),
]


class Command(BaseCommand):
    help = "Seed the categories and goals the transaction form expects."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("org_id", type=int, help="Workspace the goals belong to")
        parser.add_argument("--dry-run", action="store_true", help="Roll back at the end")

    def handle(self, *args: object, org_id: int, dry_run: bool, **options: object) -> None:
        org = Organization.objects.filter(pk=org_id).first()
        if org is None:
            raise CommandError(f"No organization with id {org_id}")

        with transaction.atomic():
            for pk, name, type_ in CATEGORIES:
                Category.objects.update_or_create(pk=pk, defaults={"name": name, "type": type_})
            for pk, name, target_amount, target_date in GOALS:
                Goal.objects.update_or_create(
                    pk=pk,
                    defaults={
                        "name": name,
                        "target_amount": target_amount,
                        "target_date": target_date,
                        "org": org,
                    },
                )
            # Explicit ids skip the sequences, which would otherwise hand out
            # a duplicate on the next insert.
            with connection.cursor() as cursor:
                for table in ("core_category", "core_goal"):
                    cursor.execute(
                        f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                        f"(SELECT MAX(id) FROM {table}))"
                    )

            self.stdout.write(f"categories: {Category.objects.count()}")
            self.stdout.write(f"goals for org {org_id}: {Goal.objects.filter(org=org).count()}")
            if dry_run:
                transaction.set_rollback(True)
                self.stdout.write("dry run: rolled back")
