import { useState, useEffect, useRef } from "react";
import {
  Activity, Brain, Code2, Terminal, Database, Search, Cpu, Mic, Send, Copy, Check,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Sparkles, User, Zap,
  ChevronRight, Layers,
} from "lucide-react";

/* ---------- mock data ---------- */
const INITIAL_MESSAGES = [
  { id: 1, role: "user", text: "Can you write a quick debounce helper in JavaScript?" },
  {
    id: 2,
    role: "ai",
    steps: ["Parsing intent", "Recalling code patterns", "Composing answer"],
    text: "Here is a minimal debounce. It delays the call until the input has been quiet for `wait` milliseconds.",
    code: {
      lang: "javascript",
      body: `export function debounce(fn, wait = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

// usage
const onSearch = debounce((q) => console.log("search:", q), 250);`,
    },
  },
];

const CAPABILITIES = [
  { id: "code", label: "Code Compiler", icon: Code2 },
  { id: "term", label: "Terminal Agent", icon: Terminal },
  { id: "mem", label: "Memory Bank", icon: Database },
  { id: "search", label: "Deep Search", icon: Search },
];

const CONTEXTS = ["General", "Project: Orion", "Research notes", "Scratchpad"];
const CHIPS = ["Explain this code", "Summarize my notes", "Debug a stack trace", "Plan my week"];
const TOOL_LINES = [
  "Executing script.py...",
  "Fetching API context...",
  "Indexing memory vault...",
  "Running unit tests (12 passed)",
  "Resolving dependency graph...",
  "Compressing context window...",
  "Querying vector store...",
];

const CANNED = [
  "Done. I ran the plan through the tool chain and everything checks out. Want me to go deeper on any step?",
  "Good question. The short answer: break it into small, testable pieces, then wire them together. I can sketch that structure next.",
  "I pulled the relevant context and found two likely causes. The first is a stale cache; the second is an off-by-one in the loop bounds.",
];

/* ---------- tiny syntax highlighter ---------- */
const KEYWORDS = /\b(export|function|const|let|var|return|if|else|for|while|import|from|new|class|async|await|def|in)\b/g;
function highlight(line) {
  const parts = [];
  const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+\b)|(\b(?:export|function|const|let|var|return|if|else|for|while|import|from|new|class|async|await|def|in)\b)/g;
  let last = 0, m, k = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) parts.push(line.slice(last, m.index));
    const cls = m[1] ? "text-slate-500 italic" : m[2] ? "text-emerald-300" : m[3] ? "text-amber-300" : "text-fuchsia-400";
    parts.push(<span key={k++} className={cls}>{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts;
}

/* ---------- waveform ---------- */
function Waveform({ active }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext("2d");
    let raf, t = 0;
    const draw = () => {
      const w = (c.width = c.offsetWidth * 2);
      const h = (c.height = c.offsetHeight * 2);
      ctx.clearRect(0, 0, w, h);
      const bars = 36, gap = w / bars;
      for (let i = 0; i < bars; i++) {
        const amp = active ? 0.25 + 0.75 * Math.abs(Math.sin(t * 0.08 + i * 0.5) * Math.cos(t * 0.03 + i * 0.21)) : 0.06 + 0.04 * Math.sin(t * 0.02 + i);
        const bh = amp * h;
        ctx.fillStyle = i % 3 === 0 ? "#a855f7" : "#00f3ff";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = active ? 10 : 2;
        ctx.fillRect(i * gap + gap * 0.25, (h - bh) / 2, gap * 0.5, bh);
      }
      t++;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return <canvas ref={ref} className="h-9 w-40 sm:w-56" aria-label="Audio waveform" />;
}

/* ---------- small pieces ---------- */
function Meter({ label, value, color = "bg-cyan-400" }) {
  return (
    <div>
      <div className="mb-1 flex justify-between font-mono text-[11px] text-slate-400">
        <span>{label}</span><span>{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className={`h-full rounded-full ${color} shadow-[0_0_8px_currentColor] transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="hidden items-center gap-2 md:flex">
      <Icon size={14} className="text-cyan-400" />
      <div className="leading-tight">
        <div className="font-mono text-[10px] text-slate-500">{label}</div>
        <div className="font-mono text-xs text-cyan-200">{value}</div>
      </div>
    </div>
  );
}

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code.body); } catch (e) { /* clipboard unavailable */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-cyan-500/20 bg-black/40">
      <div className="flex items-center justify-between border-b border-cyan-500/10 px-3 py-1.5">
        <span className="font-mono text-xs text-violet-300">{code.lang}</span>
        <button onClick={copy} className="flex items-center gap-1 rounded px-2 py-0.5 font-mono text-xs text-slate-300 transition hover:bg-cyan-500/10 hover:text-cyan-200 focus:outline-none focus:ring-1 focus:ring-cyan-400">
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[13px] leading-relaxed text-slate-200">
        {code.body.split("\n").map((l, i) => <div key={i}>{highlight(l) || "\u00a0"}</div>)}
      </pre>
    </div>
  );
}

function Avatar({ role }) {
  const ai = role === "ai";
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${ai ? "border-violet-400/60 bg-violet-500/10 shadow-[0_0_16px_#a855f780]" : "border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_16px_#00f3ff60]"}`}>
      {ai ? <Sparkles size={16} className="text-violet-300" /> : <User size={16} className="text-cyan-300" />}
    </div>
  );
}

function Message({ m }) {
  const ai = m.role === "ai";
  return (
    <div className={`flex gap-3 ${ai ? "" : "flex-row-reverse"}`}>
      <Avatar role={m.role} />
      <div className={`max-w-[85%] rounded-xl border px-4 py-3 backdrop-blur-md ${ai ? "border-violet-500/20 bg-violet-500/5" : "border-cyan-500/20 bg-cyan-500/5"}`}>
        {m.steps && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {m.steps.map((s) => (
              <span key={s} className="flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/5 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                <Check size={10} />{s}
              </span>
            ))}
          </div>
        )}
        <p className="text-sm leading-relaxed text-slate-200">{m.text}</p>
        {m.code && <CodeBlock code={m.code} />}
      </div>
    </div>
  );
}

/* ---------- main ---------- */
export default function CyberAssistant() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [activeCap, setActiveCap] = useState("code");
  const [ctx, setCtx] = useState(CONTEXTS[0]);
  const [temp, setTemp] = useState(0.7);
  const [depth, setDepth] = useState(60);
  const [stats, setStats] = useState({ latency: 42, rate: 118, mem: 3.4, cpu: 31 });
  const [feed, setFeed] = useState(TOOL_LINES.slice(0, 3).map((t, i) => ({ id: i, t, time: "00:0" + i })));
  const endRef = useRef(null);
  const taRef = useRef(null);

  // simulated telemetry
  useEffect(() => {
    const id = setInterval(() => {
      setStats((s) => ({
        latency: Math.max(20, Math.min(90, s.latency + (Math.random() - 0.5) * 12)),
        rate: Math.max(60, Math.min(200, s.rate + (Math.random() - 0.5) * 24)),
        mem: Math.max(2, Math.min(6, s.mem + (Math.random() - 0.5) * 0.3)),
        cpu: Math.max(10, Math.min(85, s.cpu + (Math.random() - 0.5) * 10)),
      }));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  // simulated tool-call feed
  useEffect(() => {
    let n = 3;
    const id = setInterval(() => {
      const t = TOOL_LINES[Math.floor(Math.random() * TOOL_LINES.length)];
      const time = new Date().toLocaleTimeString([], { hour12: false });
      setFeed((f) => [{ id: n++, t, time }, ...f].slice(0, 12));
    }, 2800);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);

  // auto-expanding textarea
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  const send = (text = input) => {
    const clean = text.trim();
    if (!clean || thinking) return;
    setMessages((m) => [...m, { id: Date.now(), role: "user", text: clean }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setMessages((m) => [...m, {
        id: Date.now() + 1, role: "ai",
        steps: ["Parsing intent", "Calling " + CAPABILITIES.find((c) => c.id === activeCap).label],
        text: CANNED[Math.floor(Math.random() * CANNED.length)],
      }]);
      setThinking(false);
    }, 1400);
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const glass = "border border-cyan-500/20 bg-white/[0.03] backdrop-blur-md";

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden text-slate-200" style={{ background: "#07080f", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      {/* ambient halos + scanlines */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 z-30 opacity-[0.07]" style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)" }} />

      {/* TOP HUD */}
      <header className={`relative z-10 flex items-center gap-4 border-x-0 border-t-0 px-4 py-2.5 ${glass}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/50 bg-cyan-400/10 shadow-[0_0_14px_#00f3ff50]">
            <Brain size={18} className="text-cyan-300" />
          </div>
          <div className="leading-tight">
            <div className="font-mono text-sm font-semibold tracking-wide text-cyan-200">NYX-7</div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              SYSTEM OPERATIONAL
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-5">
          <Stat icon={Zap} label="Neural latency" value={`${stats.latency.toFixed(0)} ms`} />
          <Stat icon={Activity} label="Token stream" value={`${stats.rate.toFixed(0)} tok/s`} />
          <Stat icon={Layers} label="Memory" value={`${stats.mem.toFixed(1)} GB`} />
          <Waveform active={listening || thinking} />
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1">
        {/* LEFT SIDEBAR */}
        <aside className={`shrink-0 overflow-hidden border-y-0 border-l-0 transition-all duration-300 ${glass} ${leftOpen ? "w-64" : "w-0 border-r-0"}`}>
          <div className="w-64 space-y-6 p-4">
            <section>
              <h2 className="mb-2 font-mono text-xs text-slate-400">Memory vault</h2>
              <div className="space-y-1">
                {CONTEXTS.map((c) => (
                  <button key={c} onClick={() => setCtx(c)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm transition focus:outline-none focus:ring-1 focus:ring-cyan-400 ${ctx === c ? "bg-cyan-500/10 text-cyan-200" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}>
                    {c}{ctx === c && <ChevronRight size={14} />}
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h2 className="mb-2 font-mono text-xs text-slate-400">Capabilities</h2>
              <div className="grid grid-cols-2 gap-2">
                {CAPABILITIES.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setActiveCap(id)}
                    className={`flex flex-col items-start gap-2 rounded-lg border p-2.5 text-left text-xs transition focus:outline-none focus:ring-1 focus:ring-cyan-400 ${activeCap === id ? "border-violet-400/60 bg-violet-500/10 text-violet-200 shadow-[0_0_14px_#a855f740]" : "border-white/10 text-slate-400 hover:border-cyan-400/40 hover:text-cyan-200"}`}>
                    <Icon size={16} />{label}
                  </button>
                ))}
              </div>
            </section>
            <section className="space-y-3">
              <h2 className="font-mono text-xs text-slate-400">System status</h2>
              <Meter label="CPU load" value={stats.cpu} color="bg-emerald-400 text-emerald-400" />
              <Meter label="Context window" value={Math.min(100, 18 + messages.length * 6)} color="bg-cyan-400 text-cyan-400" />
            </section>
          </div>
        </aside>

        {/* CENTER CONSOLE */}
        <main className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between px-3 pt-2">
            <button onClick={() => setLeftOpen(!leftOpen)} aria-label="Toggle subsystems sidebar" className="rounded p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-cyan-200 focus:outline-none focus:ring-1 focus:ring-cyan-400">
              {leftOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
            <span className="font-mono text-xs text-slate-500">{ctx}</span>
            <button onClick={() => setRightOpen(!rightOpen)} aria-label="Toggle telemetry drawer" className="rounded p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-cyan-200 focus:outline-none focus:ring-1 focus:ring-cyan-400">
              {rightOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-8">
            {messages.map((m) => <Message key={m.id} m={m} />)}
            {thinking && (
              <div className="flex items-center gap-3">
                <Avatar role="ai" />
                <div className="flex items-center gap-1.5 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
                  {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300" style={{ animationDelay: `${i * 120}ms` }} />)}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* command bar */}
          <div className="px-4 pb-4 sm:px-8">
            <div className="mb-2 flex flex-wrap gap-2">
              {CHIPS.map((c) => (
                <button key={c} onClick={() => send(c)} className="rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-xs text-cyan-200 transition hover:border-cyan-400/60 hover:bg-cyan-500/10 focus:outline-none focus:ring-1 focus:ring-cyan-400">
                  {c}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2 rounded-2xl border border-cyan-400/40 bg-[#0b0d1a]/80 p-2 shadow-[0_0_24px_#00f3ff30,0_0_48px_#a855f720] backdrop-blur-md">
              <button onClick={() => setListening(!listening)} aria-pressed={listening} aria-label="Toggle voice input"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition focus:outline-none focus:ring-1 focus:ring-cyan-400 ${listening ? "animate-pulse border-red-400/60 bg-red-500/15 text-red-300 shadow-[0_0_14px_#f8717180]" : "border-white/10 text-slate-400 hover:text-cyan-200"}`}>
                <Mic size={18} />
              </button>
              <textarea ref={taRef} rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
                placeholder={listening ? "Listening..." : "Ask NYX-7 anything"}
                className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none" />
              <button onClick={() => send()} disabled={!input.trim() || thinking} aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 text-black transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-300 disabled:opacity-30">
                <Send size={16} />
              </button>
            </div>
          </div>
        </main>

        {/* RIGHT DRAWER */}
        <aside className={`shrink-0 overflow-hidden border-y-0 border-r-0 transition-all duration-300 ${glass} ${rightOpen ? "w-72" : "w-0 border-l-0"}`}>
          <div className="flex h-full w-72 flex-col gap-6 p-4">
            <section>
              <h2 className="mb-3 font-mono text-xs text-slate-400">Model parameters</h2>
              <label className="mb-3 block">
                <div className="mb-1 flex justify-between font-mono text-[11px] text-slate-400"><span>Temperature</span><span className="text-cyan-300">{temp.toFixed(2)}</span></div>
                <input type="range" min="0" max="1" step="0.05" value={temp} onChange={(e) => setTemp(+e.target.value)} className="w-full accent-cyan-400" />
              </label>
              <label className="block">
                <div className="mb-1 flex justify-between font-mono text-[11px] text-slate-400"><span>Context depth</span><span className="text-violet-300">{depth}k</span></div>
                <input type="range" min="8" max="200" step="4" value={depth} onChange={(e) => setDepth(+e.target.value)} className="w-full accent-violet-500" />
              </label>
            </section>
            <section className="flex min-h-0 flex-1 flex-col">
              <h2 className="mb-2 flex items-center gap-2 font-mono text-xs text-slate-400">
                <Cpu size={13} /> Active tools
              </h2>
              <ul className="flex-1 space-y-1.5 overflow-y-auto pr-1">
                {feed.map((f, i) => (
                  <li key={f.id} className={`rounded-md border px-2.5 py-1.5 font-mono text-[11px] ${i === 0 ? "border-emerald-400/40 bg-emerald-400/5 text-emerald-300" : "border-white/5 text-slate-400"}`}>
                    <span className="mr-2 text-slate-600">{f.time}</span>{f.t}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
