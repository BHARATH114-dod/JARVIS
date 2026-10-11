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
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = (canvas.width = Math.floor(canvas.offsetWidth * dpr));
      const height = (canvas.height = Math.floor(canvas.offsetHeight * dpr));
      ctx.clearRect(0, 0, width, height);

      const centerY = height / 2;
      const baseAmp = (state === "speaking" ? 28 : state === "listening" ? 24 : state === "thinking" ? 14 : 6) * dpr;
      const dynamicAmp = baseAmp + (audioLevel * 45 * dpr);

      // Iron Man Stark Gold & Crimson Harmonic Sine Waves
      const waveConfigs = [
        { color: "rgba(255, 195, 0, 0.9)", speed: 0.05, freq: 0.007, blur: 16, width: 3, offset: 0 },
        { color: "rgba(230, 57, 70, 0.7)", speed: 0.035, freq: 0.012, blur: 12, width: 2, offset: 2 },
        { color: "rgba(255, 214, 10, 0.65)", speed: -0.04, freq: 0.009, blur: 14, width: 2.2, offset: 4 },
        { color: "rgba(208, 0, 0, 0.45)", speed: 0.065, freq: 0.015, blur: 8, width: 1.5, offset: 1 },
      ];

      waveConfigs.forEach((cfg) => {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = cfg.color;
        ctx.lineWidth = cfg.width * window.devicePixelRatio;
        ctx.shadowColor = cfg.color;
        ctx.shadowBlur = cfg.blur;

        for (let x = 0; x < width; x += 4) {
          const normX = x / width;
          const envelope = Math.sin(normX * Math.PI);

          const y = centerY +
            Math.sin(x * cfg.freq + phase * (cfg.speed > 0 ? 1 : -1) + cfg.offset) *
            dynamicAmp *
            envelope *
            (1 + 0.3 * Math.sin(phase * 0.1 + x * 0.02));

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      });

      // Gold & Crimson Audio Spectrum bars in background
      const barCount = 44;
      const barSpacing = width / barCount;
      ctx.save();
      for (let i = 0; i < barCount; i++) {
        const norm = i / barCount;
        const barEnv = Math.sin(norm * Math.PI);
        const barAmp = (dynamicAmp * 0.7 * barEnv) * Math.abs(Math.sin(phase * 0.08 + i * 0.4));
        const bx = i * barSpacing + barSpacing * 0.25;
        const bWidth = barSpacing * 0.5;

        const grad = ctx.createLinearGradient(0, centerY - barAmp, 0, centerY + barAmp);
        grad.addColorStop(0, "rgba(255, 195, 0, 0.85)");
        grad.addColorStop(0.5, "rgba(186, 24, 27, 0.3)");
        grad.addColorStop(1, "rgba(255, 195, 0, 0.85)");

        ctx.fillStyle = grad;
        ctx.fillRect(bx, centerY - barAmp, bWidth, barAmp * 2);
      }
      ctx.restore();

      phase += 0.045;
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [state, audioLevel]);

  return (
    <div className="relative w-full h-16 sm:h-22 flex items-center justify-center overflow-hidden rounded-xl sm:rounded-2xl border border-amber-500/25 bg-[#0d0407]/80 backdrop-blur-md shadow-[0_0_20px_rgba(255,183,3,0.1)]">
      {/* Stark Grid Overlay */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage: "linear-gradient(to right, #ffb703 1px, transparent 1px), linear-gradient(to bottom, #d00000 1px, transparent 1px)",
          backgroundSize: "28px 28px"
        }}
      />

      <div className="pointer-events-none absolute left-4 top-2.5 font-mono text-[9px] text-amber-400/80 tracking-widest flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
        STARK HARMONIC RESONANCE
      </div>
      <div className="pointer-events-none absolute right-4 top-2.5 font-mono text-[9px] text-amber-400/60">
        STATUS: <span className="text-amber-300 uppercase font-semibold">{state}</span>
      </div>

      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
