from fastapi import APIRouter
from app.services.llm_service import LLMService
from models.chat import ChatRequest, ChatResponse


router = APIRouter(prefix="/api/v1", tags=["Chat"])


@router.post("/chat")
async def chat(payload: dict):
    return {"answer": "You spent €850 this month."}

def get_llm_service() -> LLMService:
    from app.main import llm_service

async def chat(payload: ChatRequest):

    llm_service: LLMService = Depends(get_llm_service),
    -> ChatResponse:

    answer, intent = await llm_service.generate_response(
        user_id=payload.user_id,
        organization_id=payload.organization_id,
        question=payload.question,
    )

    return ChatResponse(
        answer=answer,
        metadata={
            "intent": intent,
        },
    )