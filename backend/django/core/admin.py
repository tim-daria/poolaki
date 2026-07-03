from django.contrib import admin
from .models import User
from .models import Organization
from .models import Membership
from .models import Goal
from .models import Transaction
from .models import RecurringTransaction
from .models import Category
from .models import ActivityLog

# Register your models here.
admin.site.register(User)
admin.site.register(Organization)
admin.site.register(Membership)
admin.site.register(Goal)
admin.site.register(Transaction)
admin.site.register(RecurringTransaction)
admin.site.register(Category)
admin.site.register(ActivityLog)