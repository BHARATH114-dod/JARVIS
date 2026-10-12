import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic, MicOff, Send, Volume2, VolumeX, Flame,
  Sparkles, User, Trash2, UserCheck, MessageSquare,
  Plus, PanelLeftClose, PanelLeftOpen, Copy, Check, Zap, Cpu, Radio, Headphones, ExternalLink
} from "lucide-react";
import ArcWave from "./components/ArcWave";
import FourDimensionalDiagram from "./components/FourDimensionalDiagram";
import { askFriday } from "./services/gemini";
import { detectMobileAppIntent, triggerMobileLaunch, SUPPORTED_MOBILE_APPS } from "./utils/mobileLauncher";

export default function App() {
  // User Profile
  const [userName, setUserName] = useState(() => localStorage.getItem("friday_user_name") || "");
  const [nameInput, setNameInput] = useState("");
  const [showNameModal, setShowNameModal] = useState(() => !localStorage.getItem("friday_user_name"));

  // Voice Gender: 'female' (F.R.I.D.A.Y.) | 'male' (J.A.R.V.I.S.)
  const [voiceGender, setVoiceGender] = useState(() => localStorage.getItem("friday_voice_gender") || "female");

  // Language: 'en' for English, 'te' for Telugu
  const [language, setLanguage] = useState(() => localStorage.getItem("friday_lang") || "en");

  // Mobile-aware Sidebar: Closed by default on mobile screens (<768px)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });

  // Chat Sessions list
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem("friday_sessions");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    const initId = "session_" + Date.now();
    const currentName = localStorage.getItem("friday_user_name") || "Boss";
    return [
      {
        id: initId,
        title: "Glass Workspace // Ready",
        createdAt: new Date().toLocaleDateString(),
        messages: [
          {
            id: 1,
            role: "ai",
            text: `Hello ${currentName}. I'm F.R.I.D.A.Y. Glass neural interfaces and audio synthesis are ready. How can I assist you today?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]
      }
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    const saved = localStorage.getItem("friday_active_session");
    return saved || (sessions[0]?.id || "");
  });

  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // 'idle' | 'listening' | 'thinking' | 'speaking'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [copiedId, setCopiedId] = useState(null);

  // Continuous Hands-Free Voice Mode state
  const [autoVoiceMode, setAutoVoiceMode] = useState(false);
  const autoVoiceModeRef = useRef(false);
  const statusRef = useRef("idle");
  const checkMicVolumeRef = useRef(null);

  useEffect(() => {
    autoVoiceModeRef.current = autoVoiceMode;
  }, [autoVoiceMode]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const micStreamRef = useRef(null);
  const startListeningRef = useRef(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem("friday_sessions", JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem("friday_active_session", activeSessionId);
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSessionId, messages, status]);

  useEffect(() => {
    localStorage.setItem("friday_lang", language);
  }, [language]);

  const voiceGenderRef = useRef(voiceGender);

  useEffect(() => {
    voiceGenderRef.current = voiceGender;
    localStorage.setItem("friday_voice_gender", voiceGender);
  }, [voiceGender]);

  // Clean text and ensure smooth pronunciation for speech synthesis
  const prepareSpeechText = (raw) => {
    return raw
      .replace(/F\.R\.I\.D\.A\.Y\./gi, "Friday")
      .replace(/F-R-I-D-A-Y/gi, "Friday")
      .replace(/F R I D A Y/gi, "Friday")
      .replace(/FRIDAY/g, "Friday")
      .replace(/J\.A\.R\.V\.I\.S\./gi, "Jarvis")
      .replace(/J-A-R-V-I-S/gi, "Jarvis")
      .replace(/J A R V I S/gi, "Jarvis")
      .replace(/JARVIS/g, "Jarvis")
      .replace(/[*#`_~]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Text-To-Speech engine with dynamic Female (Friday) & Male (Jarvis) profiles
  const speakText = useCallback((text, forcedGender) => {
    if (!soundEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const activeGender = forcedGender || voiceGenderRef.current;
    const isMaleMode = activeGender === "male";
    const clean = prepareSpeechText(text).slice(0, 480);
    const utterance = new SpeechSynthesisUtterance(clean);

    const applyVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      if (language === "te") {
        // Telugu Speech Synthesis
        const teluguVoices = voices.filter(v => v.lang.toLowerCase().includes("te") || v.lang.toLowerCase().includes("tel"));
        if (teluguVoices.length > 0) {
          utterance.voice = teluguVoices[0];
        }
        utterance.lang = "te-IN";
        utterance.pitch = isMaleMode ? 0.72 : 1.15;
        utterance.rate = 1.0;
      } else {
        // English Speech Synthesis
        const englishVoices = voices.filter(v => v.lang.toLowerCase().startsWith("en"));

        // Known Male Voice Identifiers (Windows: David, Mark, George; Mac/iOS: Daniel, Oliver; Android/Chrome: Guy, Male)
        const MALE_KEYWORDS = ["david", "mark", "george", "guy", "ryan", "oliver", "daniel", "james", "arthur", "richard", "christopher", "thomas", "male", "jarvis", "bernard"];

        // Known Female Voice Identifiers (Windows: Zira, Hazel, Susan; Mac/iOS: Samantha, Victoria, Karen; Android/Chrome: Google US English)
        const FEMALE_KEYWORDS = ["zira", "hazel", "susan", "catherine", "victoria", "linda", "jenny", "samantha", "karen", "serena", "aria", "ava", "fiona", "eva", "stacy", "zoe", "female", "google us english", "google uk english female"];

        if (isMaleMode) {
          // 1. Explicit male name match (Microsoft David on Windows, Microsoft Mark, Daniel on Mac)
          const maleVoice = englishVoices.find(v => {
            const nl = v.name.toLowerCase();
            return MALE_KEYWORDS.some(k => nl.includes(k));
          }) || englishVoices.find(v => {
            // 2. Any voice that does not contain known female keywords
            const nl = v.name.toLowerCase();
            return !FEMALE_KEYWORDS.some(k => nl.includes(k));
          }) || englishVoices[0];

          if (maleVoice) utterance.voice = maleVoice;
          utterance.lang = maleVoice?.lang || "en-US";
          // Deep pitch guarantees distinct masculine tone on every synthesizer
          utterance.pitch = 0.76;
          utterance.rate = 1.0;
        } else {
          // 1. Explicit female name match (Microsoft Zira, Google US English, Samantha)
          const femaleVoice = englishVoices.find(v => {
            const nl = v.name.toLowerCase();
            return FEMALE_KEYWORDS.some(k => nl.includes(k)) || nl.includes("female");
          }) || englishVoices.find(v => {
            const nl = v.name.toLowerCase();
            return !MALE_KEYWORDS.some(k => nl.includes(k));
          }) || englishVoices[0];

          if (femaleVoice) utterance.voice = femaleVoice;
          utterance.lang = femaleVoice?.lang || "en-GB";
          // Higher pitch for graceful feminine Friday tone
          utterance.pitch = 1.15;
          utterance.rate = 1.02;
        }
      }

      utterance.onstart = () => {
        setStatus("speaking");
        statusRef.current = "speaking";
        setAudioLevel(0.7);
        // Anti-Echo Feedback Lock: Stop mic while Friday speaks to avoid self-triggering
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) {}
        }
      };
      utterance.onend = () => {
        setStatus("idle");
        statusRef.current = "idle";
        setAudioLevel(0);

        // CONTINUOUS HANDS-FREE VOICE LOOP:
        // Automatically re-arm microphone after speech concludes
        if (autoVoiceModeRef.current) {
          setTimeout(() => {
            if (autoVoiceModeRef.current && statusRef.current === "idle") {
              startListeningRef.current?.(true);
            }
          }, 450); // 450ms buffer prevents room acoustic echo feedback
        }
      };
      utterance.onerror = () => {
        setStatus("idle");
        statusRef.current = "idle";
        setAudioLevel(0);
        if (autoVoiceModeRef.current) {
          setTimeout(() => {
            if (autoVoiceModeRef.current && statusRef.current === "idle") {
              startListeningRef.current?.(true);
            }
          }, 450);
        }
      };

      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = applyVoice;
    } else {
      applyVoice();
    }
  }, [soundEnabled, language]);

  // Toggle voice gender manually between Female (Friday) and Male (Jarvis)
  const toggleVoiceGender = () => {
    const nextGender = voiceGenderRef.current === "female" ? "male" : "female";
    voiceGenderRef.current = nextGender;
    setVoiceGender(nextGender);

    if (soundEnabled) {
      const confirmText = nextGender === "female"
        ? (language === "te" ? "ఫ్రైడే వాయిస్ ప్రొఫైల్ యాక్టివేట్ చేయబడింది." : "F.R.I.D.A.Y. voice online. How may I help you, Boss?")
        : (language === "te" ? "జార్విస్ వాయిస్ ప్రొఫైల్ యాక్టివేట్ చేయబడింది." : "Jarvis tactical voice online. Standing by for your command, Sir.");
      speakText(confirmText, nextGender);
    }
  };

  // Create New Chat (Glass Session)
  const handleNewChat = () => {
    const newId = "session_" + Date.now();
    const currentName = userName || (voiceGender === "female" ? "Boss" : "Sir");
    const welcome = language === "te"
      ? `నమస్కారం ${currentName}. కొత్త సెషన్ ప్రారంభించబడింది. నేను మీకు ఎలా సహాయపడగలను?`
      : `Hello ${currentName}. New session initialized. How can I assist you?`;

    const newSession = {
      id: newId,
      title: `Conversation ${sessions.length + 1}`,
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
    if (window.innerWidth < 768) setSidebarOpen(false); // Close sidebar on mobile
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
    const finalName = nameInput.trim() || (voiceGender === "female" ? "Boss" : "Sir");
    setUserName(finalName);
    localStorage.setItem("friday_user_name", finalName);
    setShowNameModal(false);

    const welcomeMsg = language === "te"
      ? `నమస్కారం ${finalName}. నేను ఫ్రైడే. మార్క్ ఫోర్ సూట్ మీ ఆదేశాలకు సిద్ధంగా ఉంది.`
      : `Greetings, ${finalName}. I'm F.R.I.D.A.Y. All telemetry suites and 4D neural algorithms are calibrated to your command. Ready when you are.`;

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

  // Speech Recognition (Microphone) - Manual & Hands-Free
  const startListening = async (isAuto = false) => {
    // Anti-Echo Protection: Do not listen while Friday is speaking or thinking
    if (statusRef.current === "speaking" || statusRef.current === "thinking") {
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      if (!isAuto) alert("Microphone speech recognition is supported in Chrome, Edge, Safari, and Brave.");
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }

      if (!micStreamRef.current) {
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
        checkMicVolumeRef.current = checkMicVolume;
      }

      const recognition = new SpeechRec();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === "te" ? "te-IN" : "en-US";

      recognition.onstart = () => {
        recognition.isListening = true;
        setStatus("listening");
        statusRef.current = "listening";
        if (checkMicVolumeRef.current) checkMicVolumeRef.current();
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && transcript.trim()) {
          try { recognition.stop(); } catch (e) {}
          setStatus("thinking");
          statusRef.current = "thinking";
          setInput(transcript);
          handleSend(transcript);
        }
      };

      recognition.onend = () => {
        recognition.isListening = false;
        // In Auto Voice mode: If recognition times out due to silence, automatically restart!
        if (autoVoiceModeRef.current && statusRef.current === "listening") {
          setTimeout(() => {
            if (autoVoiceModeRef.current && statusRef.current === "listening") {
              startListening(true);
            }
          }, 350);
        } else if (statusRef.current === "listening") {
          setStatus("idle");
          statusRef.current = "idle";
          setAudioLevel(0);
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition notice:", event?.error);
        if (event?.error === "no-speech") {
          if (autoVoiceModeRef.current && statusRef.current === "listening") {
            setTimeout(() => {
              if (autoVoiceModeRef.current && statusRef.current === "listening") {
                startListening(true);
              }
            }, 350);
            return;
          }
        }
        recognition.isListening = false;
        if (statusRef.current === "listening") {
          setStatus("idle");
          statusRef.current = "idle";
        }
        setAudioLevel(0);
        if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
          setAutoVoiceMode(false);
          autoVoiceModeRef.current = false;
          alert("Microphone permission was blocked. Please tap the lock / settings icon next to the URL in your browser and allow Microphone access.");
        }
      };

      recognition.start();
    } catch (err) {
      console.error("Microphone error:", err);
      if (!isAuto) alert("Please grant microphone permissions to speak with F.R.I.D.A.Y.");
    }
  };

  startListeningRef.current = startListening;

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    setStatus("idle");
    statusRef.current = "idle";
    setAudioLevel(0);
  };

  const toggleListening = () => {
    if (status === "listening") {
      stopListening();
    } else {
      startListening(false);
    }
  };

  // Toggle Hands-Free Continuous Voice Mode
  const toggleAutoVoiceMode = () => {
    const nextMode = !autoVoiceMode;
    setAutoVoiceMode(nextMode);
    autoVoiceModeRef.current = nextMode;

    if (nextMode) {
      const confirmText = language === "te"
        ? "హ్యాండ్స్-ఫ్రీ వాయిస్ మోడ్ ఆన్ చేయబడింది. మాట్లాడండి."
        : "Hands-free voice mode active. Speak anytime, Boss.";
      speakText(confirmText, voiceGenderRef.current);
    } else {
      window.speechSynthesis.cancel();
      stopListening();
    }
  };

  // Submit Prompt to F.R.I.D.A.Y.
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
          title: firstUser ? trimmed.slice(0, 24) + (trimmed.length > 24 ? "..." : "") : s.title,
          messages: [...s.messages, newMsg]
        };
      }
      return s;
    }));

    setInput("");
    setStatus("thinking");

    // Check for Mobile App Launch Intent (Deep-Linking)
    const mobileIntent = detectMobileAppIntent(trimmed, language);
    if (mobileIntent) {
      const aiMsg = {
        id: Date.now() + 1,
        role: "ai",
        text: mobileIntent.replyText,
        actionUrl: mobileIntent.launchUrl,
        appName: mobileIntent.app.name,
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
        speakText(mobileIntent.replyText, voiceGenderRef.current);
      }

      // Automatically launch native mobile application
      setTimeout(() => {
        triggerMobileLaunch(mobileIntent.launchUrl);
      }, 350);

      return;
    }

    const reply = await askFriday({
      prompt: trimmed,
      history: messages,
      userName: userName || (voiceGenderRef.current === "female" ? "Boss" : "Sir"),
      language: language,
      voiceGender: voiceGenderRef.current,
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
      speakText(reply.text, voiceGenderRef.current);
    }
  };

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-[#090d16] text-slate-100 font-sans selection:bg-cyan-500/25">
      
      {/* AMBIENT FROSTED GLASS BACKGROUND REFLECTIONS */}
      <div className="pointer-events-none absolute -top-36 -left-36 h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-36 -right-36 h-[28rem] w-[28rem] rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/3 -translate-y-1/2 h-80 w-80 rounded-full bg-blue-500/8 blur-[100px]" />

      {/* MOBILE BACKDROP OVERLAY */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* 1. LEFT SIDEBAR: ARCHIVES / SESSIONS */}
      <aside 
        className={`fixed md:relative inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-slate-950/75 md:bg-white/[0.02] backdrop-blur-2xl transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-72 translate-x-0" : "w-0 -translate-x-full md:w-0 overflow-hidden border-r-0"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span className="font-mono text-xs font-semibold tracking-wider text-slate-200">
              ARCHIVES
            </span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
            title="Collapse Sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* New Session Button */}
        <div className="p-3 shrink-0">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] hover:border-white/25 py-2.5 font-mono text-xs font-medium text-white transition shadow-sm active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>NEW CHAT</span>
          </button>
        </div>

        {/* Mobile App Quick Launch Panel */}
        <div className="px-3 pb-2 shrink-0">
          <div className="px-1 py-1 font-mono text-[9px] text-slate-400 uppercase tracking-widest flex items-center justify-between">
            <span>App Launch</span>
            <span className="text-[8px] text-cyan-400">Glass Link</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {SUPPORTED_MOBILE_APPS.slice(0, 4).map((app) => (
              <button
                key={app.id}
                onClick={() => triggerMobileLaunch(app.webUrl)}
                className="flex flex-col items-center justify-center p-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.09] text-[10px] font-mono text-slate-200 transition active:scale-95 shadow-sm"
                title={`Launch ${app.name}`}
              >
                <span className="truncate">{app.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          <div className="px-2 py-1 font-mono text-[9px] text-slate-400 uppercase tracking-widest">
            Recent Conversations
          </div>
          {sessions.map((sess) => (
            <div
              key={sess.id}
              onClick={() => {
                setActiveSessionId(sess.id);
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              className={`group flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer text-xs transition ${
                activeSessionId === sess.id
                  ? "bg-white/[0.12] text-white border border-white/20 font-medium shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
                  : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <MessageSquare size={14} className={activeSessionId === sess.id ? "text-cyan-400 shrink-0" : "text-slate-500 shrink-0"} />
                <span className="truncate">{sess.title}</span>
              </div>
              <button
                onClick={(e) => handleDeleteSession(sess.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition"
                title="Delete transcript"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Sidebar Footer User Info */}
        <div className="border-t border-white/10 p-3 flex items-center justify-between font-mono text-xs shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white font-semibold">
              {userName ? userName[0].toUpperCase() : "U"}
            </div>
            <span className="text-slate-200 font-medium truncate max-w-[120px]">{userName || "User"}</span>
          </div>
          <button
            onClick={() => setShowNameModal(true)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
            title="Edit Profile"
          >
            <UserCheck size={16} />
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE / CHAT INTERFACE */}
      <div className="relative flex flex-1 flex-col overflow-hidden min-w-0">
        
        {/* TOP NAVIGATION HUD */}
        <header className="relative z-20 flex h-14 items-center justify-between border-b border-white/10 bg-slate-950/40 px-3 sm:px-4 backdrop-blur-2xl shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
                title="Open Archives"
              >
                <PanelLeftOpen size={20} />
              </button>
            )}

            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-mono text-sm sm:text-base font-bold tracking-widest text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]">
                F.R.I.D.A.Y.
              </span>
              <span className="hidden xs:inline rounded-full bg-white/[0.08] px-2 py-0.5 font-mono text-[9px] text-cyan-300 border border-white/10 backdrop-blur-md">
                GLASS v2.0
              </span>
            </div>
          </div>

          {/* Action HUD Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* HANDS-FREE CONTINUOUS CONVERSATION TOGGLE */}
            <button
              onClick={toggleAutoVoiceMode}
              className={`flex items-center gap-1 sm:gap-1.5 rounded-xl border px-2 sm:px-2.5 py-1 font-mono text-[11px] sm:text-xs transition active:scale-95 backdrop-blur-xl ${
                autoVoiceMode
                  ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)] animate-pulse font-semibold"
                  : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-slate-200"
              }`}
              title="Continuous Hands-Free Conversation: Speak anytime without clicking the mic button"
            >
              <Radio size={13} className={autoVoiceMode ? "text-emerald-400 animate-ping" : "text-slate-500"} />
              <span className="font-medium uppercase">
                {autoVoiceMode ? (
                  <>
                    <span className="hidden sm:inline">HANDS-FREE: </span>ON
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">HANDS-FREE: </span>OFF
                  </>
                )}
              </span>
            </button>

            {/* MANUAL VOICE GENDER SWITCHER: FEMALE (FRIDAY) / MALE (JARVIS) */}
            <button
              onClick={toggleVoiceGender}
              className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 hover:text-white px-2 sm:px-2.5 py-1 font-mono text-[11px] sm:text-xs transition active:scale-95 shadow-sm backdrop-blur-xl"
              title="Click to toggle between Female & Male Voice"
            >
              <Sparkles size={13} className="text-cyan-400" />
              <span className="font-medium uppercase">
                {voiceGender === "female" ? (
                  <>
                    <span className="hidden sm:inline">VOICE: </span>FEMALE
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">VOICE: </span>MALE
                  </>
                )}
              </span>
            </button>

            {/* Language Switcher */}
            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] p-0.5 font-mono text-[11px] sm:text-xs backdrop-blur-xl">
              <button
                onClick={() => {
                  setLanguage("en");
                  speakText(`English mode calibrated, ${userName || "User"}.`);
                }}
                className={`rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 transition ${
                  language === "en"
                    ? "bg-white/20 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => {
                  setLanguage("te");
                  speakText(`తెలుగు భాషలోకి మార్చబడింది, ${userName || "గారు"}.`);
                }}
                className={`rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 transition ${
                  language === "te"
                    ? "bg-white/20 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                TE
              </button>
            </div>

            {/* Voice Mute Toggle */}
            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) speakText(language === "te" ? "ధ్వని పునరుద్ధరించబడింది." : `Audio restored, ${userName || "User"}.`);
                else window.speechSynthesis.cancel();
              }}
              className={`flex items-center rounded-xl border p-1.5 sm:px-2 sm:py-1 font-mono text-xs transition backdrop-blur-xl ${
                soundEnabled
                  ? "border-white/15 bg-white/10 text-white"
                  : "border-white/10 bg-white/[0.03] text-slate-500"
              }`}
              title={soundEnabled ? "Mute Voice" : "Unmute Voice"}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              <span className="hidden md:inline ml-1">{soundEnabled ? "VOICE" : "MUTED"}</span>
            </button>
          </div>
        </header>

        {/* WORKSPACE BODY WITH 4D DIAGRAM IN BACKGROUND */}
        <div className="relative flex min-h-0 flex-1 overflow-hidden bg-transparent">
          
          {/* 4-DIMENSIONAL ROTATING HOLOGRAPHIC DIAGRAM BACKGROUND */}
          <FourDimensionalDiagram state={status} audioLevel={audioLevel} />

          {/* CHAT MESSAGES STREAM */}
          <div className="relative z-10 flex flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-8 sm:py-6 max-w-4xl mx-auto w-full space-y-4 sm:space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 sm:gap-4 ${msg.role === "ai" ? "" : "flex-row-reverse"}`}
              >
                <div
                  className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border backdrop-blur-md ${
                    msg.role === "ai"
                      ? "border-white/15 bg-white/10 text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.2)]"
                      : "border-blue-400/30 bg-blue-500/20 text-blue-200"
                  }`}
                >
                  {msg.role === "ai" ? <Zap size={16} /> : <User size={16} />}
                </div>

                <div
                  className={`relative group max-w-[90%] sm:max-w-[85%] rounded-2xl border px-3.5 py-2.5 sm:px-5 sm:py-3.5 backdrop-blur-xl ${
                    msg.role === "ai"
                      ? "border-white/10 bg-white/[0.06] text-slate-100 shadow-[0_8px_32px_0_rgba(0,0,0,0.25)]"
                      : "border-blue-400/20 bg-blue-600/15 text-slate-100 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)]"
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-3 font-mono text-[10px] sm:text-[11px] text-slate-400 border-b border-white/5 pb-1">
                    <span className={`font-semibold uppercase tracking-wider ${msg.role === "ai" ? "text-cyan-300" : "text-blue-300"}`}>
                      {msg.role === "ai" ? "F.R.I.D.A.Y." : userName || "USER"}
                    </span>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span>{msg.timestamp}</span>
                      <button
                        onClick={() => copyText(msg.text, msg.id)}
                        className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:text-white transition"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  <div className="whitespace-pre-wrap leading-relaxed text-xs sm:text-[14.5px] font-sans selection:bg-cyan-500/25">
                    {msg.text}
                  </div>

                  {msg.actionUrl && (
                    <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
                      <a
                        href={msg.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-1.5 font-mono text-xs text-white font-medium shadow-sm transition active:scale-95 backdrop-blur-md"
                      >
                        <span>Open {msg.appName || "App"}</span>
                        <ExternalLink size={13} />
                      </a>
                      <span className="text-[10px] font-mono text-slate-400">Glass Deep-Link</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {status === "thinking" && (
              <div className="flex gap-2.5 sm:gap-4 items-center">
                <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-cyan-300 animate-pulse backdrop-blur-md">
                  <Cpu size={16} />
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl px-4 py-2.5 sm:px-5 sm:py-3 text-[11px] sm:text-xs font-mono text-slate-300 flex items-center gap-2 sm:gap-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)]">
                  <span>PROCESSING</span>
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
        </div>

        {/* BOTTOM COMMAND DOCK WITH OPTIMIZED HARMONIC WAVE */}
        <div className="relative z-20 border-t border-white/10 bg-slate-950/40 p-2 sm:p-3 sm:px-8 backdrop-blur-2xl pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">
          <div className="max-w-4xl mx-auto space-y-1.5 sm:space-y-2">
            
            {/* Hands-Free Mode Glowing Status Ribbon */}
            {autoVoiceMode && (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-500/15 border border-emerald-400/30 px-3 py-1.5 font-mono text-[11px] text-emerald-300 shadow-[0_4px_20px_rgba(16,185,129,0.15)] backdrop-blur-xl animate-pulse">
                <div className="flex items-center gap-2 truncate">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-medium tracking-wide truncate">
                    HANDS-FREE ACTIVE // SPEAK NATURALLY WITHOUT CLICKING
                  </span>
                </div>
                <button
                  onClick={toggleAutoVoiceMode}
                  className="shrink-0 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 px-2 py-0.5 text-[10px] text-emerald-200 transition border border-emerald-400/30 font-medium"
                  title="Pause Hands-Free Voice Mode"
                >
                  PAUSE
                </button>
              </div>
            )}

            <ArcWave state={status} audioLevel={audioLevel} />

            {/* Input Bar */}
            <div className="relative flex items-center gap-1.5 sm:gap-2 rounded-2xl border border-white/15 bg-white/[0.05] p-1.5 sm:p-2 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.25)]">
              {/* Mic Button */}
              <button
                onClick={autoVoiceMode ? toggleAutoVoiceMode : toggleListening}
                className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-95 backdrop-blur-md ${
                  autoVoiceMode
                    ? "border-emerald-400/60 bg-emerald-500/25 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.35)] animate-pulse"
                    : status === "listening"
                    ? "border-red-400/50 bg-red-500/30 text-red-200 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                    : "border-white/15 bg-white/[0.08] text-white/80 hover:border-white/30 hover:bg-white/[0.14] hover:text-white"
                }`}
                title={
                  autoVoiceMode
                    ? "Hands-Free Voice Mode Active (Click to pause)"
                    : language === "te"
                    ? "తెలుగులో మాట్లాడండి"
                    : "Speak to F.R.I.D.A.Y."
                }
              >
                {status === "listening" || autoVoiceMode ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* Text Input (16px base font size avoids unwanted iOS Safari zooming) */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={
                  autoVoiceMode
                    ? (language === "te" ? "🎙️ హ్యాండ్స్-ఫ్రీ ఆన్‌లో ఉంది... నేరుగా మాట్లాడండి..." : "🎙️ Hands-free mode active... just speak!")
                    : status === "listening"
                    ? (language === "te" ? "వాయిస్ వింటున్నాను... మాట్లాడండి..." : "Listening to your voice... speak now")
                    : (language === "te" ? `ఫ్రైడేను అడగండి, ${userName || "గారు"}...` : `Ask Friday anything, ${userName || "..."}`)
                }
                className="flex-1 bg-transparent px-2.5 sm:px-3 text-base sm:text-sm text-white placeholder-white/40 focus:outline-none font-sans"
              />

              {/* Send Button */}
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || status === "thinking"}
                className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-medium transition active:scale-95 disabled:opacity-20 disabled:hover:bg-white/15 shadow-sm backdrop-blur-md"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* IDENTITY PROTOCOL MODAL */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xl p-4">
          <form 
            onSubmit={handleSaveName}
            className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900/80 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_16px_48px_0_rgba(0,0,0,0.5)] text-center"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-cyan-300 shadow-[0_0_20px_rgba(56,189,248,0.2)] backdrop-blur-md">
              <Zap size={26} />
            </div>

            <h3 className="font-mono text-lg sm:text-xl font-bold text-white mb-1 tracking-wider">
              USER PROFILE
            </h3>
            <p className="text-xs text-slate-400 mb-5 font-sans leading-relaxed">
              Personalize your name to calibrate F.R.I.D.A.Y.'s voice synthesis and conversational responses.
            </p>

            <input
              type="text"
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter your name (e.g. Bharath)"
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 font-mono text-center text-white placeholder-white/30 focus:border-white/35 focus:outline-none mb-5 text-base backdrop-blur-md"
            />

            <button
              type="submit"
              className="w-full rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 py-3 font-mono text-xs font-semibold tracking-wider text-white shadow-sm active:scale-[0.98] transition backdrop-blur-md"
            >
              SAVE & INITIALIZE
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
