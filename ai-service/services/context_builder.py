
from models.context import (
    CombinedRetrievalResult,
    FinancialContextItem
)

class ContextBuilder:

    MAX_CONTEXT_LENGTH = 4000


    def build_context(
        self,
        retrieval_result: CombinedRetrievalResult
    ) -> list[FinancialContextItem]:

        context = []


        if retrieval_result.financial_data:

            context.extend(
                self._build_financial_context(
                    retrieval_result.financial_data
                )
            )


        if retrieval_result.semantic_documents:

            context.extend(
                self._build_semantic_context(
                    retrieval_result.semantic_documents
                )
            )


        return self._limit_context(context)



    def _build_financial_context(
        self,
        data: dict
    ):

        items=[]


        if (
            "current_month_expenses" in data
            and
            "previous_month_expenses" in data
        ):

            current = data["current_month_expenses"]
            previous = data["previous_month_expenses"]

            if previous == 0:
                increase = 0
            else:
                increase = (
                    (current - previous)
                    /
                    previous
                    *
                    100
                )


            items.append(
                FinancialContextItem(
                    type="financial_summary",
                    source="django_mock",
                    content=
                    f"""
Expenses increased {increase:.0f}%.
Current month: €{current}.
Previous month: €{previous}.
"""
                )
            )


        if "top_category" in data:

            items.append(
                FinancialContextItem(
                    type="category_analysis",
                    source="django_mock",
                    content=
                    f"""
Highest spending category:
{data['top_category']}
"""
                )
            )


        return items



    def _build_semantic_context(
        self,
        documents:list[str]
    ):

        return [

            FinancialContextItem(
                type="semantic_knowledge",
                source="vector_db",
                content=document
            )

            for document in documents
        ]



    def _limit_context(
        self,
        context
    ):

        total=0
        result=[]


        for item in context:

            size=len(item.content)

            if total + size > self.MAX_CONTEXT_LENGTH:
                break


            result.append(item)

            total += size


        return result