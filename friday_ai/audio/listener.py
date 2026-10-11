"""
F.R.I.D.A.Y. Microphone Listener & Wake-Word Engine
Zero-crash audio loop, adaptive noise calibration, and Anti-Echo lock integration.
"""

import time
import speech_recognition as sr
from friday_ai.config import WAKE_WORDS, is_speaking_lock

_recognizer = None
_microphone = None


def initialize_audio_hardware(device_index=None):
    """
    Calibrates adaptive noise levels on startup and initializes the hardware microphone.
    """
    global _recognizer, _microphone

    _recognizer = sr.Recognizer()
    _recognizer.dynamic_energy_threshold = True
    _recognizer.dynamic_energy_adjustment_damping = 0.15
    _recognizer.dynamic_energy_ratio = 1.5
    _recognizer.pause_threshold = 0.8
    _recognizer.non_speaking_duration = 0.5

    try:
        _microphone = sr.Microphone(device_index=device_index)
    except Exception as e:
        print(f"[!] Warning: PyAudio hardware init failed ({e}). Defaulting to standard mic.")
        _microphone = sr.Microphone()

    print("[*] Calibrating microphone for ambient room noise...")
    with _microphone as source:
        _recognizer.adjust_for_ambient_noise(source, duration=1.2)
    print(f"[+] Ambient noise calibration complete. Initial energy threshold: {_recognizer.energy_threshold:.1f}\n")


def listen_for_wake_word():
    """
    Passive background listening:
    - Zero busy-spinning (keeps idle CPU below 5%).
    - Pauses while FRIDAY is speaking (Anti-Echo Lock).
    - Catches all timeouts, disconnects, and muffled audio without crashing.
    - Returns True strictly when a wake word is detected.
    """
    global _recognizer, _microphone
    if _recognizer is None:
        initialize_audio_hardware()

    # ANTI-ECHO CHECK: Skip capture if FRIDAY is currently speaking
    if is_speaking_lock.is_set():
        time.sleep(0.15)
        return False

    try:
        with _microphone as source:
            # Low latency short listening window
            audio = _recognizer.listen(source, timeout=1.5, phrase_time_limit=3.0)

        # Do not process speech if she started speaking while audio was buffering
        if is_speaking_lock.is_set():
            return False

        phrase = _recognizer.recognize_google(audio).lower().strip()
        print(f"[\033[90mPassive Audio\033[0m] Heard: '{phrase}'")

        for wake in WAKE_WORDS:
            if wake in phrase:
                return True

    except sr.WaitTimeoutError:
        # Standard silent interval, zero crash
        return False
    except sr.UnknownValueError:
        # Unclear background noise, zero crash
        return False
    except sr.RequestError as re:
        print(f"[Listener Warning] Recognition service latency: {re}")
        time.sleep(1.0)
    except OSError as oe:
        # Hardware mic disconnect protection
        print(f"[Listener Warning] Audio input device disconnected or reset: {oe}")
        time.sleep(1.5)
    except Exception as err:
        print(f"[Listener Exception] Handled gracefully: {err}")
        time.sleep(0.5)

    return False


def listen_for_command(timeout=7.0, phrase_time_limit=10.0):
    """
    Active command capture:
    Called after wake word is activated. Returns transcribed text or None.
    """
    global _recognizer, _microphone
    if _recognizer is None:
        initialize_audio_hardware()

    # Wait until any residual speech concludes
    while is_speaking_lock.is_set():
        time.sleep(0.1)

    print("[\033[92mLISTENING FOR COMMAND\033[0m] Say your instructions...")

    try:
        with _microphone as source:
            audio = _recognizer.listen(source, timeout=timeout, phrase_time_limit=phrase_time_limit)

        text = _recognizer.recognize_google(audio).strip()
        print(f"[\033[93mUSER\033[0m] {text}")
        return text

    except sr.WaitTimeoutError:
        print("[\033[91mTimeout\033[0m] No command heard within time window.")
        return None
    except sr.UnknownValueError:
        print("[\033[91mUnrecognized\033[0m] Command was unclear or muffled.")
        return None
    except Exception as err:
        print(f"[Command Capture Error] {err}")
        return None
