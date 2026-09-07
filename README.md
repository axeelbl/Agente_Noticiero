# Agente Noticiero

Presentador de noticias con IA que resume actualidad, busca titulares por tema y muestra una experiencia visual tipo canal informativo. El backend usa FastAPI y el frontend se sirve como aplicación estática desde la propia API.

## Que hace

- Chat conversacional conectado a Groq para responder y resumir noticias.
- Búsqueda de actualidad general o por tema con NewsAPI cuando está configurado.
- Fallback a RSS público de Google News cuando no hay API key externa.
- Feed en directo para cargar titulares recientes en la pantalla principal.
- Galería de imágenes relacionadas cuando las fuentes aportan metadatos visuales.
- Registro local de conversaciones/leads en CSV y envío opcional por Resend.
- Medidas básicas de seguridad: límites de petición, CORS restringido, cabeceras HTTP y validación de entrada.

## Estructura

```text
app/
  backend/
    Bots/          Lógica del asistente, router de intención y prompts
    core/          Creación de FastAPI, CORS y seguridad
    services/      Casos de uso de chat y búsqueda de noticias
    config.py      Variables de entorno y rutas locales
    csv_utils.py   Persistencia local de leads
    email_utils.py Envío opcional por Resend
    main.py        Punto de entrada FastAPI
  frontend/
    css/           Estilos de la interfaz
    js/            Chat, pantalla de noticias, avatar y galería
    pictures/      Avatar y favicon
requirements.txt  Dependencias Python directas
tests/            Pruebas unitarias
```

## Requisitos

- Python 3.11 o superior recomendado.
- Cuenta y API key de Groq para las respuestas de IA.
- Opcional: API key de NewsAPI para mejorar la cobertura.
- Opcional: Resend para enviar el CSV de leads por email.

## Configuración local

1. Crea y activa un entorno virtual:

```bash
python -m venv .venv
source .venv/bin/activate
```

2. Instala dependencias:

```bash
python -m pip install -r requirements.txt
```

3. Copia `.env.example` a `.env` y rellena las variables necesarias.

```env
GROQ_API_KEY=
RESEND_API_KEY=
RESEND_FROM=
RESEND_TO=
NEWSAPI_API_KEY=
NEWS_LANGUAGE=es
NEWS_COUNTRY=ES
LEADS_FILE=leads.csv
```

`NEWSAPI_API_KEY` y las variables de Resend son opcionales. Si NewsAPI no está configurado, el backend usa RSS público como fallback. Las variables del sistema tienen prioridad sobre el archivo `.env`.

## Ejecutar

Desde la raíz:

```bash
uvicorn app.backend.main:app --reload
```

La aplicación queda disponible en:

- Frontend: http://127.0.0.1:8000/
- API docs: http://127.0.0.1:8000/docs

## Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/` | Sirve la interfaz web principal. |
| `GET` | `/health` | Comprueba el proceso sin llamar a servicios externos. |
| `POST` | `/chat` | Procesa mensajes y devuelve una respuesta del presentador IA. |
| `GET` | `/live-feed` | Devuelve titulares recientes para la pantalla principal. |

## Datos locales

No subas credenciales ni datos generados. El repositorio ignora:

- `.env` y archivos locales de configuración sensible.
- `leads.csv`.
- bases de datos locales y journals.
- cachés de Python y artefactos de build.

## Comprobaciones antes de commitear

```bash
python -m compileall -q app tests
python -m unittest discover -s tests -v
find app/frontend/js -type f -name '*.js' -print0 | xargs -0 -n1 node --check
git diff --check
```

GitHub Actions ejecuta estas comprobaciones en cada push y pull request.

## Notas

- El proyecto no ofrece asesoramiento ni verificación editorial profesional.
- Las respuestas deben tratarse como resúmenes orientativos basados en las fuentes disponibles.
- Configura HTTPS y dominios CORS reales antes de exponerlo en producción.
