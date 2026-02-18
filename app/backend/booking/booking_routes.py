# RUTAS DE LA API PARA PODER GESTIONAR LAS RESERVAS DE MANERA MANUAL

from fastapi import APIRouter, HTTPException, BackgroundTasks
from .models import BookingRequest
from .repository import get_booked_hours, save_booking, update_booking, delete_booking, get_booking_by_uuid
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


@router.post("/modify")
def modify_booking(decision: dict, background_tasks: BackgroundTasks):
    
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

    try:
        update_booking(booking_uuid, new_date, new_time)
    except Exception as e:
        raise HTTPException(status_code=409, detail=str(e))

    # Notificación al usuario
    background_tasks.add_task(
        send_booking_notification,
        booking[6],  # contact
        booking[2],  # name
        booking[3],  # service
        new_date,
        new_time,
        booking_uuid,
    )

    return {"status": "ok", "message": "Reserva modificada correctamente"}


@router.post("/cancel")
def cancel_booking(decision: dict, background_tasks: BackgroundTasks):
    
    booking_uuid = decision.get("booking_uuid")
    if not booking_uuid:
        raise HTTPException(status_code=400, detail="Falta el booking_uuid")

    booking = get_booking_by_uuid(booking_uuid)
    if not booking:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    try:
        delete_booking(booking_uuid)
    except Exception as e:
        raise HTTPException(status_code=409, detail=str(e))

    # Notificación al usuario
    background_tasks.add_task(
        send_booking_notification,
        booking[6],  # contact
        booking[2],  # name
        booking[3],  # service
        str(booking[4]),
        booking[5],
        booking_uuid,
        cancelled=True
    )

    return {"status": "ok", "message": "Reserva cancelada correctamente"}