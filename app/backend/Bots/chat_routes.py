from fastapi import APIRouter, Request, BackgroundTasks
from pydantic import BaseModel

from app.backend.Bots.chat import decide_and_extract_booking
from app.backend.services.booking_service import handle_booking
from app.backend.services.chat_service import handle_chat

router = APIRouter()

class MessageRequest(BaseModel):
    user_message: str

@router.post("/chat")
async def chat_endpoint(
    msg: MessageRequest,
    request: Request,
    background_tasks: BackgroundTasks
):
    decision = decide_and_extract_booking(msg.user_message)

    # Reserva
    if decision.get("action") == "RESERVAR":
        return handle_booking(decision, background_tasks)

    # Chat normal
    return handle_chat(msg.user_message, request)
