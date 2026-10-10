import React, { useEffect, useRef } from "react";

export default function JarvisArcFace({ state = "idle", audioLevel = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let t = 0;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = (canvas.width = canvas.offsetWidth * dpr);
      const h = (canvas.height = canvas.offsetHeight * dpr);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.42;

      const isSpeaking = state === "speaking";
      const isListening = state === "listening";
      const isThinking = state === "thinking";

      // Color Theme
      const primaryCyan = isListening ? "#ff3355" : isThinking ? "#a855f7" : "#00f3ff";
      const secondaryCyan = isListening ? "#ff6b8b" : isThinking ? "#c084fc" : "#38bdf8";
      const coreGold = "#ffe885";

      const dynamicGain = (isSpeaking ? 0.35 : isListening ? audioLevel * 0.8 : isThinking ? 0.2 : 0.05);

      // --- 1. AMBIENT BACKDROP GLOW ---
      const bgGrad = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.3);
      bgGrad.addColorStop(0, isListening ? "rgba(255, 51, 85, 0.25)" : "rgba(0, 243, 255, 0.2)");
      bgGrad.addColorStop(0.6, "rgba(0, 180, 255, 0.05)");
      bgGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // --- 2. MULTI-LAYER SPINNING HUD RINGS ---
      ctx.save();
      ctx.translate(cx, cy);

      // Outer compass ticks ring
      ctx.rotate(t * 0.005);
      ctx.strokeStyle = "rgba(0, 243, 255, 0.25)";
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.15, 0, Math.PI * 2);
      ctx.stroke();

      const numTicks = 60;
      for (let i = 0; i < numTicks; i++) {
        const angle = (i * Math.PI * 2) / numTicks;
        const len = i % 5 === 0 ? 9 * dpr : 4 * dpr;
        const r1 = R * 1.15;
        const r2 = r1 - len;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
        ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
        ctx.strokeStyle = i % 5 === 0 ? primaryCyan : "rgba(0, 243, 255, 0.3)";
        ctx.stroke();
      }

      // Segmented Arc Reactor Outer Housing (Stark Industries Mark VI)
      ctx.rotate(-t * 0.015);
      const segments = 10;
      const segAngle = (Math.PI * 2) / segments;
      for (let i = 0; i < segments; i++) {
        const startA = i * segAngle + 0.08;
        const endA = (i + 1) * segAngle - 0.08;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.98, startA, endA);
        ctx.strokeStyle = primaryCyan;
        ctx.lineWidth = 3.5 * dpr;
        ctx.shadowColor = primaryCyan;
        ctx.shadowBlur = 12 * dpr;
        ctx.stroke();
      }

      // Middle Counter-Spinning Triangular Energy Ring
      ctx.rotate(t * 0.025);
      ctx.setLineDash([18 * dpr, 28 * dpr]);
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.82, 0, Math.PI * 2);
      ctx.strokeStyle = secondaryCyan;
      ctx.lineWidth = 2 * dpr;
      ctx.shadowBlur = 8 * dpr;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();

      // --- 3. DYNAMIC 3D HOLOGRAPHIC SPHERE / NEURAL MATRIX (The Face Core) ---
      ctx.save();
      ctx.translate(cx, cy);

      const latLines = 8;
      const sphereR = R * 0.65;
      for (let i = 0; i < latLines; i++) {
        const latNorm = (i / (latLines - 1)) * 2 - 1; // -1 to 1
        const rLat = sphereR * Math.sqrt(Math.max(0, 1 - latNorm * latNorm));
        const yLat = latNorm * sphereR;

        // Wave displacement on speaking
        const pulse = Math.sin(t * 0.1 + i) * (dynamicGain * 14 * dpr);

        ctx.beginPath();
        ctx.ellipse(0, yLat, Math.max(0.1, rLat + pulse), Math.max(0.1, rLat * 0.28 + pulse * 0.3), 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 243, 255, ${0.2 + (1 - Math.abs(latNorm)) * 0.5})`;
        ctx.lineWidth = (1 + (1 - Math.abs(latNorm))) * dpr;
        ctx.stroke();
      }

      // Longitudinal rotating meridian arcs
      const longLines = 8;
      for (let j = 0; j < longLines; j++) {
        const longA = (j * Math.PI) / longLines + t * 0.02;
        const xStretch = Math.cos(longA) * sphereR;
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.abs(xStretch), sphereR, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
      }

      // --- 4. ARC REACTOR CENTRAL CORE (PULSING PURE WHITE-BLUE LIGHT) ---
      const corePulse = (1 + dynamicGain * 1.5) * (1 + 0.08 * Math.sin(t * 0.1));
      const coreRad = R * 0.24 * corePulse;

      const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRad * 1.6);
      coreGrad.addColorStop(0, "#ffffff");
      coreGrad.addColorStop(0.3, coreGold);
      coreGrad.addColorStop(0.65, primaryCyan);
      coreGrad.addColorStop(1, "rgba(0, 243, 255, 0)");

      ctx.fillStyle = coreGrad;
      ctx.shadowColor = primaryCyan;
      ctx.shadowBlur = 35 * dpr;
      ctx.beginPath();
      ctx.arc(0, 0, coreRad, 0, Math.PI * 2);
      ctx.fill();

      // Sharp inner reactor aperture triangle
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const triAngle = (k * Math.PI * 2) / 3 - Math.PI / 2 + t * 0.01;
        const triR = coreRad * 0.7;
        const tx = Math.cos(triAngle) * triR;
        const ty = Math.sin(triAngle) * triR;
        if (k === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();

      ctx.restore();

      t++;
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [state, audioLevel]);

  return (
    <div className="relative flex items-center justify-center w-64 h-64 sm:w-80 sm:h-80 mx-auto select-none pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
