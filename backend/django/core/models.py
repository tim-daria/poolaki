from decimal import Decimal

from django.contrib.auth.models import AbstractUser
from django.db import models

# ============ User & Auth ============


class User(AbstractUser):
    email = models.EmailField(unique=True, max_length=254)
    mfa_secret = models.CharField(max_length=32, blank=True, default="")
    is_mfa_active = models.BooleanField(default=False)

    def __str__(self) -> str:
        return self.email


# ============ Organization ============


class Organization(models.Model):
    name = models.CharField(max_length=100)
    initial_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    is_personal = models.BooleanField(default=False)  # flag for UI/logic, not for database
    created_at = models.DateTimeField(auto_now_add=True, editable=False)


class Role(models.TextChoices):
    OWNER = "owner", "Owner"
    MEMBER = "member", "Member"


class Membership(models.Model):
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True, editable=False)

    # prevents that a user can't be added to the same org twice
    class Meta:
        unique_together = ("org", "user")

    def __str__(self) -> str:
        return f"{self.user} - {self.org} ({self.role})"


class InvitationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACCEPTED = "accepted", "Accepted"
    DECLINED = "declined", "Declined"
    CANCELLED = "cancelled", "Cancelled"


class Invitation(models.Model):
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="invitations")
    invited_user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="received_invitations"
    )
    invited_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="+")
    status = models.CharField(
        max_length=20, choices=InvitationStatus.choices, default=InvitationStatus.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["org", "invited_user"],
                condition=models.Q(status=InvitationStatus.PENDING),
                name="unique_pending_invitation_per_user_org",
            ),
        ]  # we can't invite same user again to the same organization if he has a pending invitation

    def __str__(self) -> str:
        return f"{self.invited_user} → {self.org} ({self.status})"


# ============ Finance ============


class CategoryType(models.TextChoices):
    INCOME = "income", "Income"
    EXPENSE = "expense", "Expense"


class Category(models.Model):
    name = models.CharField(max_length=50)
    type = models.CharField(max_length=10, choices=CategoryType.choices)

    def __str__(self) -> str:
        return self.name


class GoalStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    COMPLETED = "completed", "Completed"
    ARCHIVED = "archived", "Archived"


class Goal(models.Model):
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="goals")
    name = models.CharField(max_length=100)
    target_amount = models.DecimalField(max_digits=14, decimal_places=2)
    target_date = models.DateField()
    status = models.CharField(max_length=20, choices=GoalStatus.choices, default=GoalStatus.ACTIVE)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_goals"
    )
    created_at = models.DateTimeField(auto_now_add=True, editable=False)

    def __str__(self) -> str:
        return self.name


class EntryType(models.TextChoices):
    INCOME = "income", "Income"
    EXPENSE = "expense", "Expense"
    CONTRIBUTION = "contribution", "Goal contribution"


class Transaction(models.Model):
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="transactions")
    goal = models.ForeignKey(
        Goal, on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions"
    )
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    entry_type = models.CharField(max_length=20, choices=EntryType.choices)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    description = models.CharField(max_length=1024, blank=True, null=True)
    transaction_date = models.DateField(blank=False)
    is_tax_deductible = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions"
    )
    created_at = models.DateTimeField(auto_now_add=True, editable=False)

    def __str__(self) -> str:
        return f"{self.entry_type} {self.amount} ({self.transaction_date})"


class Frequency(models.TextChoices):
    DAILY = "daily", "Daily"
    WEEKLY = "weekly", "Weekly"
    MONTHLY = "monthly", "Monthly"
    YEARLY = "yearly", "Yearly"


class RecurringTransaction(models.Model):
    org = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="recurring_transactions"
    )
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    frequency = models.CharField(
        max_length=10, choices=Frequency.choices, default=Frequency.MONTHLY
    )
    description = models.CharField(max_length=1024, blank=True, null=True)
    next_execution = models.DateField()
    is_active = models.BooleanField(default=True)
    is_tax_deductible = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, editable=False)


# ============ Audit and Notifications ============


class NotificationType(models.TextChoices):
    INVITATION = "invitation", "Invitation"
    TRANSACTION_ADDED = "transaction_added", "Transaction added"
    GOAL_COMPLETED = "goal_completed", "Goal completed"
    MEMBER_LEFT = "member_left", "Member left"
    MEMBER_REMOVED = "member_removed", "Member removed"
    REMOVED_FROM_ORG = "removed_from_org", "Removed from org"
    OWNERSHIP_TRANSFERRED = "ownership_transferred", "Ownership transferred"
    OWNER_CHANGED = "owner_changed", "Owner changed"
    ORGANIZATION_DELETED = "organization_deleted", "Organization deleted"


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=30, choices=NotificationType.choices)
    org = models.ForeignKey(
        Organization, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    payload = models.JSONField(
        default=dict, blank=True
    )  # {"invitation_id": 5, "invited_by": "Anna"}
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["user", "is_read", "created_at"])]

    def __str__(self) -> str:
        return f"{self.user} - {self.type}"


class AuditAction(models.TextChoices):
    CREATE = "create", "Create"
    UPDATE = "update", "Update"
    DELETE = "delete", "Delete"


class ActivityLog(models.Model):
    org = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="activity_logs")
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="activity_logs"
    )
    action = models.CharField(max_length=10, choices=AuditAction.choices)
    entity_type = models.CharField(max_length=50)  # "Transaction", "Goal", "Membership"
    entity_id = models.BigIntegerField(null=True, blank=True)
    changes = models.JSONField(default=dict, blank=True)  # {"amount": {"old": 100, "new": 150}}
    created_at = models.DateTimeField(auto_now_add=True, editable=False)

    class Meta:
        indexes = [
            models.Index(fields=["org", "created_at"]),
            models.Index(fields=["entity_type", "entity_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.user} {self.action} {self.entity_type}#{self.entity_id}"
