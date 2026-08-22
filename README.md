# Pixel — Local AI Image Generator Chat

A ChatGPT-style chat app for generating and editing AI images, running
entirely on your machine. No deployment, no login, no database — memory
lives in RAM and disappears on refresh or "New Chat".

```
Frontend  React 18 + Vite            (chat UI)
Backend   Flask                      (orchestration + in-memory session)
LLM       Groq · openai/gpt-oss-120b (intent + reply — see note below)
Images    Hugging Face FLUX.1-schnell (generate) + img2img (edit)
```

> **Model note:** the original spec called for Llama 3.3 70B, but Groq
> retired that model on 2026-08-16. The backend now uses
> `openai/gpt-oss-120b` instead (same API, one line to change in
> `backend/services/groq_service.py` if you'd rather use something else).

---

## 1. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# then edit .env and paste in your real keys:
#   GROQ_API_KEY=...
#   HF_API_KEY=...
#   FLASK_SECRET_KEY=... (any random string)

python app.py
```

Backend runs at `http://localhost:5000`. `/api/health` should return
`{"status": "ok"}`.

## 2. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` and opens automatically. It talks
to the backend at `localhost:5000` — the `credentials: "include"` fetch
calls in `src/api/api.js` are what let the Flask session cookie carry your
conversation's memory between requests.

## 3. Using it

- Type a prompt like *"a watercolor fox in a rainy forest"* → generates a
  new image, shown inline in chat and in the right-hand preview panel
  (desktop).
- Follow up with *"add a red umbrella"* or *"make it night time, keep the
  fox the same"* → edits the last image using the same conversation
  context.
- Just chat normally (*"what can you do?"*) and it'll reply without
  touching the image.
- **New Chat** (top right) or a **page refresh** wipes memory completely —
  by design, there's no database and nothing is saved to disk.
- Click **Download** under any generated image to save it as a PNG.

## How intent detection works

Every message you send goes to Groq once. It decides whether you want a
**new image**, an **edit** of the last one, or just **conversation**, and
(for image intents) writes a clean FLUX-ready prompt for you. For edits, it
composes a *full* scene description — "previous image + your requested
change" — rather than just the delta, since FLUX img2img needs the whole
picture description to stay visually consistent (see comments in
`backend/services/groq_service.py` and `hf_service.py` for the reasoning
and the fallback behavior if the img2img endpoint isn't available for your
HF key).

## Project structure

```
ai-image-chat/
├── backend/
│   ├── app.py                  Flask routes + in-memory session store
│   ├── services/
│   │   ├── groq_service.py     LLM intent classification + reply
│   │   └── hf_service.py       FLUX generate + edit calls
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx              Layout + state + orchestration
    │   ├── App.css               Dark theme styling
    │   ├── api/api.js            Backend fetch client
    │   └── components/
    │       ├── ChatWindow.jsx
    │       ├── MessageBubble.jsx
    │       ├── InputBar.jsx
    │       ├── ImagePanel.jsx
    │       └── TypingIndicator.jsx
    └── package.json
```

## Troubleshooting

- **"Couldn't reach the backend"** — make sure `python app.py` is running
  and nothing else is bound to port 5000.
- **CORS errors in the browser console** — confirm `FRONTEND_ORIGIN` in
  `backend/.env` matches the URL Vite is actually running on.
- **Image generation is slow the first time** — HF Inference API cold-starts
  models; `hf_service.py` retries automatically for up to ~90 seconds.
- **Edits look like a fresh image, not a true edit** — this happens if your
  HF key doesn't have access to an img2img-capable endpoint; the backend
  falls back to regenerating from a merged prompt (see the note in
  `hf_service.py`) so the app keeps working either way.
