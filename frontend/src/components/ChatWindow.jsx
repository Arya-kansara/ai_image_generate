import React, { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import MessageBubble from "./MessageBubble.jsx";
import TypingIndicator from "./TypingIndicator.jsx";

export default function ChatWindow({ messages, loading }) {
  const bottomRef = useRef(null);

  // Auto-scroll to the newest message whenever the conversation changes.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (messages.length === 0 && !loading) {
    return (
      <div className="chat-window">
        <div className="empty-state">
          <div className="empty-state-icon">
            <Sparkles size={28} />
          </div>
          <h2>What should we create today?</h2>
          <p>
            Describe an image — a portrait, a landscape, anime, fantasy art,
            anything — and I'll generate it. Then just tell me what to
            change and I'll edit it in place.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {loading && (
        <div className="message-row message-row--assistant">
          <div className="message-avatar" aria-hidden="true">
            <Sparkles size={16} />
          </div>
          <div className="message-content">
            <TypingIndicator />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
