"""
app.py
──────
Flask backend for the local-only AI Image Generator Chat app.

Architecture:
  - No database. Ever.
  - Flask's signed session cookie stores only a small `session_id` (uuid).
  - The ACTUAL conversation memory (chat_history, last_prompt, last_image)
    lives in a plain Python dict in server RAM, keyed by that session_id.
    This keeps the cookie tiny (cookies have a ~4KB limit — a base64 image
    would blow past that instantly) while still giving each browser tab
    its own isolated memory.
  - Memory is intentionally NOT persisted anywhere. Restarting the Flask
    process, or the frontend calling /api/new-chat, wipes it. That's by
    design ("local-only", "no database").

Routes:
  POST /api/chat       -> send a message, get back {reply, image, intent}
  POST /api/new-chat   -> wipe this session's memory, start fresh
  GET  /api/health     -> simple liveness check
"""

import os
import base64
import uuid

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from dotenv import load_dotenv

from services import groq_service, hf_service

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-only-change-me")

FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")
CORS(app, supports_credentials=True, origins=[FRONTEND_ORIGIN])

# ── In-memory "database" (RAM only, cleared on server restart) ─────────────
# Shape: { session_id: {"chat_history": [...], "last_prompt": str|None,
#                        "last_image_bytes": bytes|None} }
SESSIONS: dict[str, dict] = {}


def _get_or_create_session() -> tuple[str, dict]:
    """Reads the session_id from the signed cookie (creating one if this is
    a brand new browser session), and returns (session_id, memory_dict)."""
    session_id = session.get("session_id")
    if not session_id or session_id not in SESSIONS:
        session_id = str(uuid.uuid4())
        session["session_id"] = session_id
        SESSIONS[session_id] = {
            "chat_history": [],
            "last_prompt": None,
            "last_image_bytes": None,
        }
    return session_id, SESSIONS[session_id]


def _image_to_data_url(image_bytes: bytes) -> str:
    encoded = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/api/chat", methods=["POST"])
def chat():
    body = request.get_json(silent=True) or {}
    user_message = (body.get("message") or "").strip()

    if not user_message:
        return jsonify({"error": "Message cannot be empty."}), 400

    session_id, memory = _get_or_create_session()

    # 1) Record the user's turn immediately.
    memory["chat_history"].append({"role": "user", "text": user_message})

    # 2) Ask Groq to classify intent + draft a reply + (maybe) an image prompt.
    try:
        decision = groq_service.get_assistant_response(
            user_message=user_message,
            chat_history=memory["chat_history"],
            has_last_image=memory["last_image_bytes"] is not None,
        )
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 500

    intent = decision["intent"]
    reply_text = decision["reply"]
    image_data_url = None

    try:
        if intent == "generate":
            prompt = decision["image_prompt"] or user_message
            image_bytes = hf_service.generate_image(prompt)
            memory["last_image_bytes"] = image_bytes
            memory["last_prompt"] = prompt
            image_data_url = _image_to_data_url(image_bytes)

        elif intent == "edit":
            prompt = decision["image_prompt"] or user_message
            image_bytes = hf_service.edit_image(prompt, memory["last_image_bytes"])
            memory["last_image_bytes"] = image_bytes
            memory["last_prompt"] = prompt
            image_data_url = _image_to_data_url(image_bytes)

        # intent == "chat" -> no image work needed.

    except RuntimeError as exc:
        # Image generation/editing failed (e.g. bad HF key, model cold-start
        # timeout). Keep the conversation alive with an honest error message
        # instead of crashing the whole request.
        reply_text = f"{reply_text} (But image generation failed: {exc})"

    # 3) Record the assistant's turn (text + optional image) and return it.
    memory["chat_history"].append({
        "role": "assistant",
        "text": reply_text,
        "image": image_data_url,
    })

    return jsonify({
        "reply": reply_text,
        "image": image_data_url,
        "intent": intent,
    })


@app.route("/api/new-chat", methods=["POST"])
def new_chat():
    """Wipes this session's memory entirely and issues a fresh session_id."""
    old_session_id = session.get("session_id")
    if old_session_id and old_session_id in SESSIONS:
        del SESSIONS[old_session_id]

    new_id = str(uuid.uuid4())
    session["session_id"] = new_id
    SESSIONS[new_id] = {
        "chat_history": [],
        "last_prompt": None,
        "last_image_bytes": None,
    }
    return jsonify({"status": "cleared"})


if __name__ == "__main__":
    # Local-only: debug reloader is fine here since nothing is deployed.
    app.run(host="127.0.0.1", port=5000, debug=True)
