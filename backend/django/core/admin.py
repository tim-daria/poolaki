from django.contrib import admin

from .models import (
    ActivityLog,
    Category,
    Goal,
    Membership,
    Organization,
    RecurringTransaction,
    Transaction,
    User,
)

# Register your models here.
admin.site.register(User)
admin.site.register(Organization)
admin.site.register(Membership)
admin.site.register(Goal)
admin.site.register(Transaction)
admin.site.register(RecurringTransaction)
admin.site.register(Category)
admin.site.register(ActivityLog)
