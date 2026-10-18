from django.urls import path

from core.internal.views.analytics_summary import AiAnalyticsSummaryView
from core.internal.views.categories import AiCategoriesView
from core.internal.views.transactions import AiTransactionsView

urlpatterns = [
    # Analytics
    path(
        "analytics/summary/",
        AiAnalyticsSummaryView.as_view(),
        name="ai-analytics-summary",
    ),
    # Categories
    path("categories/", AiCategoriesView.as_view(), name="ai-categories"),
    # Transactions
    path("transactions/", AiTransactionsView.as_view(), name="ai-transactions"),
]
