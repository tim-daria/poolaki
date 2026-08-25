from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    user_id: int
    organization_id: int
    question: str = Field(min_length=1)


class ChatMetadata(BaseModel):
    intent: str


class ChatResponse(BaseModel):
    answer: str
    metadata: ChatMetadata