"""URLconf for the /api/internal/v1/ namespace (AI Service only, never
routed at the edge)."""

from django.urls import path

from core.internal.views.analytics_summary import AiAnalyticsSummaryView

urlpatterns = [
    # Analytics
    path(
        "analytics/summary/",
        AiAnalyticsSummaryView.as_view(),
        name="ai-analytics-summary",
    ),
    # Remaining contract endpoints (analytics/categories, transactions,
    # categories) are added here as they are implemented.
]
