from datetime import datetime, timedelta
from app.backend.booking.models import BookingRequest
from app.backend.booking.repository import save_booking, get_booked_hours
from app.backend.booking.scheduling import is_closed_day, parse_date, parse_time_flexible, get_nearby_free_slots, WORKING_HOURS
from app.backend.booking.notifications import send_booking_notification

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

    try:
        requested_minutes = parse_time_flexible(booking_data["time"])
    except ValueError:
        return {
            "bot_message": "No he entendido bien la hora. ¿Puedes decirme otra?"
        }

    # Si la hora coincide exactamente con un slot
    requested_time_str = f"{requested_minutes // 60:02d}:{requested_minutes % 60:02d}"

    if requested_time_str in WORKING_HOURS:
        booking_data["time"] = requested_time_str
    else:
        options = get_nearby_free_slots(booking_data["date"],requested_minutes)
        if not options:
            return {
                "bot_message": "Lo siento, ese día ya no quedan horas disponibles."
            }
        return {
            "bot_message": (
                f"A esa hora no tenemos un bloque exacto. "
                f"¿Te viene bien alguna de estas opciones? "
                f"{' · '.join(options)}"
            )
        }


    if booking_data["time"] not in WORKING_HOURS:
        return {
            "bot_message": f"La hora {booking_data['time']} no está disponible. Intenta otra hora."
        }

    booking = BookingRequest(**booking_data)

    try:
        booking_uuid = save_booking(booking)
    except Exception:
        return {"bot_message": "Esa hora ya está reservada, prueba con otra."}

    background_tasks.add_task(
        send_booking_notification,
        booking.contact,
        booking.name,
        booking.service,
        str(booking.date),
        booking.time,
        booking_uuid
    )

    return {
        "bot_message": (
            f"¡Perfecto! Tu cita para {booking.service} "
            f"el {booking.date} a las {booking.time} está reservada. "
            f"Tu ID de reserva es {booking_uuid}. (No lo compartas con nadie!) "
            f"Te esperamos en Pepito de los Palotes 3."
        ),
        "booking_uuid": booking_uuid  # <-- opcional para frontend
    }



def handle_availability(date_str: str | None):

    if not date_str:
        return {
            "bot_message": "¿Para qué día quieres ver la disponibilidad?"
        }

    try:
        date = parse_date(date_str)
    except Exception:
        return {
            "bot_message": "No he entendido la fecha. Escríbela en formato día/mes/año."
        }

    if is_closed_day(date):
        return {
            "bot_message": "Ese día estamos cerrados o ya pasó."
        }

    booked = get_booked_hours(str(date))
    free = [h for h in WORKING_HOURS if h not in booked]

    if not free:
        return {
            "bot_message": "Ese día está completo."
        }

    return {
        "bot_message": f"Horarios disponibles el {date}:\n" + " · ".join(free)
    }




def handle_availability_overview(days_ahead: int = 7):
    today = datetime.today().date()

    result_lines = []

    for i in range(days_ahead):
        date = today + timedelta(days=i)

        if is_closed_day(str(date)):
            continue

        booked = get_booked_hours(str(date))
        free = [h for h in WORKING_HOURS if h not in booked]

        if free:
            result_lines.append(
                f"{date.strftime('%d/%m/%Y')} → {', '.join(free)}"
            )

    if not result_lines:
        return {"bot_message": "No hay disponibilidad en los próximos días."}

    return {
        "bot_message":
            "Estos son los próximos días con disponibilidad:\n\n"
            + "\n".join(result_lines)
            + "\n\n¿Quieres reservar alguno?"
    }
