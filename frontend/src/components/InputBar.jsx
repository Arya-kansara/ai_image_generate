import React, { useState, useRef } from "react";
import { ArrowUp } from "lucide-react";

export default function InputBar({ onSend, disabled }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e) => {
    // Enter sends, Shift+Enter adds a newline — standard chat-app behavior.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleChange = (e) => {
    setValue(e.target.value);
    // Auto-grow the textarea up to a sensible max height.
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  };

  return (
    <div className="input-bar">
      <div className="input-bar-inner">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Describe an image, or tell me what to change…"
          rows={1}
          disabled={disabled}
        />
        <button
          className="send-btn"
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
        >
          <ArrowUp size={18} />
        </button>
      </div>
      <p className="input-bar-hint">
        Enter to send · Shift + Enter for a new line
      </p>
    </div>
  );
}
