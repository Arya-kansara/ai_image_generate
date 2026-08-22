"""
hf_service.py
─────────────
Wraps Hugging Face's Inference Providers for FLUX.1:

  - generate_image(prompt)                -> new image from text (text-to-image)
  - edit_image(prompt, init_image_bytes)   -> modified image (image-to-image)

Both functions return raw PNG bytes on success and raise a RuntimeError with
a human-readable message on failure, so app.py can turn that into a clean
chat reply instead of a stack trace.

WHY huggingface_hub INSTEAD OF RAW requests.post(...):
Hugging Face retired the old single-domain "api-inference.huggingface.co"
API in favor of "Inference Providers" — a marketplace of backends (fal-ai,
together, replicate, hf-inference, etc.) reachable through
router.huggingface.co. Which provider actually serves a given model changes
over time (e.g. FLUX.1-schnell was pulled from the "hf-inference" provider
in July 2026 but is still served by fal-ai/together). Hardcoding a specific
provider's URL means the app breaks again the next time HF reshuffles.
The official `huggingface_hub` client sidesteps this: with no `provider`
argument it auto-selects whichever provider currently hosts the model, so
this code keeps working as the backend landscape shifts.

NOTE ON EDITING:
FLUX.1-schnell itself is text-to-image only. For edits we use
FLUX.1-Kontext-dev, which is Black Forest Labs' purpose-built
image-editing model, via the same auto-routed image_to_image() call. If
that call fails for any reason (model temporarily unavailable, no provider
currently serving it for this key, etc.) we fall back to regenerating a
fresh image from the fully-merged prompt that groq_service.py already
builds (full scene description = previous image + requested change), so
edits stay visually coherent even without true img2img.
"""

import os
import io
from huggingface_hub import InferenceClient
from huggingface_hub.errors import HfHubHTTPError

TEXT_TO_IMAGE_MODEL = "black-forest-labs/FLUX.1-schnell"
IMAGE_EDIT_MODEL = "black-forest-labs/FLUX.1-Kontext-dev"

_client: InferenceClient | None = None


def _get_client() -> InferenceClient:
    """Lazily builds a single shared InferenceClient (auto provider routing)."""
    global _client
    if _client is None:
        api_key = os.environ.get("HF_API_KEY")
        if not api_key:
            raise RuntimeError("HF_API_KEY is not set. Add it to backend/.env")
        _client = InferenceClient(api_key=api_key)
    return _client


def _pil_image_to_png_bytes(pil_image) -> bytes:
    buffer = io.BytesIO()
    pil_image.save(buffer, format="PNG")
    return buffer.getvalue()


def generate_image(prompt: str) -> bytes:
    """Text-to-image generation via FLUX.1-schnell. Returns raw PNG bytes."""
    client = _get_client()
    try:
        pil_image = client.text_to_image(prompt, model=TEXT_TO_IMAGE_MODEL)
        return _pil_image_to_png_bytes(pil_image)
    except HfHubHTTPError as exc:
        raise RuntimeError(f"Image generation failed: {exc}") from exc
    except Exception as exc:  # network errors, provider hiccups, etc.
        raise RuntimeError(f"Image generation failed: {exc}") from exc


def edit_image(prompt: str, init_image_bytes: bytes) -> bytes:
    """
    Image-to-image editing via FLUX.1-Kontext-dev. Falls back to a fresh
    text-to-image generation (using the fully-merged prompt) if the editing
    call fails for any reason. Always returns raw PNG bytes.
    """
    client = _get_client()
    try:
        pil_image = client.image_to_image(
            init_image_bytes,
            prompt=prompt,
            model=IMAGE_EDIT_MODEL,
        )
        return _pil_image_to_png_bytes(pil_image)
    except Exception:
        # Graceful degradation: regenerate from the fully-merged scene
        # description rather than surfacing an error for what the user
        # experiences as a normal "edit" request.
        return generate_image(prompt)