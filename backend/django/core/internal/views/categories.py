from typing import Any

from core.internal.views.base import AiOrgView
from core.models import Organization
from core.serializers import AiCategoriesResponseSerializer
from core.services.report import get_org_category_breakdown


class AiCategoriesView(AiOrgView):
    """The organization's income/expense categories, each with its
    zero-filled 12-slot monthly series for the requested year (index 0 =
    January). Inactive categories are included zero-filled; contribution
    categories are excluded."""

    response_serializer = AiCategoriesResponseSerializer

    def build_payload(self, org: Organization, data: dict[str, Any]) -> dict[str, Any]:
        year = data["year"]
        return {
            "year": year,
            "categories": get_org_category_breakdown(org, year, include_inactive=True),
        }
