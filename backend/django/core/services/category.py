from core.models import Category, CategoryType, Organization

DEFAULT_CATEGORIES = (
    ("Food", CategoryType.EXPENSE),
    ("Transport", CategoryType.EXPENSE),
    ("Housing", CategoryType.EXPENSE),
    ("Entertainment", CategoryType.EXPENSE),
    ("Shopping", CategoryType.EXPENSE),
    ("Health", CategoryType.EXPENSE),
    ("Utilities", CategoryType.EXPENSE),
    ("Salary", CategoryType.INCOME),
    ("Freelance", CategoryType.INCOME),
    ("Contribution", CategoryType.CONTRIBUTION),
)


def create_default_categories(org: Organization) -> None:
    Category.objects.bulk_create(
        [
            Category(org=org, name=name, type=category_type)
            for name, category_type in DEFAULT_CATEGORIES
        ]
    )
