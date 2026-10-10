import React, { useState, useEffect, useRef } from "react";
import {
  Mic, MicOff, Send, Volume2, VolumeX, Key, Cpu, Shield,
  Radio, Sparkles, User, Settings, Trash2, UserCheck, MessageSquare,
  Activity, Zap, Orbit, Globe, Terminal, AlertCircle
} from "lucide-react";
import ArcWave from "./components/ArcWave";
import JarvisArcFace from "./components/JarvisArcFace";
import { askJarvis } from "./services/gemini";

export default function App() {
  // Stored User Name (asks on first visit)
  const [userName, setUserName] = useState(() => localStorage.getItem("jarvis_user_name") || "");
  const [nameInput, setNameInput] = useState("");
  const [showNameModal, setShowNameModal] = useState(() => !localStorage.getItem("jarvis_user_name"));

  // Chat History
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("jarvis_chat_history");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    const currentName = localStorage.getItem("jarvis_user_name") || "Sir";
    return [
      {
        id: 1,
        role: "ai",
        text: `At your service, ${currentName}. All secondary protocols report nominal parameters. How may I assist your current endeavor?`,
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

  // Stark Telemetry data for HUD aesthetic
  const [hudStats, setHudStats] = useState({ coreTemp: 98.4, flux: 400, linkSpeed: 1.2 });

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const micStreamRef = useRef(null);

  // Dynamic HUD telemetry simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setHudStats({
        coreTemp: +(97 + Math.random() * 2).toFixed(1),
        flux: 395 + Math.floor(Math.random() * 12),
        linkSpeed: +(1.15 + Math.random() * 0.15).toFixed(2),
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem("jarvis_chat_history", JSON.stringify(messages));
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Clean text and ensure smooth British pronunciation of "Jarvis"
  const prepareSpeechText = (raw) => {
    return raw
      .replace(/J\.A\.R\.V\.I\.S\./gi, "Jarvis") // Pronounce as fluid word "Jarvis", not letters!
      .replace(/J-A-R-V-I-S/gi, "Jarvis")
      .replace(/[*#`_~]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Text-To-Speech (Paul Bettany British AI voice reproduction)
  const speakText = (text) => {
    if (!soundEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const clean = prepareSpeechText(text).slice(0, 450);
    const utterance = new SpeechSynthesisUtterance(clean);

    const applyVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      // Prioritize natural British male voices (Paul Bettany profile)
      const britishVoice = voices.find(v => 
        (v.lang === "en-GB" || v.lang.includes("GB") || v.name.toLowerCase().includes("uk")) &&
        (v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("george") || v.name.toLowerCase().includes("natural") || v.name.toLowerCase().includes("david"))
      ) || voices.find(v => v.lang.includes("GB")) 
        || voices.find(v => v.lang.startsWith("en"));

      if (britishVoice) utterance.voice = britishVoice;
      utterance.rate = 1.0; // Crisp, dignified cadence
      utterance.pitch = 0.94; // Deep, composed Paul Bettany British tone

      utterance.onstart = () => {
        setStatus("speaking");
        setAudioLevel(0.7);
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

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = applyVoice;
    } else {
      applyVoice();
    }
  };

  // Welcome user once name is declared
  const handleSaveName = (e) => {
    e?.preventDefault();
    const finalName = nameInput.trim() || "Sir";
    setUserName(finalName);
    localStorage.setItem("jarvis_user_name", finalName);
    setShowNameModal(false);

    const welcomeMsg = `Greetings, ${finalName}. I am Jarvis. All primary systems are online and calibrated to your biometric specifications. Ready when you are.`;
    setMessages([
      {
        id: Date.now(),
        role: "ai",
        text: welcomeMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    // Speak welcome message seamlessly
    setTimeout(() => {
      speakText(welcomeMsg);
    }, 200);
  };

  // Speech Recognition (Microphone)
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

    const SpeechRecognition = window.SpeechRecognition || window.webkitAudioContext;
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Microphone recognition is supported in Chrome, Edge, and Brave.");
      return;
    }

    try {
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
          setAudioLevel(Math.min(1, avg / 110));
          requestAnimationFrame(checkMicVolume);
        }
      };

      const recognition = new SpeechRec();
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
      console.error("Microphone error:", err);
      alert("Please grant microphone permissions to speak to Jarvis.");
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
      userName: userName || "Sir",
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
    const currentName = userName || "Sir";
    const reset = [
      {
        id: 1,
        role: "ai",
        text: `Diagnostics wiped clean, ${currentName}. All registers restored. Standing by.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    setMessages(reset);
    localStorage.removeItem("jarvis_chat_history");
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#03050c] text-slate-100 font-sans">
      {/* STARK INDUSTRIES AMBIENT RADIAL LIGHTS */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[550px] w-[950px] rounded-full bg-cyan-500/15 blur-[150px]" />
      <div className="pointer-events-none absolute -bottom-40 right-10 h-[450px] w-[500px] rounded-full bg-blue-600/15 blur-[130px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[radial-gradient(#00f3ff_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* TOP HUD BAR */}
      <header className="relative z-20 flex items-center justify-between border-b border-cyan-500/20 bg-black/50 px-5 py-2.5 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/60 bg-cyan-950/40 shadow-[0_0_20px_rgba(0,243,255,0.4)]">
            <Orbit className="h-5 w-5 text-cyan-300 animate-spin [animation-duration:12s]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-orbitron text-lg font-black tracking-widest text-cyan-300 drop-shadow-[0_0_10px_rgba(0,243,255,0.6)]">
                J.A.R.V.I.S.
              </span>
              <span className="rounded bg-cyan-400/10 px-1.5 py-0.5 font-mono text-[9px] text-cyan-300 border border-cyan-400/30">
                MARK VII // STARK OS
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              ONLINE // PROTOCOL: <span className="font-bold text-cyan-200">{userName || "GUEST"}</span>
            </div>
          </div>
        </div>

        {/* Real-time Stark HUD Telemetry */}
        <div className="hidden md:flex items-center gap-6 font-mono text-[11px] text-slate-400 border-x border-cyan-500/20 px-6">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-amber-400" />
            <span>FLUX: <strong className="text-cyan-300">{hudStats.flux}%</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-cyan-400" />
            <span>CORE: <strong className="text-emerald-400">{hudStats.coreTemp}°C</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-blue-400" />
            <span>LINK: <strong className="text-cyan-300">{hudStats.linkSpeed} TB/s</strong></span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNameModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/20 px-2.5 py-1.5 font-mono text-xs text-cyan-300 hover:border-cyan-400 transition"
            title="Change User Name"
          >
            <UserCheck size={14} />
            <span className="hidden sm:inline">{userName || "SET NAME"}</span>
          </button>

          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) speakText(`Audio feed restored, ${userName || "Sir"}.`);
              else window.speechSynthesis.cancel();
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs transition ${
              soundEnabled
                ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(0,243,255,0.2)]"
                : "border-slate-800 bg-black/40 text-slate-500"
            }`}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span className="hidden sm:inline">{soundEnabled ? "VOICE" : "MUTED"}</span>
          </button>

          <button
            onClick={() => setShowKeyModal(true)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs transition ${
              apiKey
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/50 bg-amber-500/15 text-amber-300 animate-pulse"
            }`}
          >
            <Key size={14} />
            <span className="hidden sm:inline">{apiKey ? "API ACTIVE" : "API KEY"}</span>
          </button>

          <button
            onClick={clearChat}
            className="rounded-lg border border-slate-800 p-2 text-slate-400 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 transition"
            title="Clear Chat Logs"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </header>

      {/* MAIN CONSOLE INTERFACE */}
      <main className="relative z-10 flex min-h-0 flex-1 flex-col px-4 py-2 sm:px-12 max-w-6xl mx-auto w-full">
        {/* CENTER STAGE: PHOTOREALISTIC STARK ARC REACTOR FACE */}
        <section className="shrink-0 flex flex-col items-center justify-center my-0">
          <JarvisArcFace state={status} audioLevel={audioLevel} />
          <div className="font-mono text-[11px] tracking-widest text-cyan-400/80 -mt-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
            STARK ARC MATRIX // STATUS: <span className="text-cyan-200 font-bold uppercase">{status}</span>
          </div>
        </section>

        {/* MIDDLE: DIALOGUE FEED */}
        <div className="flex-1 space-y-3 overflow-y-auto pr-2 rounded-xl my-2 max-h-[34vh]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "ai" ? "" : "flex-row-reverse"}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                  msg.role === "ai"
                    ? "border-cyan-400/50 bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(0,243,255,0.3)]"
                    : "border-blue-400/50 bg-blue-500/10 text-blue-300"
                }`}
              >
                {msg.role === "ai" ? <Sparkles size={16} /> : <User size={16} />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl border px-4 py-2.5 backdrop-blur-md ${
                  msg.role === "ai"
                    ? "border-cyan-500/25 bg-cyan-950/25 text-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
                    : "border-blue-500/30 bg-blue-950/30 text-blue-100"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-4 font-mono text-[10px] text-slate-400">
                  <span className="font-semibold uppercase tracking-wider text-cyan-400">
                    {msg.role === "ai" ? "J.A.R.V.I.S." : userName || "COMMAND"}
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
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/25 px-4 py-2 text-xs font-mono text-cyan-300 flex items-center gap-2">
                <span>PROCESSING TELEMETRY MATRIX</span>
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

        {/* BOTTOM SECTION: BIG WAVEFORM + INPUT COMMAND BAR */}
        <section className="shrink-0 space-y-2 mt-auto pb-2">
          {/* BIG DYNAMIC WAVEFORM AT BOTTOM */}
          <ArcWave state={status} audioLevel={audioLevel} />

          {/* INPUT BAR */}
          <div className="relative flex items-center gap-2 rounded-2xl border border-cyan-500/30 bg-black/75 p-2 backdrop-blur-2xl shadow-[0_0_35px_rgba(0,243,255,0.18)]">
            {/* MIC BUTTON */}
            <button
              onClick={toggleListening}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-all ${
                status === "listening"
                  ? "border-red-500 bg-red-500/25 text-red-400 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                  : "border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:border-cyan-300 hover:bg-cyan-500/20 shadow-[0_0_12px_rgba(0,243,255,0.2)]"
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
                  : `Ask Jarvis anything, ${userName || "Sir"}...`
              }
              className="flex-1 bg-transparent px-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-sans"
            />

            {/* SEND BUTTON */}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || status === "thinking"}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-black font-semibold transition hover:brightness-110 disabled:opacity-30 disabled:hover:brightness-100 shadow-[0_0_18px_rgba(0,243,255,0.4)]"
            >
              <Send size={18} />
            </button>
          </div>
        </section>
      </main>

      {/* IDENTITY PROTOCOL MODAL */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4">
          <form 
            onSubmit={handleSaveName}
            className="w-full max-w-md rounded-2xl border border-cyan-500/40 bg-[#070b16] p-7 shadow-[0_0_70px_rgba(0,243,255,0.35)] text-center"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/50 bg-cyan-500/10 text-cyan-300 shadow-[0_0_20px_rgba(0,243,255,0.3)]">
              <User size={28} />
            </div>

            <h3 className="font-orbitron text-xl font-black text-cyan-300 mb-1 tracking-wider">
              BIOMETRIC PROTOCOL
            </h3>
            <p className="text-xs text-slate-400 mb-5 font-sans leading-relaxed">
              Welcome to the Stark Industries interface. Please declare your name so J.A.R.V.I.S. may address you with proper protocol.
            </p>

            <input
              type="text"
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter your name (e.g. Bharath)"
              className="w-full rounded-xl border border-cyan-500/40 bg-black/60 px-4 py-3 font-mono text-center text-cyan-200 placeholder-slate-600 focus:border-cyan-400 focus:outline-none mb-5 text-base"
            />

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 py-3 font-orbitron text-xs font-bold tracking-widest text-black hover:brightness-110 shadow-[0_0_20px_rgba(0,243,255,0.4)]"
            >
              INITIALIZE PROTOCOLS
            </button>
          </form>
        </div>
      )}

      {/* API KEY CONFIGURATION MODAL */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/40 bg-[#0a0d18] p-6 shadow-[0_0_50px_rgba(0,243,255,0.2)]">
            <h3 className="font-orbitron text-lg font-bold text-cyan-300 mb-2 flex items-center gap-2">
              <Shield size={20} className="text-cyan-400" />
              API ACCESS SECURITY
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-sans leading-relaxed">
              Google Gemini 1.5 Flash API Key integration.
              <br />
              Grab your free key at <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-cyan-400 underline">Google AI Studio</a>.
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
                  setApiKey(val.trim());
                  localStorage.setItem("jarvis_gemini_api_key", val.trim());
                  setShowKeyModal(false);
                }}
                className="rounded-xl bg-cyan-400 px-5 py-2 text-xs font-bold text-black hover:bg-cyan-300 shadow-[0_0_15px_rgba(0,243,255,0.4)]"
              >
                SAVE & ENGAGE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
