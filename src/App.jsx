import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic, MicOff, Send, Volume2, VolumeX, Flame,
  Sparkles, User, Trash2, UserCheck, MessageSquare,
  Plus, PanelLeftClose, PanelLeftOpen, Copy, Check, Zap, Cpu, Radio, Headphones, ExternalLink,
  Sun, Moon, Image as ImageIcon, X as CloseIcon, Eye
} from "lucide-react";
import ArcWave from "./components/ArcWave";
import FourDimensionalDiagram from "./components/FourDimensionalDiagram";
import { askFriday } from "./services/gemini";
import { detectMobileAppIntent, triggerMobileLaunch } from "./utils/mobileLauncher";

export default function App() {
  // Theme: 'pitch-black' (default) | 'light'
  const [theme, setTheme] = useState(() => localStorage.getItem("friday_theme") || "pitch-black");
  const isLight = theme === "light";

  useEffect(() => {
    localStorage.setItem("friday_theme", theme);
    if (theme === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "#f8fafc";
      document.body.style.color = "#0f172a";
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.style.backgroundColor = "#000000";
      document.body.style.color = "#f8fafc";
    }
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "pitch-black" ? "light" : "pitch-black";
    setTheme(next);
    if (soundEnabled) {
      speakText(next === "light" ? "Light theme engaged." : "Pitch black mode engaged.");
    }
  };

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
        title: "Tactical Matrix // Online",
        createdAt: new Date().toLocaleDateString(),
        messages: [
          {
            id: 1,
            role: "ai",
            text: `At your service, ${currentName}. I'm F.R.I.D.A.Y. All tactical armor diagnostics, 4D quantum telemetry, and hands-free neural systems are standing by. What are your orders?`,
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

  // Optical Telemetry (Multimodal Image Input)
  const [stagedImage, setStagedImage] = useState(null); // { previewUrl, base64, mimeType, name, size }
  const [previewModalImage, setPreviewModalImage] = useState(null);
  const fileInputRef = useRef(null);

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

  const chatContainerRef = useRef(null);
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
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
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

  // Create New Chat (Tactical Session)
  const handleNewChat = () => {
    const newId = "session_" + Date.now();
    const currentName = userName || (voiceGender === "female" ? "Boss" : "Sir");
    const welcome = language === "te"
      ? `నమస్కారం ${currentName}. కొత్త మిషన్ ప్రారంభించబడింది. మీరు ఏమి ఆజ్ఞాపించబోతున్నారు?`
      : `Tactical telemetry initialized, ${currentName}. Systems calibrated. What are your orders?`;

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

  // Optical Telemetry Upload & Processing
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
    e.target.value = "";
  };

  const processImageFile = (file) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (JPEG, PNG, WEBP, GIF, SVG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const img = new Image();
      img.onload = () => {
        // High-definition canvas compression to maximize speed and eliminate lag
        const MAX_DIM = 1600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const targetMime = file.type === "image/png" ? "image/png" : "image/jpeg";
        const compressedDataUrl = canvas.toDataURL(targetMime, 0.88);

        const sizeInKB = Math.round((compressedDataUrl.length * 3 / 4) / 1024);
        const sizeFormatted = sizeInKB > 1024 ? `${(sizeInKB / 1024).toFixed(1)} MB` : `${sizeInKB} KB`;

        setStagedImage({
          previewUrl: compressedDataUrl,
          base64: compressedDataUrl,
          mimeType: targetMime,
          name: file.name,
          size: sizeFormatted
        });

        if (soundEnabled) {
          speakText(
            language === "te"
              ? "చిత్రం ఫీడ్ అనుసంధానించబడింది. మీ ప్రశ్నను అడగండి."
              : "Optical telemetry received. Standing by for your instructions, Boss."
          );
        }
      };
      img.onerror = () => {
        alert("Failed to process optical image file.");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Submit Prompt to F.R.I.D.A.Y.
  const handleSend = async (userPrompt = input) => {
    const trimmed = userPrompt.trim();
    if ((!trimmed && !stagedImage) || status === "thinking") return;

    const currentImage = stagedImage;
    setStagedImage(null);

    const promptToSend = trimmed || (currentImage
      ? (language === "te" ? "దయచేసి ఈ చిత్రాన్ని విశ్లేషించి వివరంగా వివరించండి." : "Analyze this optical feed, verify its content, and break down what you observe.")
      : "");

    const newMsg = {
      id: Date.now(),
      role: "user",
      text: promptToSend,
      image: currentImage ? currentImage.previewUrl : null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        const firstUser = s.messages.filter(m => m.role === "user").length === 0;
        const chatTitle = trimmed || (currentImage ? "Optical Telemetry" : "Mission");
        return {
          ...s,
          title: firstUser ? chatTitle.slice(0, 24) + (chatTitle.length > 24 ? "..." : "") : s.title,
          messages: [...s.messages, newMsg]
        };
      }
      return s;
    }));

    setInput("");
    setStatus("thinking");

    // Check for Mobile App Launch Intent (Deep-Linking) only if no optical image attached
    if (!currentImage) {
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
    }

    const reply = await askFriday({
      prompt: promptToSend,
      image: currentImage ? {
        base64: currentImage.base64,
        mimeType: currentImage.mimeType
      } : null,
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

  // Robust copy function with fallback for all browsers and devices
  const copyText = async (text, id) => {
    if (!text) return;
    let successful = false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        successful = true;
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch (err) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        textArea.setAttribute("readonly", "");
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        successful = document.execCommand("copy");
        document.body.removeChild(textArea);
      } catch (fallbackErr) {
        console.error("Copy failed:", fallbackErr);
      }
    }

    if (successful) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Helper to render message content with formatted code blocks & individual copy buttons
  const renderFormattedContent = (content, msgId) => {
    if (!content) return null;

    if (!content.includes("```")) {
      return (
        <div className={`whitespace-pre-wrap leading-relaxed text-xs sm:text-[14.5px] font-sans select-text ${
          isLight ? "selection:bg-blue-500/25 selection:text-slate-900" : "selection:bg-cyan-500/30 selection:text-white"
        }`}>
          {content}
        </div>
      );
    }

    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
      <div className={`space-y-3 text-xs sm:text-[14.5px] font-sans leading-relaxed select-text ${
        isLight ? "selection:bg-blue-500/25 selection:text-slate-900" : "selection:bg-cyan-500/30 selection:text-white"
      }`}>
        {parts.map((part, index) => {
          if (part.startsWith("```") && part.endsWith("```")) {
            const raw = part.slice(3, -3);
            const firstNewline = raw.indexOf("\n");
            let lang = "CODE";
            let code = raw;

            if (firstNewline !== -1) {
              const firstLine = raw.slice(0, firstNewline).trim();
              if (firstLine && !firstLine.includes(" ") && firstLine.length < 24) {
                lang = firstLine.toUpperCase();
                code = raw.slice(firstNewline + 1);
              }
            }

            const cleanCode = code.trim();
            const blockId = `${msgId}-code-${index}`;
            const isCopied = copiedId === blockId;

            return (
              <div
                key={index}
                className={`my-2.5 overflow-hidden rounded-xl border text-left shadow-lg ${
                  isLight
                    ? "border-slate-300 bg-slate-900 text-slate-100 shadow-slate-200/50"
                    : "border-white/15 bg-zinc-950 text-slate-100 shadow-black/80"
                }`}
              >
                {/* Code Block Header with dedicated COPY button */}
                <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.06] px-3.5 py-1.5 font-mono text-[11px]">
                  <span className="font-semibold tracking-wider text-cyan-300">{lang}</span>
                  <button
                    type="button"
                    onClick={() => copyText(cleanCode, blockId)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 font-mono text-[10px] transition active:scale-95 ${
                      isCopied
                        ? "border-emerald-500/60 bg-emerald-500/25 text-emerald-300 font-semibold shadow-xs"
                        : "border-white/15 bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white"
                    }`}
                    title="Copy code to clipboard"
                  >
                    {isCopied ? (
                      <>
                        <Check size={11} className="text-emerald-400" />
                        <span className="text-emerald-300 font-bold">COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>COPY CODE</span>
                      </>
                    )}
                  </button>
                </div>
                {/* Code Preformatted Body */}
                <pre className="overflow-x-auto p-3.5 font-mono text-[12px] sm:text-[13px] leading-relaxed selection:bg-cyan-500/35 selection:text-white">
                  <code>{cleanCode}</code>
                </pre>
              </div>
            );
          }

          if (!part.trim()) return null;

          return (
            <div key={index} className="whitespace-pre-wrap">
              {part}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`relative flex h-full w-full overflow-hidden font-sans transition-colors duration-300 ${
      isLight 
        ? "bg-[#f8fafc] text-slate-900 selection:bg-blue-500/20" 
        : "bg-[#000000] text-slate-100 selection:bg-cyan-500/25"
    }`}>
      
      {/* AMBIENT BACKGROUND GLOWS */}
      {!isLight ? (
        <>
          <div className="pointer-events-none absolute -top-36 -left-36 h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-[110px]" />
          <div className="pointer-events-none absolute -bottom-36 -right-36 h-[28rem] w-[28rem] rounded-full bg-indigo-500/10 blur-[120px]" />
          <div className="pointer-events-none absolute top-1/2 left-1/3 -translate-y-1/2 h-80 w-80 rounded-full bg-blue-500/8 blur-[100px]" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute -top-36 -left-36 h-[28rem] w-[28rem] rounded-full bg-blue-400/10 blur-[110px]" />
          <div className="pointer-events-none absolute -bottom-36 -right-36 h-[28rem] w-[28rem] rounded-full bg-indigo-300/10 blur-[120px]" />
          <div className="pointer-events-none absolute top-1/2 left-1/3 -translate-y-1/2 h-80 w-80 rounded-full bg-sky-200/25 blur-[100px]" />
        </>
      )}

      {/* MOBILE BACKDROP OVERLAY */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className={`fixed inset-0 z-40 transition-opacity md:hidden ${
            isLight ? "bg-black/35 backdrop-blur-xs" : "bg-black/75 backdrop-blur-sm"
          }`}
        />
      )}

      {/* 1. LEFT SIDEBAR: ARCHIVES / SESSIONS */}
      <aside 
        className={`fixed md:relative inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out backdrop-blur-2xl ${
          isLight 
            ? "border-r border-slate-200 bg-white/95 md:bg-white/80 text-slate-800" 
            : "border-r border-white/10 bg-black/95 md:bg-black/80 text-slate-200"
        } ${
          sidebarOpen ? "w-72 translate-x-0" : "w-0 -translate-x-full md:w-0 overflow-hidden border-r-0"
        }`}
      >
        <div className={`flex h-14 items-center justify-between px-4 shrink-0 border-b ${
          isLight ? "border-slate-200" : "border-white/10"
        }`}>
          <div className="flex items-center gap-2">
            <Flame className={`h-4 w-4 ${isLight ? "text-amber-500" : "text-red-500"}`} />
            <span className={`font-mono text-xs font-bold tracking-wider ${
              isLight ? "text-slate-800" : "text-red-300"
            }`}>
              TACTICAL ARCHIVES
            </span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className={`rounded-lg p-1.5 transition ${
              isLight ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900" : "text-slate-400 hover:bg-white/10 hover:text-white"
            }`}
            title="Collapse Sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* New Mission Button */}
        <div className="p-3 shrink-0">
          <button
            onClick={handleNewChat}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-mono text-xs font-semibold transition active:scale-[0.98] ${
              isLight
                ? "border border-slate-200 bg-slate-100 hover:bg-slate-200/80 text-slate-800 shadow-xs"
                : "border border-red-500/30 bg-red-950/20 hover:bg-red-900/30 text-red-200 shadow-[0_0_15px_rgba(220,38,38,0.15)]"
            }`}
          >
            <Plus size={16} />
            <span>NEW MISSION</span>
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          <div className={`px-2 py-1 font-mono text-[9px] uppercase tracking-widest ${
            isLight ? "text-slate-500" : "text-slate-400"
          }`}>
            RECENT TRANSCRIPTS
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
                  ? (isLight 
                      ? "bg-slate-100 text-slate-900 border border-slate-200 font-semibold shadow-xs"
                      : "bg-white/[0.12] text-white border border-white/20 font-medium shadow-[0_4px_16px_rgba(0,0,0,0.5)]")
                  : (isLight
                      ? "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200")
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <MessageSquare size={14} className={
                  activeSessionId === sess.id 
                    ? (isLight ? "text-blue-600 shrink-0" : "text-cyan-400 shrink-0") 
                    : (isLight ? "text-slate-400 shrink-0" : "text-slate-500 shrink-0")
                } />
                <span className="truncate">{sess.title}</span>
              </div>
              <button
                onClick={(e) => handleDeleteSession(sess.id, e)}
                className={`opacity-0 group-hover:opacity-100 p-1 transition ${
                  isLight ? "text-slate-400 hover:text-red-500" : "text-slate-400 hover:text-red-400"
                }`}
                title="Delete transcript"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Sidebar Footer User Info */}
        <div className={`p-3 flex items-center justify-between font-mono text-xs shrink-0 border-t ${
          isLight ? "border-slate-200" : "border-white/10"
        }`}>
          <div className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-lg border flex items-center justify-center font-semibold ${
              isLight ? "bg-slate-100 border-slate-200 text-slate-800" : "bg-white/10 border border-white/15 text-white"
            }`}>
              {userName ? userName[0].toUpperCase() : "U"}
            </div>
            <span className={`font-medium truncate max-w-[120px] ${
              isLight ? "text-slate-800" : "text-slate-200"
            }`}>{userName || "User"}</span>
          </div>
          <button
            onClick={() => setShowNameModal(true)}
            className={`p-1.5 rounded-lg transition ${
              isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100" : "text-slate-400 hover:text-white hover:bg-white/10"
            }`}
            title="Edit Profile"
          >
            <UserCheck size={16} />
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE / CHAT INTERFACE */}
      <div className="relative flex flex-1 flex-col overflow-hidden min-w-0">
        
        {/* TOP NAVIGATION HUD */}
        <header className={`relative z-20 flex h-14 items-center justify-between px-3 sm:px-4 backdrop-blur-2xl shrink-0 transition-colors duration-300 border-b ${
          isLight 
            ? "border-slate-200 bg-white/85 text-slate-800" 
            : "border-white/10 bg-black/85 text-white"
        }`}>
          <div className="flex items-center gap-2 sm:gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className={`rounded-lg p-1.5 transition ${
                  isLight ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900" : "text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
                title="Open Archives"
              >
                <PanelLeftOpen size={20} />
              </button>
            )}

            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className={`font-mono text-sm sm:text-base font-bold tracking-widest ${
                isLight ? "text-slate-900" : "text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]"
              }`}>
                F.R.I.D.A.Y.
              </span>
              <span className={`hidden xs:inline rounded px-1.5 py-0.5 font-mono text-[9px] border backdrop-blur-md ${
                isLight 
                  ? "bg-slate-100 border-slate-200 text-blue-600 font-semibold" 
                  : "bg-red-950/60 border-red-500/30 text-amber-300 font-semibold"
              }`}>
                {isLight ? "LIGHT // HUD" : "MARK IV // OLED HUD"}
              </span>
            </div>
          </div>

          {/* Action HUD Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* THEME SWITCHER (PITCH BLACK / LIGHT) */}
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-1 sm:gap-1.5 rounded-xl border px-2 sm:px-2.5 py-1 font-mono text-[11px] sm:text-xs transition active:scale-95 shadow-xs backdrop-blur-xl ${
                isLight
                  ? "border-amber-400/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 font-semibold"
                  : "border-white/10 bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 hover:text-white"
              }`}
              title={`Toggle Theme (Currently: ${isLight ? "Light Mode" : "Pitch Black Mode"})`}
            >
              {isLight ? <Sun size={13} className="text-amber-500" /> : <Moon size={13} className="text-cyan-400" />}
              <span className="font-medium uppercase">
                {isLight ? (
                  <>
                    <span className="hidden sm:inline">THEME: </span>LIGHT
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">THEME: </span>BLACK
                  </>
                )}
              </span>
            </button>

            {/* HANDS-FREE CONTINUOUS CONVERSATION TOGGLE */}
            <button
              onClick={toggleAutoVoiceMode}
              className={`flex items-center gap-1 sm:gap-1.5 rounded-xl border px-2 sm:px-2.5 py-1 font-mono text-[11px] sm:text-xs transition active:scale-95 backdrop-blur-xl ${
                autoVoiceMode
                  ? (isLight
                      ? "border-emerald-500/70 bg-emerald-50 text-emerald-700 shadow-xs font-semibold animate-pulse"
                      : "border-emerald-400/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)] animate-pulse font-semibold")
                  : (isLight
                      ? "border-slate-200 bg-slate-100/80 text-slate-600 hover:bg-slate-200"
                      : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-slate-200")
              }`}
              title="Continuous Hands-Free Conversation: Speak anytime without clicking the mic button"
            >
              <Radio size={13} className={autoVoiceMode ? "text-emerald-500 animate-ping" : (isLight ? "text-slate-400" : "text-slate-500")} />
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
              className={`flex items-center gap-1 sm:gap-1.5 rounded-xl border px-2 sm:px-2.5 py-1 font-mono text-[11px] sm:text-xs transition active:scale-95 shadow-xs backdrop-blur-xl ${
                isLight
                  ? "border-slate-200 bg-slate-100/80 hover:bg-slate-200/80 text-slate-700"
                  : "border-white/10 bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 hover:text-white shadow-sm"
              }`}
              title="Click to toggle between Female & Male Voice"
            >
              <Sparkles size={13} className={isLight ? "text-blue-600" : "text-cyan-400"} />
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
            <div className={`flex items-center rounded-xl border p-0.5 font-mono text-[11px] sm:text-xs backdrop-blur-xl ${
              isLight ? "border-slate-200 bg-slate-100/80" : "border-white/10 bg-white/[0.04]"
            }`}>
              <button
                onClick={() => {
                  setLanguage("en");
                  speakText(`English mode calibrated, ${userName || "User"}.`);
                }}
                className={`rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 transition ${
                  language === "en"
                    ? (isLight ? "bg-white text-slate-900 font-semibold shadow-xs" : "bg-white/20 text-white font-semibold shadow-sm")
                    : (isLight ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white")
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
                    ? (isLight ? "bg-white text-slate-900 font-semibold shadow-xs" : "bg-white/20 text-white font-semibold shadow-sm")
                    : (isLight ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white")
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
                  ? (isLight ? "border-slate-200 bg-slate-100/90 text-slate-800" : "border-white/15 bg-white/10 text-white")
                  : (isLight ? "border-slate-200 bg-transparent text-slate-400" : "border-white/10 bg-white/[0.03] text-slate-500")
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
          <FourDimensionalDiagram state={status} audioLevel={audioLevel} theme={theme} />

          {/* CHAT MESSAGES STREAM */}
          <div ref={chatContainerRef} className="relative z-10 flex flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-8 sm:py-6 max-w-4xl mx-auto w-full space-y-4 sm:space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 sm:gap-4 ${msg.role === "ai" ? "" : "flex-row-reverse"}`}
              >
                <div
                  className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border backdrop-blur-md ${
                    msg.role === "ai"
                      ? (isLight 
                          ? "border-slate-200 bg-white text-blue-600 shadow-xs" 
                          : "border-white/15 bg-white/10 text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.2)]")
                      : (isLight
                          ? "border-blue-400 bg-blue-600 text-white shadow-xs"
                          : "border-blue-400/30 bg-blue-500/20 text-blue-200")
                  }`}
                >
                  {msg.role === "ai" ? <Zap size={16} /> : <User size={16} />}
                </div>

                <div
                  className={`relative group max-w-[90%] sm:max-w-[85%] rounded-2xl border px-3.5 py-2.5 sm:px-5 sm:py-3.5 backdrop-blur-xl ${
                    msg.role === "ai"
                      ? (isLight
                          ? "border-slate-200/90 bg-white/95 text-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
                          : "border-white/10 bg-zinc-950/90 text-slate-100 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)]")
                      : (isLight
                          ? "border-blue-500 bg-blue-600 text-white shadow-sm"
                          : "border-zinc-700/60 bg-zinc-900/90 text-white shadow-[0_8px_32px_0_rgba(0,0,0,0.8)]")
                  }`}
                >
                  <div className={`mb-1.5 flex items-center justify-between gap-3 font-mono text-[10px] sm:text-[11px] pb-1 border-b ${
                    isLight ? "border-slate-200/60 text-slate-400" : "border-white/5 text-slate-400"
                  }`}>
                    <span className={`font-semibold uppercase tracking-wider ${
                      msg.role === "ai"
                        ? (isLight ? "text-blue-600" : "text-cyan-300")
                        : (isLight ? "text-blue-700" : "text-amber-300")
                    }`}>
                      {msg.role === "ai" ? "F.R.I.D.A.Y." : userName || "STARK COMMAND"}
                    </span>
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      <span>{msg.timestamp}</span>
                      <button
                        type="button"
                        onClick={() => copyText(msg.text, msg.id)}
                        className={`flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] sm:text-[11px] transition backdrop-blur-md active:scale-95 ${
                          copiedId === msg.id
                            ? "border border-emerald-500/60 bg-emerald-500/25 text-emerald-300 font-semibold shadow-xs"
                            : (isLight
                                ? "border border-slate-300/80 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 shadow-2xs"
                                : "border border-white/10 bg-white/[0.08] text-slate-300 hover:bg-white/[0.18] hover:text-white shadow-2xs")
                        }`}
                        title="Copy message content to clipboard"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check size={11} className="text-emerald-400 shrink-0" />
                            <span className="text-emerald-300 font-bold">COPIED</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} className="shrink-0" />
                            <span className="opacity-90">COPY</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {msg.image && (
                    <div
                      onClick={() => setPreviewModalImage(msg.image)}
                      className="group/img relative mb-2.5 max-w-xs sm:max-w-sm cursor-pointer overflow-hidden rounded-xl border border-white/20 bg-black/40 shadow-md transition-all hover:border-cyan-400/50"
                      title="Click to inspect optical telemetry"
                    >
                      <img
                        src={msg.image}
                        alt="Optical Telemetry"
                        className="max-h-60 w-auto object-cover rounded-lg transition-transform duration-200 group-hover/img:scale-102"
                      />
                      <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity group-hover/img:opacity-100 font-mono text-[11px] text-white backdrop-blur-xs">
                        <Eye size={14} />
                        <span>INSPECT TELEMETRY</span>
                      </div>
                    </div>
                  )}

                  {/* Formatted Content with code block syntax & dedicated copy buttons */}
                  {renderFormattedContent(msg.text, msg.id)}

                  {msg.actionUrl && (
                    <div className={`mt-3 pt-2.5 border-t flex items-center justify-between gap-2 ${
                      isLight ? "border-slate-200/60" : "border-white/10"
                    }`}>
                      <a
                        href={msg.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-mono text-xs font-medium shadow-xs transition active:scale-95 backdrop-blur-md ${
                          isLight
                            ? "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                            : "bg-white/10 hover:bg-white/20 border border-white/20 text-white"
                        }`}
                      >
                        <span>Open {msg.appName || "App"}</span>
                        <ExternalLink size={13} />
                      </a>
                      <span className={`text-[10px] font-mono ${isLight ? "text-slate-400" : "text-slate-400"}`}>Deep-Link</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {status === "thinking" && (
              <div className="flex gap-2.5 sm:gap-4 items-center">
                <div className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border animate-pulse backdrop-blur-md ${
                  isLight ? "border-slate-200 bg-white text-blue-600 shadow-xs" : "border-white/15 bg-white/10 text-cyan-300"
                }`}>
                  <Cpu size={16} />
                </div>
                <div className={`rounded-2xl border backdrop-blur-xl px-4 py-2.5 sm:px-5 sm:py-3 text-[11px] sm:text-xs font-mono flex items-center gap-2 sm:gap-3 ${
                  isLight
                    ? "border-slate-200 bg-white/95 text-slate-700 shadow-xs"
                    : "border-white/10 bg-zinc-950/90 text-slate-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)]"
                }`}>
                  <span>COMPUTING 4D QUANTUM TELEMETRY</span>
                  <span className="flex gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full animate-bounce ${isLight ? "bg-blue-600" : "bg-cyan-400"}`} />
                    <span className={`h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:0.2s] ${isLight ? "bg-blue-600" : "bg-cyan-400"}`} />
                    <span className={`h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:0.4s] ${isLight ? "bg-blue-600" : "bg-cyan-400"}`} />
                  </span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* BOTTOM COMMAND DOCK WITH ADAPTIVE WAVE VISUALIZER */}
        <div className={`relative z-20 p-2 sm:p-3 sm:px-8 backdrop-blur-2xl pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0 border-t ${
          isLight ? "border-slate-200 bg-white/85" : "border-white/10 bg-black/90"
        }`}>
          <div className="max-w-4xl mx-auto space-y-1.5 sm:space-y-2">
            
            {/* Hands-Free Mode Status Ribbon */}
            {autoVoiceMode && (
              <div className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-1.5 font-mono text-[11px] backdrop-blur-xl animate-pulse ${
                isLight
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs"
                  : "bg-emerald-500/15 border-emerald-400/30 text-emerald-300 shadow-[0_4px_20px_rgba(16,185,129,0.15)]"
              }`}>
                <div className="flex items-center gap-2 truncate">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-medium tracking-wide truncate">
                    HANDS-FREE ACTIVE // SPEAK NATURALLY WITHOUT CLICKING
                  </span>
                </div>
                <button
                  onClick={toggleAutoVoiceMode}
                  className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] transition border font-medium ${
                    isLight
                      ? "bg-white hover:bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs"
                      : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-400/30"
                  }`}
                  title="Pause Hands-Free Voice Mode"
                >
                  PAUSE
                </button>
              </div>
            )}

            {/* Staged Optical Telemetry Preview Banner */}
            {stagedImage && (
              <div className={`flex items-center justify-between gap-3 rounded-2xl border p-2 sm:p-2.5 backdrop-blur-2xl transition-all shadow-md ${
                isLight
                  ? "border-blue-200 bg-blue-50/95 text-slate-800"
                  : "border-cyan-500/30 bg-zinc-950/95 text-cyan-200 shadow-[0_4px_20px_rgba(6,182,212,0.15)]"
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    onClick={() => setPreviewModalImage(stagedImage.previewUrl)}
                    className="relative shrink-0 cursor-pointer overflow-hidden rounded-xl border border-white/20 group/prev"
                    title="Click to view full image"
                  >
                    <img
                      src={stagedImage.previewUrl}
                      alt="Staged telemetry"
                      className="h-10 w-10 sm:h-12 sm:w-12 object-cover transition-transform group-hover/prev:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/prev:opacity-100 flex items-center justify-center text-white transition-opacity">
                      <Eye size={12} />
                    </div>
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] sm:text-xs font-bold tracking-wide">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-400 animate-ping" />
                      <span className="truncate">{stagedImage.name}</span>
                      <span className={`text-[10px] font-normal px-1.5 py-0.5 rounded border shrink-0 ${
                        isLight ? "border-slate-300 bg-white text-slate-600" : "border-white/10 bg-white/10 text-slate-300"
                      }`}>
                        {stagedImage.size}
                      </span>
                    </div>
                    <p className={`text-[10px] sm:text-[11px] truncate mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                      Optical feed ready. Type any question or press Send to verify and analyze.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStagedImage(null)}
                  className={`shrink-0 rounded-xl p-1.5 transition ${
                    isLight ? "text-slate-500 hover:bg-slate-200 hover:text-slate-900" : "text-slate-400 hover:bg-white/15 hover:text-white"
                  }`}
                  title="Remove optical telemetry"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            )}

            <ArcWave state={status} audioLevel={audioLevel} theme={theme} />

            {/* Input Bar */}
            <div className={`relative flex items-center gap-1.5 sm:gap-2 rounded-2xl border p-1.5 sm:p-2 backdrop-blur-2xl ${
              isLight
                ? "border-slate-300 bg-white/95 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
                : "border-white/15 bg-zinc-950/90 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)]"
            }`}>
              {/* Mic Button */}
              <button
                onClick={autoVoiceMode ? toggleAutoVoiceMode : toggleListening}
                className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-95 backdrop-blur-md ${
                  autoVoiceMode
                    ? (isLight
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-xs animate-pulse"
                        : "border-emerald-400/60 bg-emerald-500/25 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.35)] animate-pulse")
                    : status === "listening"
                    ? "border-red-400/50 bg-red-500/30 text-red-200 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                    : (isLight
                        ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                        : "border-white/15 bg-white/[0.08] text-white/80 hover:border-white/30 hover:bg-white/[0.14] hover:text-white")
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

              {/* Hidden File Input for Image Upload */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />

              {/* Optical Image Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-95 backdrop-blur-md ${
                  stagedImage
                    ? (isLight
                        ? "border-blue-500 bg-blue-100 text-blue-700 shadow-xs"
                        : "border-cyan-400/60 bg-cyan-500/25 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.35)]")
                    : (isLight
                        ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                        : "border-white/15 bg-white/[0.08] text-white/80 hover:border-white/30 hover:bg-white/[0.14] hover:text-white")
                }`}
                title="Upload Image for Optical Telemetry & Analysis"
              >
                <ImageIcon size={18} />
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={
                  stagedImage
                    ? (language === "te" ? "ఈ చిత్రం గురించి ఏదైనా అడగండి లేదా సెండ్ నొక్కండి..." : "Ask any question about this image, or press Send...")
                    : autoVoiceMode
                    ? (language === "te" ? "🎙️ హ్యాండ్స్-ఫ్రీ ఆన్‌లో ఉంది... నేరుగా మాట్లాడండి..." : "🎙️ Hands-free mode active... just speak to Friday!")
                    : status === "listening"
                    ? (language === "te" ? "వాయిస్ వింటున్నాను... మాట్లాడండి..." : "Listening to audio feed... speak now")
                    : (language === "te" ? `ఫ్రైడేను అడగండి, ${userName || "గారు"}...` : `Give your orders, ${userName || (voiceGender === "female" ? "Boss" : "Sir")}...`)
                }
                className={`flex-1 bg-transparent px-2.5 sm:px-3 text-base sm:text-sm focus:outline-none font-sans ${
                  isLight ? "text-slate-900 placeholder-slate-400" : "text-white placeholder-white/40"
                }`}
              />

              {/* Send Button */}
              <button
                onClick={() => handleSend()}
                disabled={(!input.trim() && !stagedImage) || status === "thinking"}
                className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl font-medium transition active:scale-95 disabled:opacity-25 shadow-xs backdrop-blur-md ${
                  isLight
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-white/15 hover:bg-white/25 border border-white/20 text-white"
                }`}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* IDENTITY PROTOCOL MODAL */}
      {showNameModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl ${
          isLight ? "bg-slate-900/40" : "bg-black/85"
        }`}>
          <form 
            onSubmit={handleSaveName}
            className={`w-full max-w-md rounded-2xl border p-6 sm:p-7 text-center backdrop-blur-2xl shadow-2xl ${
              isLight
                ? "bg-white/95 border-slate-200 text-slate-900"
                : "bg-zinc-950/95 border-white/15 text-white"
            }`}
          >
            <div className={`mx-auto mb-4 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border backdrop-blur-md ${
              isLight 
                ? "border-blue-200 bg-blue-50 text-blue-600 shadow-xs" 
                : "border-white/15 bg-white/10 text-cyan-300 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
            }`}>
              <Zap size={26} />
            </div>

            <h3 className={`font-mono text-lg sm:text-xl font-bold mb-1 tracking-wider ${
              isLight ? "text-slate-900" : "text-white"
            }`}>
              F.R.I.D.A.Y. BIOMETRICS
            </h3>
            <p className={`text-xs mb-5 font-sans leading-relaxed ${
              isLight ? "text-slate-500" : "text-slate-400"
            }`}>
              Register your identity to calibrate F.R.I.D.A.Y.'s neural matrix and audio synthesis.
            </p>

            <input
              type="text"
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter your name (e.g. Bharath or Boss)"
              className={`w-full rounded-xl border px-4 py-3 font-mono text-center mb-5 text-base backdrop-blur-md focus:outline-none ${
                isLight
                  ? "border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                  : "border-white/15 bg-white/[0.06] text-white placeholder-white/30 focus:border-white/35"
              }`}
            />

            <button
              type="submit"
              className={`w-full rounded-xl py-3 font-mono text-xs font-semibold tracking-wider transition active:scale-[0.98] shadow-xs ${
                isLight
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-red-600/80 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]"
              }`}
            >
              INITIALIZE PROTOCOLS
            </button>
          </form>
        </div>
      )}

      {/* FULLSCREEN OPTICAL TELEMETRY LIGHTBOX MODAL */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setPreviewModalImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewModalImage(null)}
              className="absolute -top-11 right-0 rounded-xl bg-white/15 p-2 text-white hover:bg-white/25 transition backdrop-blur-md"
              title="Close optical viewer"
            >
              <CloseIcon size={20} />
            </button>
            <img
              src={previewModalImage}
              alt="Optical Telemetry Full View"
              className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain border border-white/20 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
