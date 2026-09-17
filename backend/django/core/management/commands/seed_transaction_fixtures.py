"""Seeds the goals the transaction form offers.

IDs match SEED_GOALS in frontend/src/lib/goals.ts, which is what the form posts,
so a contribution created through the UI references a row that exists. Goes
through the ORM, so a database whose schema drifted from these models fails
loudly.

Categories are not seeded here: every workspace gets its own set when it is
created (core.services.category.create_default_categories), and the frontend
reads them from the categories endpoint.

Usage:
  python manage.py seed_transaction_fixtures <org_id>
  python manage.py seed_transaction_fixtures 1 --dry-run
"""

from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import connection, transaction

from core.models import Goal, Organization

# (id, name, target_amount, target_date); target_date is NOT NULL, so
# "Emergency fund" gets one here although the frontend seed has none.
GOALS = [
    (1, "New laptop", "2000.00", "2026-12-31"),
    (2, "Emergency fund", "3000.00", "2026-12-31"),
]


class Command(BaseCommand):
    help = "Seed the goals the transaction form expects."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "org_id",
            type=int,
            help="Workspace to seed goals for.",
        )
        parser.add_argument("--dry-run", action="store_true", help="Roll back at the end")

    def handle(self, *args: object, org_id: int, dry_run: bool, **options: object) -> None:
        org = Organization.objects.filter(pk=org_id).first()
        if org is None:
            raise CommandError(f"No organization with id {org_id}")

        with transaction.atomic():
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
            self.stdout.write(f"goals for org {org_id}: {Goal.objects.filter(org=org).count()}")

            # The sequence is reset at the end: an explicit pk bypasses it, so
            # without this the next insert collides with a seeded id.
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT setval(pg_get_serial_sequence('core_goal', 'id'), "
                    "(SELECT MAX(id) FROM core_goal))"
                )

            if dry_run:
                transaction.set_rollback(True)
                self.stdout.write("dry run: rolled back")
