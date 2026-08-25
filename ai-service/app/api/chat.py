from fastapi import APIRouter

router = APIRouter(prefix="/api/v1", tags=["Chat"])


@router.post("/chat")
async def chat(payload: dict):
    return {"answer": "You spent €850 this month."}
