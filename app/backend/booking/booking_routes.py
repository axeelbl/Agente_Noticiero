# RUTAS DE LA API PARA PODER GESTIONAR LAS RESERVAS DE MANERA MANUAL

from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from .models import BookingRequest
from .repository import get_booked_hours, save_booking, update_booking, delete_booking, get_booking_by_uuid
from .scheduling import WORKING_HOURS, is_closed_day
from .notifications import send_booking_notification
from app.backend.core.security import limiter
import html


router = APIRouter(prefix="/booking", tags=["booking"])

@router.get("/availability")
@limiter.limit("60/minute")
def availability(request: Request, date: str):
    if is_closed_day(date):
        return []  # Cierra ese día o ya pasó

    booked = get_booked_hours(date)
    return [h for h in WORKING_HOURS if h not in booked]


@router.post("/reserve")
@limiter.limit("20/minute")
def reserve(request: Request, booking: BookingRequest, background_tasks: BackgroundTasks):
    if is_closed_day(str(booking.date)):
        raise HTTPException(status_code=400, detail="Día cerrado o pasado")

    # Escapar campos
    safe_name = html.escape(booking.name)
    safe_service = html.escape(booking.service)
    safe_contact = html.escape(booking.contact)
    safe_date = html.escape(str(booking.date))
    safe_time = html.escape(booking.time)

    try:
        # Guardar reserva usando los datos sanitizados
        booking_uuid = save_booking(BookingRequest(
            name=safe_name,
            service=safe_service,
            date=safe_date,
            time=safe_time,
            contact=safe_contact
        ))
    except Exception:
        raise HTTPException(status_code=409, detail="Hora no disponible")

    # Notificación al usuario
    background_tasks.add_task(
        send_booking_notification,
        safe_contact,
        safe_name,
        safe_service,
        safe_date,
        safe_time,
        booking_uuid 
    )

    return {"status": "ok", "booking_uuid": booking_uuid}




@router.post("/modify")
@limiter.limit("10/minute")
def modify_booking(request: Request, decision: dict, background_tasks: BackgroundTasks):
    
    booking_uuid = decision.get("booking_uuid")
    new_date = decision.get("new_date")
    new_time = decision.get("new_time")

    if not booking_uuid or not new_date or not new_time:
        raise HTTPException(status_code=400, detail="Faltan datos para modificar la reserva")
    
    if new_time not in WORKING_HOURS:
        raise HTTPException(400,"Hora inválida")

    if is_closed_day(new_date):
        raise HTTPException(400,"Fecha inválida")
    
    if new_time in get_booked_hours(new_date):
        raise HTTPException(409,"Hora ya reservada")

    booking = get_booking_by_uuid(booking_uuid)
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    # Escapar datos antes de enviarlos
    safe_name = html.escape(booking[2])
    safe_service = html.escape(booking[3])
    safe_contact = html.escape(booking[6])
    safe_new_date = html.escape(new_date)
    safe_new_time = html.escape(new_time)

    # Escapar datos antes de enviarlos
    safe_name = html.escape(booking[2])
    safe_service = html.escape(booking[3])
    safe_contact = html.escape(booking[6])
    safe_new_date = html.escape(new_date)
    safe_new_time = html.escape(new_time)

    try:
        update_booking(booking_uuid, new_date, new_time)
    except Exception as e:
        raise HTTPException(status_code=409, detail=str(e))

    # Notificación al usuario
    background_tasks.add_task(
        send_booking_notification,
        safe_contact,
        safe_name,
        safe_service,
        safe_new_date,
        safe_new_time,
        booking_uuid,
    )

    return {"status": "ok", "message": "Reserva modificada correctamente"}


@router.post("/cancel")
@limiter.limit("5/minute")
def cancel_booking(request: Request, decision: dict, background_tasks: BackgroundTasks):
    
    booking_uuid = decision.get("booking_uuid")
    if not booking_uuid:
        raise HTTPException(status_code=400, detail="Falta el booking_uuid")

    booking = get_booking_by_uuid(booking_uuid)
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    safe_name = html.escape(booking[2])
    safe_service = html.escape(booking[3])
    safe_contact = html.escape(booking[6])
    safe_date = html.escape(str(booking[4]))
    safe_time = html.escape(booking[5])

    try:
        delete_booking(booking_uuid)
    except Exception as e:
        raise HTTPException(status_code=409, detail=str(e))

    # Notificación al usuario
    background_tasks.add_task(
        send_booking_notification,
        safe_contact,
        safe_name,
        safe_service,
        safe_date,
        safe_time,
        booking_uuid,
        cancelled=True
    )

    return {"status": "ok", "message": "Reserva cancelada correctamente"}