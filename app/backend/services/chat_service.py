import time
from app.backend.Bots.chat import ask_groq
from app.backend.Bots.Prompts import SYSTEM_PROMPT
from app.backend.csv_utils import save_lead
from app.backend.email_utils import send_csv_email

def handle_chat(user_message, request):
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message}
    ]

    start_time = time.time()
    bot_reply = ask_groq(messages)
    response_time = round(time.time() - start_time, 2)

    meta = {
        "ip": request.client.host,
        "user_agent": request.headers.get("user-agent", ""),
        "language": request.headers.get("accept-language", ""),
        "referer": request.headers.get("referer", ""),
        "response_time": response_time
    }

    save_lead(user_message, bot_reply, meta)

    try:
        send_csv_email()
    except Exception as e:
        print("Error enviando CSV:", e)

    return {"bot_message": bot_reply}
