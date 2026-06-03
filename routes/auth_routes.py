from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
from services.auth_service import sign_up, sign_in

router = APIRouter(prefix="/auth", tags=["auth"])


class AuthRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
def register(request: AuthRequest) -> dict:
    return sign_up(email=request.email, password=request.password)


@router.post("/login")
def login(request: AuthRequest) -> dict:
    return sign_in(email=request.email, password=request.password)
