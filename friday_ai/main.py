"""
F.R.I.D.A.Y. Autonomous Voice Assistant
Principal Orchestrator: Wake-Word Loop, Intent Dispatch, Audio Queue & Fail-safe Guards.
"""

import sys
import time
from friday_ai.audio.listener import (
    initialize_audio_hardware,
    listen_for_command,
    listen_for_wake_word,
)
from friday_ai.audio.speaker import speak
from friday_ai.brain.router import dispatch_command
from friday_ai.config import ASSISTANT_NAME, DEFAULT_USER, WAKE_WORDS

BANNER = """
\033[91m
  ███████╗██████╗ ██╗██████╗  █████╗ ██╗   ██╗
  ██╔════╝██╔══██╗██║██╔══██╗██╔══██╗╚██╗ ██╔╝
  █████╗  ██████╔╝██║██║  ██║███████║ ╚████╔╝ 
  ██╔══╝  ██╔══██╗██║██║  ██║██╔══██║  ╚██╔╝  
  ██║     ██║  ██║██║██████╔╝██║  ██║   ██║   
  ╚═╝     ╚═╝  ╚═╝╚═╝╚═════╝ ╚═╝  ╚═╝   ╚═╝   
\033[0m
  \033[93mTACTICAL NEURAL VOICE ASSISTANT // MARK IV ARCHITECTURE\033[0m
  \033[90m--------------------------------------------------------\033[0m
"""


def run_assistant():
    print(BANNER)
    print(f"[*] Initializing {ASSISTANT_NAME} audio pipelines...")

    # 1. Hardware Calibration & Adaptive Ambient Adjustment
    try:
        initialize_audio_hardware()
    except Exception as e:
        print(f"[!] Hardware initialization notice: {e}")

    # 2. Startup Greeting
    greeting = f"All systems operational, {DEFAULT_USER}. F.R.I.D.A.Y. is online and standing by."
    speak(greeting, block=True)

    print("\n" + "=" * 58)
    print(f"  READY. Say '\033[92mFriday\033[0m' or '\033[92mHey Friday\033[0m' to activate.")
    print("  Press Ctrl+C in terminal anytime to terminate.")
    print("=" * 58 + "\n")

    # 3. Autonomous Zero-Crash Loop
    while True:
        try:
            # Passive background wake-word listening (<5% CPU)
            detected = listen_for_wake_word()

            if detected:
                print("\n\033[92m[>>> WAKE WORD DETECTED! <<<]\033[0m")
                # Immediate voice acknowledgment
                speak("Yes, Boss?", block=True)

                # Capture command
                user_command = listen_for_command(timeout=6.0, phrase_time_limit=10.0)

                if user_command:
                    # Check for exit / shutdown commands
                    if any(term in user_command.lower() for term in ["shutdown", "go to sleep", "exit friday", "power down"]):
                        farewell = f"Powering down tactical protocols. Have a good one, {DEFAULT_USER}."
                        speak(farewell, block=True)
                        print("\n[F.R.I.D.A.Y. Shutdown Complete]")
                        break

                    # Dispatch command to Tools or LLM
                    print(f"[\033[94mProcessing Matrix\033[0m] Executing intent...")
                    response = dispatch_command(user_command)

                    # Speak output via non-blocking audio queue
                    speak(response, block=False)
                else:
                    # Graceful voice fallback cue on timeout/silence
                    speak("I didn't catch that, Boss. Standing by.", block=False)

            # Micro-sleep to keep idle CPU well below 5%
            time.sleep(0.05)

        except KeyboardInterrupt:
            print("\n\n[Session interrupted by user]")
            speak(f"Good day, {DEFAULT_USER}.", block=True)
            break
        except Exception as e:
            # Zero-Crash Guard: Never let an unhandled error kill the assistant
            print(f"[Core Exception Handled]: {e}")
            time.sleep(1.0)


if __name__ == "__main__":
    run_assistant()
