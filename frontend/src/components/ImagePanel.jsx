import React from "react";
import { Download, ImageOff } from "lucide-react";

function downloadImage(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function ImagePanel({ image, loading }) {
  return (
    <aside className="image-panel">
      <div className="image-panel-header">
        <span>Latest image</span>
      </div>

      <div className="image-panel-body">
        {loading && (
          <div className="image-placeholder image-placeholder--loading">
            <div className="shimmer" />
            <p>Rendering…</p>
          </div>
        )}

        {!loading && image && (
          <div className="image-panel-preview">
            <img src={image} alt="Latest generated" />
            <button
              className="image-download-btn image-download-btn--panel"
              onClick={() => downloadImage(image, `pixel-${Date.now()}.png`)}
            >
              <Download size={14} />
              Download
            </button>
          </div>
        )}

        {!loading && !image && (
          <div className="image-placeholder">
            <ImageOff size={22} />
            <p>Your generated image will appear here</p>
          </div>
        )}
      </div>
    </aside>
  );
}
