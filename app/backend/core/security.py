# SEGURIDAD DE PETICIONES

from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse

# -------- CLIENT IDENTIFIER --------
def get_client_key(request):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")

    # Bloqueo simple anti-bots básicos
    if "python" in ua.lower() or "curl" in ua.lower():
        return f"blocked:{ip}"

    return f"{ip}:{ua}"


# -------- LIMITER GLOBAL --------
limiter = Limiter(key_func=get_client_key)


# -------- RATE LIMIT HANDLER --------
async def rate_limit_handler(request, exc):
    return JSONResponse(
        status_code=429,
        content={"detail": "Demasiadas peticiones. Intenta más tarde."},
    )


# -------- SETUP SECURITY --------
def setup_security(app):
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

    @app.middleware("http")
    async def security_headers(request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response


# SEGURIDAD DE INPUTS

import re
import html

def validate_text_field(value: str, field_name: str, max_length=50) -> str:
    if not value or not value.strip():
        raise ValueError(f"{field_name} no puede estar vacío")
    if len(value) > max_length:
        raise ValueError(f"{field_name} demasiado largo")
    if re.search(r"[<>]", value):
        raise ValueError(f"{field_name} contiene caracteres inválidos")
    return html.escape(value.strip())  # Escapa HTML

def validate_contact(contact: str) -> str:
    contact = contact.strip()
    email_regex = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    phone_regex = r"^\+?\d{7,15}$"
    
    if re.match(email_regex, contact) or re.match(phone_regex, contact):
        return html.escape(contact)
    
    raise ValueError("Contacto inválido (email o teléfono)")