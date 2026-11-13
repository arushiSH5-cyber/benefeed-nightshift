"""TTS behind one interface. ElevenLabs when keys are set; otherwise None and the PWA uses Web Speech."""
from __future__ import annotations

import hashlib
import os

import httpx

from . import db

CACHE = db.STATE / "tts"
CACHE.mkdir(parents=True, exist_ok=True)


def synthesize(text: str, lang: str = "en") -> bytes | None:
    key, voice = os.environ.get("ELEVENLABS_API_KEY"), os.environ.get("ELEVENLABS_VOICE_ID")
    if not key or not voice:
        return None
    h = hashlib.sha256(f"{voice}|{lang}|{text}".encode()).hexdigest()[:32]
    f = CACHE / f"{h}.mp3"
    if f.exists():
        return f.read_bytes()
    r = httpx.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
        headers={"xi-api-key": key, "accept": "audio/mpeg"},
        json={"text": text, "model_id": "eleven_multilingual_v2"},
        timeout=30,
    )
    if r.status_code != 200:
        return None
    f.write_bytes(r.content)
    return r.content
