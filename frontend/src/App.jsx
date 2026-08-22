import React, { useEffect, useState, useCallback } from "react";
import { Plus, Sparkles } from "lucide-react";
import ChatWindow from "./components/ChatWindow.jsx";
import InputBar from "./components/InputBar.jsx";
import ImagePanel from "./components/ImagePanel.jsx";
import { sendMessage, newChat } from "./api/api.js";
import "./App.css";

let idCounter = 0;
const nextId = () => `msg-${Date.now()}-${idCounter++}`;

export default function App() {
  const [messages, setMessages] = useState([]);
  const [lastImage, setLastImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // On first mount, explicitly reset backend memory. This is what makes
  // "memory disappears on refresh" actually true: a hard refresh remounts
  // App, which wipes both the React state (naturally) and the Flask-side
  // in-memory session (via this call) — so a refresh behaves exactly like
  // clicking "New Chat".
  useEffect(() => {
    newChat().catch(() => {
      // If the backend isn't running yet, surface it once the user sends
      // their first message rather than blocking the UI on load.
    });
  }, []);

  const handleNewChat = useCallback(async () => {
    setLoading(false);
    setError(null);
    setMessages([]);
    setLastImage(null);
    try {
      await newChat();
    } catch {
      setError("Couldn't reach the backend. Is Flask running on :5000?");
    }
  }, []);

  const handleSend = useCallback(async (text) => {
    setError(null);
    const userMsg = { id: nextId(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const { reply, image } = await sendMessage(text);
      const assistantMsg = {
        id: nextId(),
        role: "assistant",
        text: reply,
        image: image || null,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (image) setLastImage(image);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          text: `Something went wrong: ${err.message}`,
          image: null,
        },
      ]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-brand">
          <div className="brand-mark">
            <Sparkles size={18} />
          </div>
          <div>
            <h1>Pixel</h1>
            <span>AI image generator &amp; editor</span>
          </div>
        </div>

        <button className="new-chat-btn" onClick={handleNewChat}>
          <Plus size={16} />
          New Chat
        </button>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <main className="app-main">
        <section className="chat-column">
          <ChatWindow messages={messages} loading={loading} />
          <InputBar onSend={handleSend} disabled={loading} />
        </section>

        <ImagePanel image={lastImage} loading={loading} />
      </main>
    </div>
  );
}
