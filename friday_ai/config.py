"""
F.R.I.D.A.Y. Configuration & Shared State
Manages API keys, wake words, LLM parameters, and the Anti-Echo lock event.
"""

import os
import threading
from pathlib import Path

# Load Gemini API Key from environment or local .env
ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY")

if not API_KEY and ENV_FILE.exists():
    try:
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("VITE_GEMINI_API_KEY=") or line.startswith("GEMINI_API_KEY="):
                    API_KEY = line.strip().split("=", 1)[1].strip()
                    break
    except Exception:
        pass

# Wake Word Settings
WAKE_WORDS = ["friday", "hey friday", "hi friday", "ok friday"]

# LLM Brain Settings
LLM_MODEL = "gemini-3.5-flash-lite"
FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.7-flash"]
MAX_MEMORY_TURNS = 10
MAX_OUTPUT_TOKENS = 220  # Keeps voice response latency strictly under 2 seconds

# Anti-Echo Feedback Lock:
# Threading event set while FRIDAY is speaking to mute/pause mic listener
is_speaking_lock = threading.Event()
is_speaking_lock.clear()

# System Profile
ASSISTANT_NAME = "F.R.I.D.A.Y."
DEFAULT_USER = "Boss"
