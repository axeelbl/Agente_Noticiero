from .database import get_connection

def get_booked_hours(date: str) -> list[str]:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT time FROM bookings WHERE date = ?",
        (date,)
    )

    rows = cursor.fetchall()
    conn.close()

    return [row[0] for row in rows]


def save_booking(booking):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO bookings (name, service, date, time, contact)
        VALUES (?, ?, ?, ?, ?)
    """, (
        booking.name,
        booking.service,
        str(booking.date),
        booking.time,
        booking.contact
    ))

    conn.commit()
    conn.close()
