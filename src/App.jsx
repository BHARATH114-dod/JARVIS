import React, { useState, useEffect, useRef } from "react";
import {
  Mic, MicOff, Send, Volume2, VolumeX, Key, Cpu, Shield,
  Terminal, Sparkles, User, RefreshCw, Layers, Radio, Activity,
  Check, Copy, Settings, Trash2
} from "lucide-react";
import ArcWave from "./components/ArcWave";
import { askJarvis } from "./services/gemini";

export default function App() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("jarvis_chat_history");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [
      {
        id: 1,
        role: "ai",
        text: "Online and ready, Sir. All secondary diagnostics report optimal parameters. How may I assist your current endeavor?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // 'idle' | 'listening' | 'thinking' | 'speaking'
  const [apiKey, setApiKey] = useState(() => 
    localStorage.getItem("jarvis_gemini_api_key") || 
    import.meta.env.VITE_GEMINI_API_KEY || 
    ""
  );
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const micStreamRef = useRef(null);

  // Save chat history to localStorage
  useEffect(() => {
    localStorage.setItem("jarvis_chat_history", JSON.stringify(messages));
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Save API key
  const handleSaveApiKey = (key) => {
    setApiKey(key.trim());
    localStorage.setItem("jarvis_gemini_api_key", key.trim());
    setShowKeyModal(false);
  };

  // Text-To-Speech (Jarvis Voice)
  const speakText = (text) => {
    if (!soundEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    // Clean markdown before speaking
    const cleanText = text.replace(/[*#`_~]/g, "").slice(0, 350);
    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Pick best available English voice
    const voices = window.speechSynthesis.getVoices();
    const jarvisVoice = voices.find(v => 
      v.lang.includes("en") && (v.name.includes("UK") || v.name.includes("David") || v.name.includes("Male") || v.name.includes("Natural"))
    ) || voices.find(v => v.lang.startsWith("en"));

    if (jarvisVoice) utterance.voice = jarvisVoice;
    utterance.rate = 1.02;
    utterance.pitch = 0.95;

    utterance.onstart = () => {
      setStatus("speaking");
      setAudioLevel(0.65);
    };
    utterance.onend = () => {
      setStatus("idle");
      setAudioLevel(0);
    };
    utterance.onerror = () => {
      setStatus("idle");
      setAudioLevel(0);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Speech Recognition (Mic Input)
  const toggleListening = async () => {
    if (status === "listening") {
      recognitionRef.current?.stop();
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
      setStatus("idle");
      setAudioLevel(0);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Brave.");
      return;
    }

    try {
      // Connect real microphone amplitude to wave visualization
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkMicVolume = () => {
        if (recognitionRef.current?.isListening) {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(1, avg / 128));
          requestAnimationFrame(checkMicVolume);
        }
      };

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        recognition.isListening = true;
        setStatus("listening");
        checkMicVolume();
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          handleSend(transcript);
        }
      };

      recognition.onend = () => {
        recognition.isListening = false;
        if (status === "listening") setStatus("idle");
        setAudioLevel(0);
        stream.getTracks().forEach(track => track.stop());
      };

      recognition.onerror = () => {
        recognition.isListening = false;
        setStatus("idle");
        setAudioLevel(0);
      };

      recognition.start();
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Please allow microphone permissions to speak to Jarvis.");
    }
  };

  // Submit Prompt to Jarvis
  const handleSend = async (userPrompt = input) => {
    const trimmed = userPrompt.trim();
    if (!trimmed || status === "thinking") return;

    const newMsg = {
      id: Date.now(),
      role: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setStatus("thinking");

    const reply = await askJarvis({
      prompt: trimmed,
      history: messages,
      apiKey: apiKey,
    });

    const aiMsg = {
      id: Date.now() + 1,
      role: "ai",
      text: reply.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, aiMsg]);
    setStatus("idle");

    if (soundEnabled) {
      speakText(reply.text);
    }
  };

  const clearChat = () => {
    const reset = [
      {
        id: 1,
        role: "ai",
        text: "Context window purged. Neural buffer re-initialized. Ready for your instructions.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    setMessages(reset);
    localStorage.removeItem("jarvis_chat_history");
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#05070e] text-slate-200">
      {/* Background Cybernetic Glow & Arc Grid */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-cyan-500/10 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-32 right-10 h-96 w-96 rounded-full bg-violet-600/15 blur-[120px]" />

      {/* TOP HEADER */}
      <header className="relative z-20 flex items-center justify-between border-b border-cyan-500/20 bg-black/40 px-6 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/60 bg-cyan-950/40 shadow-[0_0_20px_rgba(0,243,255,0.4)]">
            <Radio className="h-5 w-5 text-cyan-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-orbitron text-lg font-extrabold tracking-widest text-cyan-300">
                J.A.R.V.I.S.
              </span>
              <span className="rounded bg-cyan-400/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300 border border-cyan-400/30">
                MARK VII
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              ONLINE // NEURAL LINK ACTIVE
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs transition ${
              soundEnabled
                ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                : "border-slate-800 bg-black/40 text-slate-500"
            }`}
            title="Toggle Voice Output"
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span className="hidden sm:inline">{soundEnabled ? "VOICE ON" : "MUTED"}</span>
          </button>

          <button
            onClick={() => setShowKeyModal(true)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs transition ${
              apiKey
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/50 bg-amber-500/15 text-amber-300 animate-pulse"
            }`}
          >
            <Key size={14} />
            <span>{apiKey ? "API CONNECTED" : "CONFIGURE API KEY"}</span>
          </button>

          <button
            onClick={clearChat}
            className="rounded-lg border border-slate-800 p-2 text-slate-400 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
            title="Clear Chat History"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-12 max-w-6xl mx-auto w-full">
        {/* BIG HOLOGRAPHIC WAVE STRUCTURE */}
        <section className="mb-4 shrink-0">
          <ArcWave state={status} audioLevel={audioLevel} />
        </section>

        {/* CONVERSATION STREAM */}
        <div className="flex-1 space-y-4 overflow-y-auto pr-2 rounded-xl">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "ai" ? "" : "flex-row-reverse"}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                  msg.role === "ai"
                    ? "border-cyan-400/50 bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(0,243,255,0.25)]"
                    : "border-violet-400/50 bg-violet-500/10 text-violet-300"
                }`}
              >
                {msg.role === "ai" ? <Sparkles size={16} /> : <User size={16} />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl border px-4 py-3 backdrop-blur-md ${
                  msg.role === "ai"
                    ? "border-cyan-500/20 bg-cyan-950/20 text-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
                    : "border-violet-500/30 bg-violet-950/30 text-violet-100"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-4 font-mono text-[10px] text-slate-400">
                  <span className="font-semibold uppercase tracking-wider text-cyan-400">
                    {msg.role === "ai" ? "J.A.R.V.I.S." : "COMMAND"}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed text-sm font-sans">
                  {msg.text}
                </p>
              </div>
            </div>
          ))}

          {status === "thinking" && (
            <div className="flex gap-3 items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-400/50 bg-cyan-500/10 text-cyan-300 animate-pulse">
                <Cpu size={16} />
              </div>
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 px-4 py-2 text-xs font-mono text-cyan-300 flex items-center gap-2">
                <span>PROCESSING INTENT MATRIX</span>
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
                </span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* INPUT COMMAND HUD */}
        <div className="mt-3 pb-3">
          <div className="relative flex items-center gap-2 rounded-2xl border border-cyan-500/30 bg-black/60 p-2 backdrop-blur-xl shadow-[0_0_30px_rgba(0,243,255,0.15)]">
            {/* MIC BUTTON */}
            <button
              onClick={toggleListening}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-all ${
                status === "listening"
                  ? "border-red-500 bg-red-500/20 text-red-400 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                  : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-500/20"
              }`}
              title="Speak to Jarvis"
            >
              {status === "listening" ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* TEXT INPUT */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={
                status === "listening"
                  ? "Listening to voice input... speak now"
                  : "State your instruction or request, Sir..."
              }
              className="flex-1 bg-transparent px-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-sans"
            />

            {/* SEND BUTTON */}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || status === "thinking"}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-black font-semibold transition hover:brightness-110 disabled:opacity-30 disabled:hover:brightness-100 shadow-[0_0_15px_rgba(0,243,255,0.4)]"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </main>

      {/* API KEY CONFIGURATION MODAL */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/40 bg-[#0a0d18] p-6 shadow-[0_0_50px_rgba(0,243,255,0.2)]">
            <h3 className="font-orbitron text-lg font-bold text-cyan-300 mb-2 flex items-center gap-2">
              <Shield size={20} className="text-cyan-400" />
              API ACCESS SECURITY
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-sans leading-relaxed">
              To connect Jarvis to Google's Gemini 1.5 Flash brain for free:
              <br />
              1. Visit <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-cyan-400 underline">Google AI Studio</a>.
              <br />
              2. Click <strong>"Get API Key"</strong> and generate a free key.
            </p>

            <input
              type="password"
              placeholder="Paste AIzaSy... API key here"
              defaultValue={apiKey}
              id="apiKeyInput"
              className="w-full rounded-xl border border-cyan-500/30 bg-black/50 px-4 py-2.5 font-mono text-sm text-cyan-200 placeholder-slate-600 focus:border-cyan-400 focus:outline-none mb-4"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowKeyModal(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-mono text-slate-400 hover:bg-white/5"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  const val = document.getElementById("apiKeyInput").value;
                  handleSaveApiKey(val);
                }}
                className="rounded-xl bg-cyan-400 px-5 py-2 text-xs font-bold text-black hover:bg-cyan-300 shadow-[0_0_15px_rgba(0,243,255,0.4)]"
              >
                ENGAGE LINK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
