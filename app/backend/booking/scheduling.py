from datetime import datetime

WORKING_HOURS = [
    "09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30",
    "16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30",
]

HOLIDAYS = [
    "2026-01-01",
    "2026-12-25",
    "2026-12-26",
    "2026-02-05",
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


def parse_date(date_str: str) -> str:
    """
    Convierte DD/MM/YYYY o YYYY-MM-DD a YYYY-MM-DD
    """
    try:
        # Intentar DD/MM/YYYY
        dt = datetime.strptime(date_str, "%d/%m/%Y")
    except ValueError:
        # Intentar YYYY-MM-DD
        dt = datetime.strptime(date_str, "%Y-%m-%d")
    return dt.strftime("%Y-%m-%d")