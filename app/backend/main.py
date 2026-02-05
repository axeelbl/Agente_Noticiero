from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from .Bots.chat import ask_groq, decide_and_extract_booking
from .Bots.Prompts import SYSTEM_PROMPT
from .csv_utils import save_lead
from .email_utils import send_csv_email
import time, os
from app.backend.booking.database import init_db
from app.backend.booking.routes import router as booking_router
from app.backend.booking.models import BookingRequest
from app.backend.booking.repository import save_booking
from app.backend.booking.scheduling import is_closed_day, parse_date
from app.backend.booking.notifications import send_booking_notification
from app.backend.booking.routes import WORKING_HOURS
from dotenv import load_dotenv
load_dotenv()

# Base del proyecto (carpeta "app")
BASE_DIR = os.path.dirname(os.path.dirname(__file__))

app = FastAPI(title="AxelBot API", version="1.0")

# Montar Database
init_db()
app.include_router(booking_router)

# Montar frontend
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "frontend")), name="static")


# CORS
origins = ["http://localhost", "http://127.0.0.1"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Modelo de request
class MessageRequest(BaseModel):
    user_message: str

# Endpoint de chat
@app.post("/chat")
async def chat_endpoint(msg: MessageRequest, request: Request, background_tasks: BackgroundTasks):
    ip = request.client.host
    user_agent = request.headers.get("user-agent", "")
    language = request.headers.get("accept-language", "")
    referer = request.headers.get("referer", "")

    # 1️⃣ Preguntar a Groq si es una reserva
    decision = decide_and_extract_booking(msg.user_message)

    # 2️⃣ Si la acción es RESERVAR
    if decision.get("action") == "RESERVAR":
        booking_data = decision.get("booking", {})
        
        # Verificar que se tengan todos los campos
        REQUIRED_FIELDS = ["name", "service", "date", "time", "contact"]
        missing_fields = [f for f in REQUIRED_FIELDS if not booking_data.get(f)]
        
        if missing_fields:
            # Si faltan datos, pedirlos al usuario
            missing_text = ", ".join(missing_fields)
            return {"bot_message": f"Para hacer la reserva necesito que me digas: {missing_text}"}
        
        # Parsear la fecha correctamente
        if booking_data.get("date"):
            booking_data["date"] = parse_date(booking_data["date"])
        
        # Verificar si el día está cerrado
        if is_closed_day(booking_data["date"]):
            return {"bot_message": "Lo siento, ese día estamos cerrados o ya pasó. Por favor elige otro día."}

        # Verificar que la hora esté disponible
        booked_hours = [h for h in WORKING_HOURS]  # Podrías usar get_booked_hours para chequear disponibilidad real
        if booking_data["time"] not in booked_hours:
            return {"bot_message": f"La hora {booking_data['time']} no está disponible. Intenta otra hora."}

        # Crear objeto BookingRequest
        booking = BookingRequest(**booking_data)

        try:
            save_booking(booking)
        except Exception:
            return {"bot_message": "Esa hora ya está reservada, prueba con otra."}

        # Enviar email en segundo plano
        background_tasks.add_task(
            send_booking_notification,
            booking.contact,  
            booking.name,
            booking.service,
            str(booking.date),
            booking.time
        )

        return {"bot_message": f"¡Perfecto! Tu cita para {booking.service} el {booking.date} a las {booking.time} está reservada. Te esperamos en Pepito de los Palotes 3."}

    # 3️⃣ Si no es reserva, chat normal
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": msg.user_message}
    ]

    start_time = time.time()
    bot_reply = ask_groq(messages)
    response_time = round(time.time() - start_time, 2)

    meta = {
        "ip": ip,
        "user_agent": user_agent,
        "language": language,
        "referer": referer,
        "response_time": response_time
    }

    save_lead(msg.user_message, bot_reply, meta)
    try:
        send_csv_email()
    except Exception as e:
        print("Error enviando CSV:", e)

    return {"bot_message": bot_reply}

# Endpoint raíz
@app.get("/")
async def root():
    index_path = os.path.join(BASE_DIR, "frontend", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    else:
        return {"error": "Archivo index.html no encontrado."}