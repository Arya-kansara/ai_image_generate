import React from "react";

/** Three-dot "typing" animation shown while waiting for the assistant. */
export default function TypingIndicator() {
  return (
    <div className="typing-indicator" aria-label="Assistant is responding">
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
}
