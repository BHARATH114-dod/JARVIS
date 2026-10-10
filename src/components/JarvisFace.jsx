import React, { useEffect, useRef } from "react";

export default function JarvisRobotFace({ state = "idle", audioLevel = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let time = 0;

    const render = () => {
      const size = Math.min(canvas.offsetWidth, canvas.offsetHeight) * window.devicePixelRatio;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const R = size * 0.38;

      // Glow & Color Palette based on state
      const isSpeaking = state === "speaking";
      const isListening = state === "listening";
      const isThinking = state === "thinking";

      const primaryColor = isListening ? "#ef4444" : isThinking ? "#a855f7" : "#00f3ff";
      const glowColor = isListening ? "rgba(239, 68, 68, 0.6)" : isThinking ? "rgba(168, 85, 247, 0.6)" : "rgba(0, 243, 255, 0.6)";

      // 1. ROTATING OUTER HUD RINGS (Stark Arc Reactor style)
      ctx.save();
      ctx.translate(cx, cy);

      // Outer dashed spinning ring 1
      ctx.rotate(time * 0.015);
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.15, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 243, 255, 0.25)";
      ctx.lineWidth = 1.5 * window.devicePixelRatio;
      ctx.setLineDash([12, 18]);
      ctx.stroke();

      // Outer reverse spinning ring with notches
      ctx.rotate(-time * 0.03);
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.05, 0, Math.PI * 2);
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 2 * window.devicePixelRatio;
      ctx.setLineDash([40, 50, 10, 50]);
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;
      ctx.stroke();

      ctx.restore();

      // 2. ROBOT FACE HELMET SILHOUETTE
      ctx.save();
      ctx.translate(cx, cy);

      // Head Plate Base
      ctx.beginPath();
      ctx.arc(0, -R * 0.1, R * 0.82, Math.PI * 0.8, Math.PI * 0.2); // top skull curve
      ctx.lineTo(R * 0.55, R * 0.45); // right jaw
      ctx.lineTo(R * 0.28, R * 0.8);  // chin right
      ctx.lineTo(-R * 0.28, R * 0.8); // chin left
      ctx.lineTo(-R * 0.55, R * 0.45); // left jaw
      ctx.closePath();

      ctx.fillStyle = "rgba(6, 12, 26, 0.85)";
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 243, 255, 0.4)";
      ctx.lineWidth = 2.5 * window.devicePixelRatio;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12;
      ctx.stroke();

      // Forehead Crest / Circuit Line
      ctx.beginPath();
      ctx.moveTo(0, -R * 0.8);
      ctx.lineTo(0, -R * 0.4);
      ctx.moveTo(-R * 0.25, -R * 0.55);
      ctx.lineTo(R * 0.25, -R * 0.55);
      ctx.strokeStyle = "rgba(0, 243, 255, 0.6)";
      ctx.lineWidth = 1.5 * window.devicePixelRatio;
      ctx.stroke();

      // 3. CYBERNETIC VISOR / EYES
      // Dynamic Eye Glow & Blink
      const blink = Math.sin(time * 0.05) > 0.98 ? 0.1 : 1;
      const eyeHeight = (R * 0.14) * blink;
      const eyeWidth = R * 0.28;
      const eyeDist = R * 0.24;

      // Left Eye Visor (slanted futuristic Stark optic)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-eyeDist - eyeWidth, -R * 0.12);
      ctx.lineTo(-eyeDist, -R * 0.18);
      ctx.lineTo(-eyeDist, -R * 0.18 + eyeHeight);
      ctx.lineTo(-eyeDist - eyeWidth, -R * 0.12 + eyeHeight * 0.6);
      ctx.closePath();
      ctx.fillStyle = primaryColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 25 + (audioLevel * 30);
      ctx.fill();

      // Right Eye Visor
      ctx.beginPath();
      ctx.moveTo(eyeDist, -R * 0.18);
      ctx.lineTo(eyeDist + eyeWidth, -R * 0.12);
      ctx.lineTo(eyeDist + eyeWidth, -R * 0.12 + eyeHeight * 0.6);
      ctx.lineTo(eyeDist, -R * 0.18 + eyeHeight);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 4. TALKING MOUTH / VOCAL SYNTHESIZER
      // Reacts directly to speaking state or audio amplitude
      const mouthY = R * 0.42;
      const mouthWidth = R * 0.5;

      ctx.save();
      // Mouth aperture frame
      ctx.beginPath();
      ctx.rect(-mouthWidth / 2, mouthY - R * 0.08, mouthWidth, R * 0.16);
      ctx.strokeStyle = "rgba(0, 243, 255, 0.3)";
      ctx.lineWidth = 1.5 * window.devicePixelRatio;
      ctx.stroke();

      // Audio reactive mouth waveform bars inside the mouth
      const mouthBars = 9;
      const barW = mouthWidth / mouthBars;
      for (let i = 0; i < mouthBars; i++) {
        const norm = (i - mouthBars / 2) / (mouthBars / 2);
        const centerFactor = 1 - Math.abs(norm); // taller in middle

        let barH = R * 0.04;
        if (isSpeaking) {
          barH = R * 0.04 + (Math.sin(time * 0.4 + i * 0.8) * 0.5 + 0.5) * (R * 0.14);
        } else if (isListening) {
          barH = R * 0.04 + (audioLevel * R * 0.18 * centerFactor);
        } else if (isThinking) {
          barH = R * 0.04 + (Math.sin(time * 0.2 + i * 0.5) * 0.5 + 0.5) * (R * 0.06);
        }

        const bx = -mouthWidth / 2 + i * barW + barW * 0.2;
        ctx.fillStyle = primaryColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 10;
        ctx.fillRect(bx, mouthY - barH / 2, barW * 0.6, barH);
      }
      ctx.restore();

      ctx.restore();

      time += 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [state, audioLevel]);

  return (
    <div className="relative flex items-center justify-center w-60 h-60 sm:w-72 sm:h-72 mx-auto">
      {/* Background radial glow */}
      <div className={`absolute inset-0 rounded-full blur-3xl opacity-30 transition-colors duration-500 ${
        state === "listening" ? "bg-red-500" : state === "thinking" ? "bg-violet-600" : "bg-cyan-400"
      }`} />
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
