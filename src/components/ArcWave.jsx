import React, { useEffect, useRef } from "react";

export default function ArcWave({ state = "idle", audioLevel = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let phase = 0;

    const render = () => {
      // Resize dynamically
      const width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio);
      const height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio);
      ctx.clearRect(0, 0, width, height);

      const centerY = height / 2;
      const baseAmp = state === "speaking" ? 48 : state === "listening" ? 36 : state === "thinking" ? 22 : 10;
      const dynamicAmp = baseAmp + (audioLevel * 70);

      // Draw multiple glowing harmonic sine waves
      const waveConfigs = [
        { color: "rgba(0, 243, 255, 0.85)", speed: 0.05, freq: 0.007, blur: 18, width: 3.5, offset: 0 },
        { color: "rgba(0, 180, 255, 0.55)", speed: 0.035, freq: 0.012, blur: 12, width: 2, offset: 2 },
        { color: "rgba(168, 85, 247, 0.7)", speed: -0.04, freq: 0.009, blur: 14, width: 2.5, offset: 4 },
        { color: "rgba(56, 189, 248, 0.4)", speed: 0.065, freq: 0.015, blur: 8, width: 1.5, offset: 1 },
      ];

      waveConfigs.forEach((cfg) => {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = cfg.color;
        ctx.lineWidth = cfg.width * window.devicePixelRatio;
        ctx.shadowColor = cfg.color;
        ctx.shadowBlur = cfg.blur;

        for (let x = 0; x < width; x += 4) {
          // Envelope calculation to taper the wave at both edges
          const normX = x / width;
          const envelope = Math.sin(normX * Math.PI); // 0 at left/right edges, 1 at center

          const y = centerY +
            Math.sin(x * cfg.freq + phase * (cfg.speed > 0 ? 1 : -1) + cfg.offset) *
            dynamicAmp *
            envelope *
            (1 + 0.3 * Math.sin(phase * 0.1 + x * 0.02));

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.restore();
      });

      // Digital frequency bars in the center background
      const barCount = 48;
      const barSpacing = width / barCount;
      ctx.save();
      for (let i = 0; i < barCount; i++) {
        const norm = i / barCount;
        const barEnv = Math.sin(norm * Math.PI);
        const barAmp = (dynamicAmp * 0.75 * barEnv) * Math.abs(Math.sin(phase * 0.08 + i * 0.4));
        const bx = i * barSpacing + barSpacing * 0.25;
        const bWidth = barSpacing * 0.5;

        const grad = ctx.createLinearGradient(0, centerY - barAmp, 0, centerY + barAmp);
        grad.addColorStop(0, "rgba(0, 243, 255, 0.8)");
        grad.addColorStop(0.5, "rgba(168, 85, 247, 0.3)");
        grad.addColorStop(1, "rgba(0, 243, 255, 0.8)");

        ctx.fillStyle = grad;
        ctx.fillRect(bx, centerY - barAmp, bWidth, barAmp * 2);
      }
      ctx.restore();

      phase += 0.045;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, audioLevel]);

  return (
    <div className="relative w-full h-44 sm:h-52 flex items-center justify-center overflow-hidden rounded-2xl border border-cyan-500/25 bg-black/40 backdrop-blur-xl shadow-[0_0_40px_rgba(0,243,255,0.12)]">
      {/* Background HUD Grid */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage: "linear-gradient(to right, #00f3ff 1px, transparent 1px), linear-gradient(to bottom, #00f3ff 1px, transparent 1px)",
          backgroundSize: "28px 28px"
        }}
      />

      {/* Target Crosshairs / HUD Markers */}
      <div className="pointer-events-none absolute left-4 top-4 font-mono text-[10px] text-cyan-400/70 tracking-widest flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
        AUDIO SPECTRUM // HARMONIC MATRIX
      </div>
      <div className="pointer-events-none absolute right-4 top-4 font-mono text-[10px] text-cyan-400/50">
        STATUS: <span className="text-cyan-300 uppercase font-semibold">{state}</span>
      </div>
      <div className="pointer-events-none absolute left-4 bottom-3 font-mono text-[10px] text-slate-500">
        FREQ: 44.1 kHz // DYNAMIC GAIN
      </div>
      <div className="pointer-events-none absolute right-4 bottom-3 font-mono text-[10px] text-slate-500">
        JARVIS ARC CORE v4.2
      </div>

      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
