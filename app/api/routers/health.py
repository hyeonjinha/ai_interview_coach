from fastapi import APIRouter

router = APIRouter()


@router.get("/z")
def healthz():
    return {"status": "ok"}

