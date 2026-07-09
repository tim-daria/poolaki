import uuid
from datetime import date

from django.db import models


class Role(models.TextChoices):
    OWNER = "OWNER", "Owner"
    MEMBER = "MEMBER", "Member"


class Currency(models.TextChoices):
    EUR = "EUR", "Euro"
    USD = "USD", "US Dollar"
    GBP = "GBP", "British Pound"


class Frequency(models.TextChoices):
    DAILY = "DAILY", "Daily"
    WEEKLY = "WEEKLY", "Weekly"
    MONTHLY = "MONTHLY", "Monthly"
    YEARLY = "YEARLY", "Yearly"


class CategoryType(models.TextChoices):
    INCOME = "INCOME", "Income"
    EXPENSE = "EXPENSE", "Expense"


# Create your models here.
class User(models.Model):
    email = models.EmailField(unique=True, max_length=254)
    password_hash = models.CharField(max_length=512, null=False)
    name = models.CharField(unique=True, max_length=100)
    avatar_url = models.CharField(max_length=500, blank=True, null=True)
    mfa_secret = models.CharField(max_length=32, blank=True, null=True)
    is_mfa_active = models.BooleanField(default=False)
    # created_at = models.DateTimeField(auto_now_add=True, editable=False)
    created_at = models.DateTimeField(default=date.today, editable=False)

    def __str__(self) -> str:
        return str(self.id) + " - " + self.name


class Organization(models.Model):
    name = models.CharField(unique=True, max_length=100)
    created_at = models.DateTimeField(auto_now_add=True, editable=False)

    def __str__(self) -> str:
        return str(self.id) + " - " + self.name


class Membership(models.Model):
    org = models.ForeignKey(Organization, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=Role.choices)
    joined_at = models.DateTimeField(auto_now_add=True, editable=False)

    # prevents that a user can't be added to the same org twice
    class Meta:
        unique_together = ("org", "user")

    def __str__(self) -> str:
        return self.role


class Category(models.Model):
    name = models.CharField(max_length=50)
    type = models.CharField(max_length=10, choices=CategoryType.choices)

    def __str__(self) -> str:
        return self.name


class Transaction(models.Model):
    org = models.ForeignKey(Organization, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.EUR)
    description = models.CharField(max_length=1024, blank=True, null=True)
    transaction_date = models.DateField(blank=False)
    created_at = models.DateTimeField(auto_now_add=True, editable=False)


class RecurringTransaction(models.Model):
    org = models.ForeignKey(Organization, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, choices=Currency.choices, default=Currency.EUR)
    frequency = models.CharField(
        max_length=10, choices=Frequency.choices, default=Frequency.MONTHLY
    )
    description = models.CharField(max_length=1024, blank=True, null=True)
    next_execution = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, editable=False)


class Goal(models.Model):
    org = models.ForeignKey(Organization, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="goals")
    name = models.CharField(max_length=100)
    target_amount = models.DecimalField(max_digits=14, decimal_places=2)
    target_date = models.DateField()
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="created_goals")
    created_at = models.DateTimeField(auto_now_add=True, editable=False)

    def __str__(self) -> str:
        return self.name


class ActivityLog(models.Model):
    org = models.ForeignKey(Organization, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=50)
    entity_type = models.CharField(max_length=50)
    entity_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, editable=False)
