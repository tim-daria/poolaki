from pydantic import BaseModel


class ContextRequest(BaseModel):
    user_id: int
    question: str


class ContextItem(BaseModel):
    type: str
    content: str


class ContextResponse(BaseModel):
    context: list[ContextItem]


class FinancialContextItem(BaseModel):
    type: str
    content: str
    source: str

