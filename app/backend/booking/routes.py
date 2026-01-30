from fastapi import APIRouter, HTTPException
from .models import BookingRequest
from .repository import get_booked_hours, save_booking

router = APIRouter(prefix="/booking", tags=["booking"])

WORKING_HOURS = [
    "09:00","09:30", "10:00","10:30", "11:00","11:30", "12:00","12:30", "13:00","13:30",
    "16:00","16:30", "17:00","17:30", "18:00","18:30", "19:00","19:30", "20:00","20:30",
]

@router.get("/availability")
def availability(date: str):
    booked = get_booked_hours(date)
    return [h for h in WORKING_HOURS if h not in booked]


@router.post("/reserve")
def reserve(booking: BookingRequest):
    try:
        save_booking(booking)
    except Exception:
        raise HTTPException(status_code=409, detail="Hora no disponible")

    return {"status": "ok"}
