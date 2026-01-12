import csv
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import Request
import time
from .chat import SYSTEM_PROMPT, ask_groq
from pydantic import BaseModel
import os
import threading
import base64
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Attachment
from sendgrid.helpers.mail import FileContent, FileName, FileType, Disposition


def send_csv_email():
    if not os.path.exists("leads.csv"):
        return

    # Leer el CSV y codificarlo en base64 para SendGrid
    with open("leads.csv", "rb") as f:
        data = f.read()
        encoded_file = base64.b64encode(data).decode()

    # Crear adjunto
    attachment = Attachment()
    attachment.file_content = FileContent(encoded_file)
    attachment.file_type = FileType('text/csv')
    attachment.file_name = FileName('leads.csv')
    attachment.disposition = Disposition('attachment')

    # Crear mensaje
    message = Mail(
        from_email=os.getenv("SENDGRID_FROM"),  # email verificado en SendGrid
        to_emails=os.getenv("SENDGRID_TO"),
        subject="AxelBot – Leads (últimas 24h)",
        plain_text_content="Adjunto el archivo leads.csv con los datos recogidos en las últimas 24 horas."
    )
    message.attachment = attachment

    try:
        sg = SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
        response = sg.send(message)
        print("CSV enviado, status code:", response.status_code)
    except Exception as e:
        print("Error enviando CSV:", e)


def daily_csv_sender():
    while True:
        #time.sleep(86400)  # 24 horas
        time.sleep(60)
        try:
            send_csv_email()
        except Exception as e:
            print("Error enviando CSV:", e)


app = FastAPI(title="AxelBot API", version="1.0")

threading.Thread(target=daily_csv_sender, daemon=True).start()

# Montar carpeta frontend
app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "frontend")), name="static")

# CORS: permitir frontend local si accedes desde otro puerto
origins = [
    "http://localhost",
    "http://127.0.0.1",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelo de datos para recibir mensajes
class MessageRequest(BaseModel):
    user_message: str

# Función para guardar en CSV
def save_lead(user_message, bot_message, meta):
    file_exists = os.path.isfile("leads.csv")

    with open("leads.csv", "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)

        if not file_exists:
            writer.writerow([
                "timestamp",
                "ip",
                "user_agent",
                "language",
                "referer",
                "response_time",
                "user_message",
                "bot_message"
            ])

        writer.writerow([
            datetime.now().isoformat(),
            meta["ip"],
            meta["user_agent"],
            meta["language"],
            meta["referer"],
            meta["response_time"],
            user_message,
            bot_message
        ])


# Endpoint principal de chat
@app.post("/chat")
async def chat_endpoint(msg: MessageRequest, request: Request):
    ip = request.client.host
    user_agent = request.headers.get("user-agent", "")
    language = request.headers.get("accept-language", "")
    referer = request.headers.get("referer", "")

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

    return {"bot_message": bot_reply}


# Servir la página principal
@app.get("/")
async def root():
    return FileResponse(os.path.join(os.path.dirname(__file__), "frontend", "index.html"))
