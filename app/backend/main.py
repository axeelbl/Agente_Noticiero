from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from .chat import SYSTEM_PROMPT, ask_groq
from .csv_utils import save_lead
from .email_utils import send_csv_email
import time, os

# Base del proyecto (carpeta "app")
BASE_DIR = os.path.dirname(os.path.dirname(__file__))

app = FastAPI(title="AxelBot API", version="1.0")

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

    # Guardar lead y enviar CSV
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