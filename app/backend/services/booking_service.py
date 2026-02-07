from app.backend.booking.models import BookingRequest
from app.backend.booking.repository import save_booking
from app.backend.booking.scheduling import is_closed_day, parse_date
from app.backend.booking.notifications import send_booking_notification
from app.backend.booking.booking_routes import WORKING_HOURS

def handle_booking(decision, background_tasks):
    booking_data = decision.get("booking", {})

    REQUIRED_FIELDS = ["name", "service", "date", "time", "contact"]
    missing_fields = [f for f in REQUIRED_FIELDS if not booking_data.get(f)]

    FIELD_LABELS = {
        "name": "tu nombre",
        "service": "el servicio que quieres (Corte, Barba o Corte + Barba)",
        "date": "el día de la cita (dia/mes/año)",
        "time": "la hora (24:00)",
        "contact": "un teléfono o email de contacto"
    }

    if missing_fields:
        friendly_fields = [FIELD_LABELS[f] for f in missing_fields]

        if len(friendly_fields) == 1:
            msg = f"Para hacer la reserva necesito que me digas {friendly_fields[0]}."
        else:
            msg = (
                "Para hacer la reserva necesito que me digas "
                + ", ".join(friendly_fields[:-1])
                + " y "
                + friendly_fields[-1]
                + "."
            )

        return {"bot_message": msg}

    if booking_data.get("date"):
        booking_data["date"] = parse_date(booking_data["date"])

    if is_closed_day(booking_data["date"]):
        return {
            "bot_message": "Lo siento, ese día estamos cerrados o ya pasó. Por favor elige otro día."
        }

    if booking_data["time"] not in WORKING_HOURS:
        return {
            "bot_message": f"La hora {booking_data['time']} no está disponible. Intenta otra hora."
        }

    booking = BookingRequest(**booking_data)

    try:
        save_booking(booking)
    except Exception:
        return {"bot_message": "Esa hora ya está reservada, prueba con otra."}

    background_tasks.add_task(
        send_booking_notification,
        booking.contact,
        booking.name,
        booking.service,
        str(booking.date),
        booking.time
    )

    return {
        "bot_message": (
            f"¡Perfecto! Tu cita para {booking.service} "
            f"el {booking.date} a las {booking.time} está reservada. "
            f"Te esperamos en Pepito de los Palotes 3."
        )
    }
