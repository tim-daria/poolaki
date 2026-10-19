from typing import Any

from django.utils import timezone

from core.internal.views.base import AiOrgView
from core.models import Organization
from core.serializers import AiAnalyticsSummaryResponseSerializer
from core.services.balance import calculate_org_balance
from core.services.report import get_org_report


class AiAnalyticsSummaryView(AiOrgView):
    """Monthly income/expense distribution for a year (12 zero-filled rows)
    plus the current balance over the full transaction history."""

    response_serializer = AiAnalyticsSummaryResponseSerializer

    def build_payload(self, org: Organization, data: dict[str, Any]) -> dict[str, Any]:
        year = data.get("year", timezone.now().year)
        report = get_org_report(org, year)
        return {
            "year": report["year"],
            "balance": calculate_org_balance(org),
            "totals": report["totals"],
            "months": report["monthly"],
        }
