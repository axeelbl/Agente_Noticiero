from fastapi import APIRouter, HTTPException, BackgroundTasks
from .models import BookingRequest
from .repository import get_booked_hours, save_booking
from .scheduling import WORKING_HOURS, is_closed_day
from .notifications import send_booking_notification

router = APIRouter(prefix="/booking", tags=["booking"])


@router.get("/availability")
def availability(date: str):
    if is_closed_day(date):
        return []  # Cierra ese día o ya pasó

    booked = get_booked_hours(date)
    return [h for h in WORKING_HOURS if h not in booked]


@router.post("/reserve")
def reserve(booking: BookingRequest, background_tasks: BackgroundTasks):
    if is_closed_day(str(booking.date)):
        raise HTTPException(status_code=400, detail="Día cerrado o pasado")

    try:
        # Guardar reserva y obtener UUID
        booking_uuid = save_booking(booking)
    except Exception:
        raise HTTPException(status_code=409, detail="Hora no disponible")

    # <-- Enviar email en segundo plano -->
    background_tasks.add_task(
        send_booking_notification,
        booking.contact,  
        booking.name,
        booking.service,
        str(booking.date),
        booking.time,
        booking_uuid 
    )

    return {"status": "ok", "booking_uuid": booking_uuid}
