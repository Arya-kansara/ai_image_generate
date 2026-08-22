import React from "react";
import { Download, User, Sparkles } from "lucide-react";

/** Triggers a browser download of a base64 data-URL image. */
function downloadImage(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`message-row ${isUser ? "message-row--user" : "message-row--assistant"}`}>
      <div className="message-avatar" aria-hidden="true">
        {isUser ? <User size={16} /> : <Sparkles size={16} />}
      </div>

      <div className="message-content">
        {message.text && <p className="message-text">{message.text}</p>}

        {message.image && (
          <div className="message-image-wrap">
            <img
              src={message.image}
              alt="AI generated"
              className="message-image"
            />
            <button
              className="image-download-btn"
              onClick={() => downloadImage(message.image, `pixel-${Date.now()}.png`)}
              title="Download image"
            >
              <Download size={14} />
              Download
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
