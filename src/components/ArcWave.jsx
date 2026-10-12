import React, { useEffect, useRef } from "react";

/**
 * ArcWave: Pitch Black & Light mode audio spectrum visualizer.
 * Adapts wave frequencies, colors, and container translucency to current theme.
 */
export default function ArcWave({ state = "idle", audioLevel = 0, theme = "pitch-black" }) {
  const canvasRef = useRef(null);
  const isLight = theme === "light";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let phase = 0;

    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = (canvas.width = Math.floor(canvas.offsetWidth * dpr));
      const height = (canvas.height = Math.floor(canvas.offsetHeight * dpr));
      ctx.clearRect(0, 0, width, height);

      const centerY = height / 2;
      const baseAmp = (state === "speaking" ? 26 : state === "listening" ? 22 : state === "thinking" ? 14 : 5) * dpr;
      const dynamicAmp = baseAmp + (audioLevel * 42 * dpr);

      // Theme-specific Wave Palettes
      const waveConfigs = isLight
        ? [
            { color: "rgba(37, 99, 235, 0.85)", speed: 0.045, freq: 0.008, blur: 8, width: 2.2, offset: 0 },
            { color: "rgba(15, 23, 42, 0.65)", speed: 0.03, freq: 0.012, blur: 6, width: 1.8, offset: 2 },
            { color: "rgba(99, 102, 241, 0.75)", speed: -0.035, freq: 0.009, blur: 8, width: 2.0, offset: 4 },
            { color: "rgba(6, 182, 212, 0.6)", speed: 0.055, freq: 0.014, blur: 6, width: 1.4, offset: 1 },
          ]
        : [
            { color: "rgba(56, 189, 248, 0.9)", speed: 0.045, freq: 0.008, blur: 14, width: 2.4, offset: 0 },
            { color: "rgba(255, 255, 255, 0.85)", speed: 0.03, freq: 0.012, blur: 10, width: 1.8, offset: 2 },
            { color: "rgba(167, 139, 250, 0.75)", speed: -0.035, freq: 0.009, blur: 12, width: 2.0, offset: 4 },
            { color: "rgba(96, 165, 250, 0.55)", speed: 0.055, freq: 0.014, blur: 8, width: 1.4, offset: 1 },
          ];

      // Draw Equalizer Spectrum Bars
      const barCount = 40;
      const barSpacing = width / barCount;
      ctx.save();
      for (let i = 0; i < barCount; i++) {
        const norm = i / barCount;
        const barEnv = Math.sin(norm * Math.PI);
        const barAmp = (dynamicAmp * 0.65 * barEnv) * Math.abs(Math.sin(phase * 0.08 + i * 0.4));
        const bx = i * barSpacing + barSpacing * 0.25;
        const bWidth = barSpacing * 0.5;

        const grad = ctx.createLinearGradient(0, centerY - barAmp, 0, centerY + barAmp);
        if (isLight) {
          grad.addColorStop(0, "rgba(37, 99, 235, 0.35)");
          grad.addColorStop(0.5, "rgba(99, 102, 241, 0.15)");
          grad.addColorStop(1, "rgba(37, 99, 235, 0.35)");
        } else {
          grad.addColorStop(0, "rgba(255, 255, 255, 0.35)");
          grad.addColorStop(0.5, "rgba(56, 189, 248, 0.2)");
          grad.addColorStop(1, "rgba(255, 255, 255, 0.35)");
        }

        ctx.fillStyle = grad;
        ctx.fillRect(bx, centerY - barAmp, bWidth, barAmp * 2);
      }
      ctx.restore();

      // Draw Sine Waves
      waveConfigs.forEach((cfg) => {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = cfg.color;
        ctx.lineWidth = cfg.width * dpr;
        ctx.shadowColor = cfg.color;
        ctx.shadowBlur = cfg.blur;

        for (let x = 0; x < width; x += 4) {
          const normX = x / width;
          const envelope = Math.sin(normX * Math.PI);

          const y = centerY +
            Math.sin(x * cfg.freq + phase * (cfg.speed > 0 ? 1 : -1) + cfg.offset) *
            dynamicAmp *
            envelope *
            (1 + 0.25 * Math.sin(phase * 0.1 + x * 0.02));

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      });

      phase += 0.04;
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [state, audioLevel, isLight]);

  return (
    <div className={`relative w-full h-16 sm:h-20 flex items-center justify-center overflow-hidden rounded-2xl border transition-colors duration-300 ${
      isLight 
        ? "border-slate-200 bg-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.05)] text-slate-700" 
        : "border-white/10 bg-black/90 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] text-white/70"
    } backdrop-blur-xl`}>
      {/* Top Specular Edge */}
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${
        isLight ? "via-black/10" : "via-white/20"
      } to-transparent`} />

      {/* Mode Badges */}
      <div className={`pointer-events-none absolute left-3 sm:left-4 top-2 sm:top-2.5 font-mono text-[9px] sm:text-[10px] tracking-wider flex items-center gap-1.5 ${
        isLight ? "text-slate-500" : "text-white/60"
      }`}>
        <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${
          isLight ? "bg-blue-600" : "bg-cyan-400"
        }`} />
        AUDIO SPECTRUM
      </div>
      <div className={`pointer-events-none absolute right-3 sm:right-4 top-2 sm:top-2.5 font-mono text-[9px] sm:text-[10px] ${
        isLight ? "text-slate-400" : "text-white/50"
      }`}>
        STATUS: <span className={`uppercase font-medium ${isLight ? "text-slate-700 font-semibold" : "text-white/80"}`}>{state}</span>
      </div>

      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
