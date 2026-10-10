import React, { useState, useEffect, useRef } from "react";
import {
  Mic, MicOff, Send, Volume2, VolumeX, Flame,
  Sparkles, User, Trash2, UserCheck, MessageSquare,
  Plus, PanelLeftClose, PanelLeftOpen, Copy, Check, Zap, Cpu
} from "lucide-react";
import ArcWave from "./components/ArcWave";
import RotatingSuitPlatform from "./components/RotatingSuitPlatform";
import { askJarvis } from "./services/gemini";

export default function App() {
  // User Profile
  const [userName, setUserName] = useState(() => localStorage.getItem("jarvis_user_name") || "");
  const [nameInput, setNameInput] = useState("");
  const [showNameModal, setShowNameModal] = useState(() => !localStorage.getItem("jarvis_user_name"));

  // Language: 'en' for English, 'te' for Telugu
  const [language, setLanguage] = useState(() => localStorage.getItem("jarvis_lang") || "en");

  // Sidebar Open / Close
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Chat Sessions list
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem("jarvis_sessions");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    const initId = "session_" + Date.now();
    return [
      {
        id: initId,
        title: "Mark IV Protocol // Init",
        createdAt: new Date().toLocaleDateString(),
        messages: [
          {
            id: 1,
            role: "ai",
            text: `At your service, ${localStorage.getItem("jarvis_user_name") || "Sir"}. Iron Man Mark IV suit platform is calibrated and standing by. What task shall we attend to?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]
      }
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    const saved = localStorage.getItem("jarvis_active_session");
    return saved || (sessions[0]?.id || "");
  });

  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // 'idle' | 'listening' | 'thinking' | 'speaking'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [copiedId, setCopiedId] = useState(null);

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const micStreamRef = useRef(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];

  useEffect(() => {
    localStorage.setItem("jarvis_sessions", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem("jarvis_active_session", activeSessionId);
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSessionId, messages, status]);

  useEffect(() => {
    localStorage.setItem("jarvis_lang", language);
  }, [language]);

  // Clean text and ensure smooth pronunciation
  const prepareSpeechText = (raw) => {
    return raw
      .replace(/J\.A\.R\.V\.I\.S\./gi, "Jarvis")
      .replace(/J-A-R-V-I-S/gi, "Jarvis")
      .replace(/J A R V I S/gi, "Jarvis")
      .replace(/[*#`_~]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Text-To-Speech (Strictly Male British voice filter)
  const speakText = (text) => {
    if (!soundEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const clean = prepareSpeechText(text).slice(0, 450);
    const utterance = new SpeechSynthesisUtterance(clean);

    const applyVoice = () => {
      const voices = window.speechSynthesis.getVoices();

      if (language === "te") {
        const teluguVoice = voices.find(v => (v.lang.includes("te") || v.lang.includes("tel")) && !v.name.toLowerCase().includes("female"));
        if (teluguVoice) utterance.voice = teluguVoice;
        utterance.lang = "te-IN";
        utterance.pitch = 0.85; // Lowered pitch to guarantee masculine depth
        utterance.rate = 1.0;
      } else {
        // STRICT MALE ONLY FILTER
        const femaleNames = ["female", "zira", "hazel", "susan", "catherine", "victoria", "linda", "jenny", "samantha", "karen", "serena", "moira", "fiona", "tessa", "aria", "ava"];
        
        const isMale = (v) => {
          const lower = v.name.toLowerCase();
          return !femaleNames.some(f => lower.includes(f));
        };

        const britishMale = voices.find(v => 
          (v.lang === "en-GB" || v.lang.includes("GB") || v.name.toLowerCase().includes("uk")) &&
          isMale(v) &&
          (v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("george") || v.name.toLowerCase().includes("david") || v.name.toLowerCase().includes("natural") || v.name.toLowerCase().includes("ryan") || v.name.toLowerCase().includes("oliver"))
        ) || voices.find(v => (v.lang === "en-GB" || v.lang.includes("GB")) && isMale(v))
          || voices.find(v => (v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("guy") || v.name.toLowerCase().includes("david")) && isMale(v))
          || voices.find(v => v.lang.startsWith("en") && isMale(v));

        if (britishMale) utterance.voice = britishMale;
        utterance.lang = "en-GB";
        utterance.pitch = 0.86; // Deep Paul Bettany tone
        utterance.rate = 1.02;  // Fluid natural pacing
      }

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

  // Create New Chat (Stark Protocol)
  const handleNewChat = () => {
    const newId = "session_" + Date.now();
    const currentName = userName || "Sir";
    const welcome = language === "te"
      ? `నమస్కారం ${currentName}. కొత్త మిషన్ ప్రారంభించబడింది. మీరు ఏమి ఆజ్ఞాపించబోతున్నారు?`
      : `Mark IV suit systems initialized, ${currentName}. All weapon and telemetry suites standing by. What are your instructions?`;

    const newSession = {
      id: newId,
      title: `Mission ${sessions.length + 1}`,
      createdAt: new Date().toLocaleDateString(),
      messages: [
        {
          id: Date.now(),
          role: "ai",
          text: welcome,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };

    setSessions([newSession, ...sessions]);
    setActiveSessionId(newId);
    if (soundEnabled) speakText(welcome);
  };

  // Delete Chat Session
  const handleDeleteSession = (id, e) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      handleNewChat();
      return;
    }
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      setActiveSessionId(filtered[0]?.id || "");
    }
  };

  // Welcome user once name is declared
  const handleSaveName = (e) => {
    e?.preventDefault();
    const finalName = nameInput.trim() || "Sir";
    setUserName(finalName);
    localStorage.setItem("jarvis_user_name", finalName);
    setShowNameModal(false);

    const welcomeMsg = language === "te"
      ? `నమస్కారం ${finalName}. నేను జార్విస్. మార్క్ ఫోర్ సూట్ మీ ఆదేశాలకు సిద్ధంగా ఉంది.`
      : `Greetings, ${finalName}. I am Jarvis. Iron Man Mark IV suit systems are calibrated to your biometric specifications. Ready when you are.`;

    const updatedSessions = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: [
            ...s.messages,
            {
              id: Date.now(),
              role: "ai",
              text: welcomeMsg,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]
        };
      }
      return s;
    });

    setSessions(updatedSessions);
    setTimeout(() => speakText(welcomeMsg), 300);
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
      recognition.lang = language === "te" ? "te-IN" : "en-US";

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

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        const firstUser = s.messages.filter(m => m.role === "user").length === 0;
        return {
          ...s,
          title: firstUser ? trimmed.slice(0, 26) + (trimmed.length > 26 ? "..." : "") : s.title,
          messages: [...s.messages, newMsg]
        };
      }
      return s;
    }));

    setInput("");
    setStatus("thinking");

    const reply = await askJarvis({
      prompt: trimmed,
      history: messages,
      userName: userName || "Sir",
      language: language,
    });

    const aiMsg = {
      id: Date.now() + 1,
      role: "ai",
      text: reply.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, messages: [...s.messages, aiMsg] };
      }
      return s;
    }));

    setStatus("idle");

    if (soundEnabled) {
      speakText(reply.text);
    }
  };

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[#0a0305] text-[#f7e6d2] font-sans selection:bg-red-500/30">
      {/* 1. LEFT SIDEBAR: STARK ARCHIVES */}
      <aside 
        className={`relative z-30 flex flex-col border-r border-red-500/15 bg-[#0e0407]/95 transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-64 sm:w-72" : "w-0 -translate-x-full overflow-hidden border-r-0"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-red-500/15 px-4">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-red-400" />
            <span className="font-orbitron text-xs font-bold tracking-wider text-red-200">
              MARK IV ARCHIVES
            </span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/5 hover:text-red-300 transition"
            title="Collapse Sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 py-2.5 font-mono text-xs font-semibold text-red-200 transition hover:border-red-400 hover:bg-red-900/30 shadow-[0_0_12px_rgba(220,38,38,0.12)]"
          >
            <Plus size={16} />
            <span>NEW MISSION</span>
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          <div className="px-2 py-1 font-mono text-[9px] text-neutral-500 uppercase tracking-widest">
            Recent Transcripts
          </div>
          {sessions.map((sess) => (
            <div
              key={sess.id}
              onClick={() => setActiveSessionId(sess.id)}
              className={`group flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer text-xs transition ${
                activeSessionId === sess.id
                  ? "bg-red-950/40 text-red-200 border border-red-500/30 font-medium"
                  : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <MessageSquare size={14} className={activeSessionId === sess.id ? "text-red-400 shrink-0" : "text-neutral-600 shrink-0"} />
                <span className="truncate">{sess.title}</span>
              </div>
              <button
                onClick={(e) => handleDeleteSession(sess.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400 transition"
                title="Delete transcript"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Sidebar Footer User Info */}
        <div className="border-t border-red-500/15 p-3 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-red-900/40 border border-red-500/30 flex items-center justify-center text-red-300 font-bold">
              {userName ? userName[0].toUpperCase() : "T"}
            </div>
            <span className="text-neutral-300 font-medium truncate max-w-[120px]">{userName || "Tony Stark"}</span>
          </div>
          <button
            onClick={() => setShowNameModal(true)}
            className="p-1.5 text-neutral-400 hover:text-red-300 hover:bg-white/5 rounded-lg"
            title="Edit Name"
          >
            <UserCheck size={16} />
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE / CHAT INTERFACE */}
      <div className="relative flex flex-1 flex-col overflow-hidden min-w-0">
        {/* TOP NAVIGATION HUD (SUBTLE MARK IV RED THEME) */}
        <header className="relative z-20 flex h-14 items-center justify-between border-b border-red-500/15 bg-[#0b0305]/85 px-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/5 hover:text-red-300 transition"
                title="Open Sidebar"
              >
                <PanelLeftOpen size={20} />
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="font-orbitron text-base font-extrabold tracking-widest text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                J.A.R.V.I.S.
              </span>
              <span className="rounded bg-red-950/60 px-1.5 py-0.5 font-mono text-[9px] text-amber-300 border border-red-500/30">
                MARK IV // ARMOR OS
              </span>
            </div>
          </div>

          {/* Action HUD Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <div className="flex items-center rounded-xl border border-red-500/20 bg-black/50 p-1 font-mono text-xs">
              <button
                onClick={() => {
                  setLanguage("en");
                  speakText(`English mode calibrated, ${userName || "Sir"}.`);
                }}
                className={`rounded-lg px-2.5 py-1 transition ${
                  language === "en"
                    ? "bg-red-600/90 text-white font-bold shadow-[0_0_10px_rgba(220,38,38,0.4)]"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                ENGLISH
              </button>
              <button
                onClick={() => {
                  setLanguage("te");
                  speakText(`తెలుగు భాషలోకి మార్చబడింది, ${userName || "గారు"}.`);
                }}
                className={`rounded-lg px-2.5 py-1 transition ${
                  language === "te"
                    ? "bg-red-600/90 text-white font-bold shadow-[0_0_10px_rgba(220,38,38,0.4)]"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                తెలుగు (TELUGU)
              </button>
            </div>

            {/* Voice Mute Toggle */}
            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) speakText(language === "te" ? "ధ్వని పునరుద్ధరించబడింది." : `Audio restored, ${userName || "Sir"}.`);
                else window.speechSynthesis.cancel();
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs transition ${
                soundEnabled
                  ? "border-red-500/30 bg-red-950/30 text-red-200"
                  : "border-neutral-800 bg-black/40 text-neutral-500"
              }`}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              <span className="hidden sm:inline">{soundEnabled ? "VOICE" : "MUTED"}</span>
            </button>
          </div>
        </header>

        {/* WORKSPACE BODY WITH ROTATING IRON MAN MARK IV SUIT ON CARRIER PAD */}
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {/* ROTATING SUIT BACKGROUND */}
          <RotatingSuitPlatform state={status} audioLevel={audioLevel} />

          {/* CHAT MESSAGES STREAM */}
          <div className="relative z-10 flex flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-12 max-w-4xl mx-auto w-full space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 ${msg.role === "ai" ? "" : "flex-row-reverse"}`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    msg.role === "ai"
                      ? "border-red-500/40 bg-red-950/30 text-red-300 shadow-[0_0_12px_rgba(220,38,38,0.2)]"
                      : "border-neutral-700 bg-neutral-900/50 text-neutral-300"
                  }`}
                >
                  {msg.role === "ai" ? <Zap size={18} /> : <User size={18} />}
                </div>

                <div
                  className={`relative group max-w-[88%] rounded-2xl border px-5 py-3.5 backdrop-blur-xl ${
                    msg.role === "ai"
                      ? "border-red-500/20 bg-[#120508]/85 text-[#fbf1e8] shadow-[0_6px_24px_rgba(0,0,0,0.4)]"
                      : "border-neutral-800 bg-[#181114]/75 text-neutral-200"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-4 font-mono text-[11px] text-neutral-400 border-b border-white/5 pb-1">
                    <span className="font-semibold uppercase tracking-wider text-red-400">
                      {msg.role === "ai" ? "J.A.R.V.I.S." : userName || "STARK COMMAND"}
                    </span>
                    <div className="flex items-center gap-3">
                      <span>{msg.timestamp}</span>
                      <button
                        onClick={() => copyText(msg.text, msg.id)}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-300 transition"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>

                  <div className="whitespace-pre-wrap leading-relaxed text-[14.5px] font-sans selection:bg-red-500/30">
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}

            {status === "thinking" && (
              <div className="flex gap-4 items-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/40 bg-red-950/30 text-red-300 animate-pulse">
                  <Cpu size={18} />
                </div>
                <div className="rounded-2xl border border-red-500/20 bg-[#120508]/85 px-5 py-3 text-xs font-mono text-red-300 flex items-center gap-3">
                  <span>COMPUTING MARK IV TELEMETRY MATRIX</span>
                  <span className="flex gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-bounce [animation-delay:0.4s]" />
                  </span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* BOTTOM COMMAND DOCK WITH MARK IV HARMONIC WAVE */}
        <div className="relative z-20 border-t border-red-500/15 bg-[#0a0305]/90 p-3 sm:px-12 backdrop-blur-2xl">
          <div className="max-w-4xl mx-auto space-y-2">
            <ArcWave state={status} audioLevel={audioLevel} />

            {/* Input Bar */}
            <div className="relative flex items-center gap-2 rounded-2xl border border-red-500/25 bg-black/80 p-2 shadow-[0_0_25px_rgba(220,38,38,0.1)]">
              {/* Mic Button */}
              <button
                onClick={toggleListening}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all ${
                  status === "listening"
                    ? "border-red-500 bg-red-600/30 text-red-300 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                    : "border-red-500/30 bg-red-950/20 text-red-300 hover:border-red-400 hover:bg-red-900/30"
                }`}
                title={language === "te" ? "తెలుగులో మాట్లాడండి" : "Speak to Jarvis"}
              >
                {status === "listening" ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={
                  status === "listening"
                    ? (language === "te" ? "వాయిస్ వింటున్నాను... మాట్లాడండి..." : "Listening to audio feed... speak now")
                    : (language === "te" ? `జార్విస్‌ను అడగండి, ${userName || "గారు"}...` : `Give your instructions, ${userName || "Sir"}...`)
                }
                className="flex-1 bg-transparent px-3 text-sm text-[#fbf1e8] placeholder-neutral-500 focus:outline-none font-sans"
              />

              {/* Send Button */}
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || status === "thinking"}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-red-600 to-amber-500 text-white font-bold transition hover:brightness-110 disabled:opacity-30 disabled:hover:brightness-100 shadow-[0_0_15px_rgba(220,38,38,0.3)]"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* IDENTITY PROTOCOL MODAL */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <form 
            onSubmit={handleSaveName}
            className="w-full max-w-md rounded-2xl border border-red-500/40 bg-[#0d0407] p-7 shadow-[0_0_60px_rgba(220,38,38,0.3)] text-center"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/50 bg-red-950/40 text-red-300 shadow-[0_0_15px_rgba(220,38,38,0.25)]">
              <Zap size={28} />
            </div>

            <h3 className="font-orbitron text-xl font-bold text-red-300 mb-1 tracking-wider">
              MARK IV BIOMETRICS
            </h3>
            <p className="text-xs text-neutral-400 mb-5 font-sans leading-relaxed">
              State your identity to calibrate the Jarvis suit interface and voice protocols.
            </p>

            <input
              type="text"
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter your name (e.g. Tony Stark or Bharath)"
              className="w-full rounded-xl border border-red-500/30 bg-black/70 px-4 py-3 font-mono text-center text-red-200 placeholder-neutral-600 focus:border-red-400 focus:outline-none mb-5 text-base"
            />

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-red-600 to-amber-500 py-3 font-orbitron text-xs font-bold tracking-widest text-white hover:brightness-110 shadow-[0_0_20px_rgba(220,38,38,0.4)]"
            >
              INITIALIZE PROTOCOLS
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
