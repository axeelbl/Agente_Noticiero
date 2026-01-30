from pydantic import BaseModel
from datetime import date

class BookingRequest(BaseModel):
    name: str
    service: str
    date: date
    time: str
    contact: str
