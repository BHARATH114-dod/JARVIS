"""
F.R.I.D.A.Y. Python Voice & Microphone Engine
Robust Audio Capture, Device Enumeration, Dynamic Calibration & Exception Handling.
"""

import sys
import time

try:
    import speech_recognition as sr
except ImportError:
    print("\n[ERROR] 'speech_recognition' is not installed.")
    print("Run: pip install SpeechRecognition\n")
    sys.exit(1)

try:
    import pyaudio
except ImportError:
    print("\n[ERROR] 'pyaudio' is not installed.")
    print("Run: pip install pyaudio")
    print("If standard pip fails on Windows: pip install pipwin && pipwin install pyaudio\n")
    sys.exit(1)


def list_microphones():
    """1. Microphone Enumeration: Lists all available audio input devices and their indices."""
    print("\n" + "=" * 65)
    print("           AVAILABLE MICROPHONE INPUT DEVICES")
    print("=" * 65)
    
    mic_names = sr.Microphone.list_microphone_names()
    if not mic_names:
        print("[!] No audio input devices detected.")
        return []

    p = pyaudio.PyAudio()
    valid_inputs = []

    for index, name in enumerate(mic_names):
        try:
            device_info = p.get_device_info_by_host_api_device_index(0, index)
            # Only list input channels > 0
            if device_info.get("maxInputChannels", 0) > 0:
                print(f"  [{index}] {name} (Channels: {device_info.get('maxInputChannels')})")
                valid_inputs.append((index, name))
        except Exception:
            # Fallback listing
            print(f"  [{index}] {name}")
            valid_inputs.append((index, name))

    p.terminate()
    print("=" * 65 + "\n")
    return valid_inputs


def test_microphone(device_index=None):
    """
    2. Robust Audio Capture & Calibration
    - Dynamic energy thresholding
    - Ambient noise adjustment
    - Timeout and phrase_time_limit guards
    - Comprehensive error handling
    """
    recognizer = sr.Recognizer()

    # Configure dynamic energy threshold so it adapts to room volume
    recognizer.dynamic_energy_threshold = True
    recognizer.dynamic_energy_adjustment_damping = 0.15
    recognizer.dynamic_energy_ratio = 1.5
    recognizer.pause_threshold = 0.8  # Seconds of silence indicating phrase completion
    recognizer.non_speaking_duration = 0.5

    try:
        # Initialize microphone with selected or default device_index
        mic = sr.Microphone(device_index=device_index)
    except Exception as e:
        print(f"\n[CRITICAL] Failed to initialize PyAudio input on index {device_index}: {e}")
        print("Tip: Check Windows Privacy Settings -> Microphone -> Allow apps to access microphone.")
        return None

    with mic as source:
        print(f"[*] Calibrating for ambient noise on device index {device_index if device_index is not None else 'Default'}...")
        print("[*] Please remain quiet for 1 second...")
        
        # Adjust for background noise to prevent perpetual hanging
        recognizer.adjust_for_ambient_noise(source, duration=1.0)
        print(f"[+] Noise calibration complete! Dynamic Energy Threshold: {recognizer.energy_threshold:.1f}")

        print("\n[>>>] F.R.I.D.A.Y. is listening... (Speak into your microphone now)")
        print("      (Timeout: 6 seconds | Max speech duration: 10 seconds)")

        try:
            # Capture speech with non-blocking timeouts
            audio = recognizer.listen(
                source,
                timeout=6.0,           # Max seconds to wait for speech to start
                phrase_time_limit=10.0 # Max seconds to allow speech before cutting off
            )
            print("[+] Audio captured successfully! Processing speech recognition...")

        except sr.WaitTimeoutError:
            print("[-] [Timeout] No speech was detected within 6 seconds.")
            return None
        except Exception as e:
            print(f"[-] [Capture Error] Unexpected error during audio capture: {e}")
            return None

    # Recognize Speech via Google Speech API
    try:
        text = recognizer.recognize_google(audio)
        print(f"\n[TRANSCRIPT] You said: \"{text}\"\n")
        return text
    except sr.UnknownValueError:
        print("[-] [UnknownValueError] Speech was detected, but audio was unclear or muffled.")
    except sr.RequestError as e:
        print(f"[-] [RequestError] Could not request results from recognition service: {e}")
    except Exception as e:
        print(f"[-] [Recognition Error]: {e}")

    return None


def main():
    print("\n--- F.R.I.D.A.Y. Voice Engine Diagnostics ---")
    inputs = list_microphones()

    choice = input("Enter device index to use (Press [ENTER] for Default microphone): ").strip()
    device_index = int(choice) if choice.isdigit() else None

    print("\nStarting live microphone test...")
    result = test_microphone(device_index=device_index)

    if result:
        print(">>> SUCCESS: Microphone capture and speech recognition verified!")
    else:
        print(">>> Diagnostic incomplete. Review output above to troubleshoot.")


if __name__ == "__main__":
    main()
