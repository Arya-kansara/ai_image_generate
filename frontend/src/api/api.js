// api.js
// ──────
// Thin wrapper around fetch() for talking to the Flask backend.
// `credentials: "include"` is essential — it's what lets the browser send
// the signed session cookie back and forth, which is how the backend knows
// which in-memory conversation belongs to this tab.

const BASE_URL = "http://localhost:5000";

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

/** Sends a chat message and returns { reply, image, intent }. */
export async function sendMessage(message) {
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message }),
  });
  return handleResponse(response);
}

/** Wipes server-side memory and starts a brand new session. */
export async function newChat() {
  const response = await fetch(`${BASE_URL}/api/new-chat`, {
    method: "POST",
    credentials: "include",
  });
  return handleResponse(response);
}
