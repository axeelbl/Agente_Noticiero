# Agente Peluquero

Asistente web para una peluqueria que conversa con el cliente, recomienda cortes, consulta disponibilidad y gestiona reservas desde una interfaz sencilla. El proyecto combina un backend en FastAPI con un frontend estatico servido por la propia API.

## Que hace

- Chat conversacional conectado a Groq para responder dudas y entender intenciones.
- Reservas de citas con nombre, servicio, fecha, hora y contacto.
- Consulta de disponibilidad por dia o vista de proximos huecos libres.
- Modificacion y cancelacion de reservas mediante ID y contacto.
- Notificaciones de reserva por email con SendGrid o SMS con Twilio.
- Registro local de leads en CSV y envio del CSV por email.
- Recomendacion visual de cortes con imagenes del catalogo incluido.
- Medidas basicas de seguridad: CORS, cabeceras HTTP, limitacion de peticiones y validacion de entradas.

## Estructura

```text
app/
  backend/
    Bots/          Logica del asistente y prompts
    booking/       Reservas, base SQLite, disponibilidad y notificaciones
    core/          Creacion de la app, CORS, seguridad y arranque
    services/      Casos de uso del chat, reservas y recomendaciones
  frontend/
    css/           Estilos de la interfaz
    js/            Logica del cliente web
    pictures/      Avatar, favicon e imagenes de cortes
requirements.txt  Dependencias Python
```

## Requisitos

- Python 3.12 recomendado.
- Cuenta y API key de Groq para el chat.
- SendGrid para emails.
- Twilio opcional si se quieren enviar SMS.

## Configuracion local

1. Crea y activa un entorno virtual:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

2. Instala dependencias:

```powershell
pip install -r requirements.txt
```

3. Crea tu archivo `.env` a partir de `.env.example`:

```powershell
Copy-Item .env.example .env
```

4. Rellena las variables con tus credenciales reales.

> No subas `.env`, `sendgrid.env`, `leads.csv` ni bases de datos locales. Ya estan incluidos en `.gitignore`.

## Variables de entorno

```env
GROQ_API_KEY=
SENDGRID_API_KEY=
SENDGRID_FROM=
SENDGRID_TO=
TWILIO_SID=
TWILIO_TOKEN=
TWILIO_PHONE=
```

## Arranque

Desde la raiz del proyecto:

```powershell
uvicorn app.backend.main:app --reload
```

La aplicacion quedara disponible en:

- Frontend: http://127.0.0.1:8000/
- Documentacion API: http://127.0.0.1:8000/docs

## Endpoints principales

- `POST /chat`: entrada principal del asistente.
- `GET /booking/availability?date=YYYY-MM-DD`: disponibilidad de un dia.
- `POST /booking/reserve`: reserva manual.
- `POST /booking/modify`: modificacion de reserva.
- `POST /booking/cancel`: cancelacion de reserva.

## Datos locales

El proyecto genera datos de ejecucion que no deben versionarse:

- `leads.csv`: registro de conversaciones/leads.
- `app/backend/booking/bookings.db`: base SQLite local de reservas.
- `__pycache__/` y `*.pyc`: cache de Python.
- `.env` y `sendgrid.env`: credenciales y configuracion privada.

## Seguridad y buenas practicas

- Las claves de API se cargan desde variables de entorno.
- El backend valida campos de texto, contacto, fechas y horarios.
- Hay limites de peticion para reducir abuso en chat y reservas.
- Las reservas se identifican con un ID para poder modificar o cancelar.
- El repositorio incluye solo codigo, assets publicos, dependencias y documentacion.

## Notas de despliegue

Para produccion, usa variables de entorno del proveedor de hosting en lugar de archivos `.env`, configura HTTPS y revisa los dominios permitidos por CORS antes de publicar el servicio.
