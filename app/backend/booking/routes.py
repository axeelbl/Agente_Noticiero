from fastapi import APIRouter, HTTPException
from .models import BookingRequest
from .repository import get_booked_hours, save_booking
from datetime import datetime

router = APIRouter(prefix="/booking", tags=["booking"])

WORKING_HOURS = [
    "09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30",
    "16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30",
]

HOLIDAYS = [
    "2026-01-01",
    "2026-12-25",
    "2026-12-26",
]

def is_closed_day(date_str: str) -> bool:
    """
    Retorna True si la fecha es:
    - Domingo
    - Festivo
    - Fecha pasada
    """
    date = datetime.strptime(date_str, "%Y-%m-%d")
    today = datetime.today().date()

    # Fecha pasada
    if date.date() < today:
        return True

    # Domingo
    if date.weekday() == 6:
        return True

    # Festivo
    if date_str in HOLIDAYS:
        return True

    return False


@router.get("/availability")
def availability(date: str):
    if is_closed_day(date):
        return []  # Cierra ese día o ya pasó

    booked = get_booked_hours(date)
    return [h for h in WORKING_HOURS if h not in booked]


@router.post("/reserve")
def reserve(booking: BookingRequest):
    if is_closed_day(str(booking.date)):
        raise HTTPException(status_code=400, detail="Día cerrado o pasado")

    try:
        save_booking(booking)
    except Exception:
        raise HTTPException(status_code=409, detail="Hora no disponible")

    return {"status": "ok"}
