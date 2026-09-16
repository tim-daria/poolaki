"""Seed default categories for organizations that already exist."""

import django.db.models.deletion
from django.db import migrations, models


DEFAULT_CATEGORIES = (
    ("Food", "expense"),
    ("Transport", "expense"),
    ("Housing", "expense"),
    ("Entertainment", "expense"),
    ("Shopping", "expense"),
    ("Health", "expense"),
    ("Utilities", "expense"),
    ("Salary", "income"),
    ("Freelance", "income"),
    ("Gift", "income"),
    ("Contribution", "contribution"),
)


def seed_default_categories(apps, schema_editor) -> None:
    Organization = apps.get_model("core", "Organization")
    Category = apps.get_model("core", "Category")

    Category.objects.all().delete()
    Category.objects.bulk_create(
        [
            Category(org=organization, name=name, type=category_type)
            for organization in Organization.objects.all()
            for name, category_type in DEFAULT_CATEGORIES
        ]
    )


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="category",
            name="org",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="categories",
                to="core.organization",
            ),
        ),
        migrations.AlterField(
            model_name="category",
            name="type",
            field=models.CharField(
                choices=[
                    ("income", "Income"),
                    ("expense", "Expense"),
                    ("contribution", "Contribution"),
                ],
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="transaction",
            name="entry_type",
            field=models.CharField(
                choices=[
                    ("income", "Income"),
                    ("expense", "Expense"),
                    ("contribution", "Contribution"),
                ],
                max_length=20,
            ),
        ),
        migrations.RunPython(seed_default_categories, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="category",
            name="org",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="categories",
                to="core.organization",
            ),
        ),
        migrations.AddConstraint(
            model_name="category",
            constraint=models.UniqueConstraint(
                fields=("org", "name", "type"),
                name="unique_category_per_org",
            ),
        ),
    ]
