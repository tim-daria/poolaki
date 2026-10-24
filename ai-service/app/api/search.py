from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_vector_search_service

router = APIRouter(prefix="/search", tags=["Vector Search"])


@router.post("/")
async def search_vectors(query: str, service=Depends(get_vector_search_service)):
    try:
        return await service.search(query)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
