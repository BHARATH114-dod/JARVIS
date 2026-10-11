"""
F.R.I.D.A.Y. Text-to-Speech Engine
Asynchronous, non-blocking audio queue with Anti-Echo Feedback Lock.
"""

import queue
import threading
import time
from friday_ai.config import is_speaking_lock

# Speech Queue for non-blocking asynchronous TTS
_speech_queue = queue.Queue()
_tts_engine = None


def _get_engine():
    global _tts_engine
    if _tts_engine is None:
        try:
            import pyttsx3
            _tts_engine = pyttsx3.init()
            _tts_engine.setProperty("rate", 185)  # Crisp, natural speed
            _tts_engine.setProperty("volume", 0.95)

            # Find female voice profile (e.g. Zira, Hazel, or female keywords)
            voices = _tts_engine.getProperty("voices")
            female_keywords = ["female", "zira", "hazel", "susan", "catherine", "samantha", "victoria", "karen"]
            for v in voices:
                if any(k in v.name.lower() for k in female_keywords):
                    _tts_engine.setProperty("voice", v.id)
                    break
        except Exception as e:
            print(f"[!] TTS driver initialization warning: {e}")
            _tts_engine = False
    return _tts_engine


def _worker_loop():
    """Background worker thread that processes speech tasks sequentially."""
    while True:
        text = _speech_queue.get()
        if text is None:
            break

        clean_text = text.strip()
        if not clean_text:
            _speech_queue.task_done()
            continue

        # ENFORCE ANTI-ECHO FEEDBACK LOCK:
        # Pause/mute microphone detection while assistant is speaking
        is_speaking_lock.set()

        try:
            engine = _get_engine()
            if engine:
                engine.say(clean_text)
                engine.runAndWait()
            else:
                # Fallback print simulation if TTS driver is unavailable
                time.sleep(min(3.0, len(clean_text) * 0.04))
        except Exception as err:
            print(f"[TTS Error] Speech playback error: {err}")
        finally:
            # RELEASE ANTI-ECHO LOCK:
            # Allow a tiny 250ms buffer to dissipate room acoustic echo before listening again
            time.sleep(0.25)
            is_speaking_lock.clear()
            _speech_queue.task_done()


# Start background worker daemon
_worker_thread = threading.Thread(target=_worker_loop, daemon=True, name="TTS-Worker")
_worker_thread.start()


def speak(text: str, block: bool = False):
    """
    Sends text to the asynchronous speech queue.
    If block=True, waits until speech playback finishes.
    """
    print(f"\n[\033[96mF.R.I.D.A.Y.\033[0m] {text}")
    _speech_queue.put(text)
    if block:
        _speech_queue.join()


def stop_speech():
    """Cancels current speech and clears queue."""
    while not _speech_queue.empty():
        try:
            _speech_queue.get_nowait()
            _speech_queue.task_done()
        except queue.Empty:
            break
    is_speaking_lock.clear()
