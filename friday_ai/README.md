# F.R.I.D.A.Y. Autonomous Voice Assistant

Production-grade modular Python AI assistant inspired by Tony Stark's F.R.I.D.A.Y. (Female Replacement Intelligent Digital Assistant Youth).

---

## 🏗️ Modular Architecture
```
friday_ai/
├── config.py             # Wake words, API keys, Anti-Echo lock event & latency settings
├── audio/
│   ├── listener.py       # Zero-crash audio loop, wake-word listener, adaptive ambient calibration
│   └── speaker.py        # Asynchronous non-blocking TTS engine with Anti-Echo lock
├── brain/
│   ├── llm.py           # Gemini brain (gemini-3.5-flash-lite) with 10-turn rolling memory
│   └── router.py        # Sub-millisecond intent dispatcher (System / Web / LLM)
├── tools/
│   ├── system_tools.py  # CPU, RAM, Battery telemetry (psutil), cross-platform app launcher, volume control
│   └── web_tools.py     # Real-time weather, Wikipedia summaries, Google search, time/date
├── main.py              # Main orchestrator loop
└── requirements.txt      # Python dependencies
```

---

## ⚡ Features Enforced
1. **Wake-Word Activation**: Passive background listening triggered strictly by `"Friday"` or `"Hey Friday"`.
2. **Adaptive Noise Calibration**: 1.2-second dynamic ambient room noise adjustment on startup.
3. **Conversational Brain & Persona**: F.R.I.D.A.Y. personality with a rolling **10-turn memory**.
4. **OS & Hardware Automation**:
   - Live CPU, RAM, and Battery telemetry.
   - Cross-platform volume controls (mute, unmute, volume up/down).
   - Desktop application launching (VS Code, Chrome, Spotify, Notepad, Terminal).
5. **Web Capabilities**:
   - Wikipedia 2-sentence voice summaries.
   - Google browser search execution.
   - Real-time weather reporting via wttr.in JSON API.
   - Local time and date formatting.
6. **Text-to-Speech Engine**: Fast, non-blocking asynchronous output queue with female voice selection.
7. **Anti-Echo Feedback Lock**: Threading event lock mutes/pauses microphone capture while FRIDAY is speaking, completely eliminating acoustic self-triggering loops.
8. **Zero-Crash Audio Loop**: Catches `WaitTimeoutError`, `UnknownValueError`, `RequestError`, and device disconnects without terminating.
9. **Latency Budget**: Sub-2s voice response latency using `gemini-3.5-flash-lite` capped at 220 output tokens.
10. **Resource Ceiling**: Passive wake-word detection keeps idle CPU usage well below 5%.

---

## 🚀 How to Run
```powershell
# 1. Install dependencies
pip install -r friday_ai/requirements.txt

# 2. Launch FRIDAY
python -m friday_ai.main
```
