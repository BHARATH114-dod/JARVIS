import React, { useEffect, useRef } from "react";

export default function RotatingSuitPlatform({ state = "idle", audioLevel = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let angle = 0;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = (canvas.width = canvas.offsetWidth * dpr);
      const h = (canvas.height = canvas.offsetHeight * dpr);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2 + 10 * dpr;

      const isSpeaking = state === "speaking";
      const isListening = state === "listening";

      // Subtle Mark IV Red & Hot Gold Accents
      const goldAccent = "#ffc300";
      const crimsonColor = "#9b111e";
      const arcCyan = "#00f3ff";

      // Rotation angle calculation
      const rotSpeed = isSpeaking ? 0.015 : 0.008;
      angle += rotSpeed;

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // --- 1. ROTATING CIRCULAR GANTRY / PLATFORM PAD BASE ---
      const padY = cy + 130 * dpr;
      const padRx = 140 * dpr;
      const padRy = 45 * dpr;

      // Platform Outer Hydraulic Ring
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, padY, padRx, padRy, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(18, 5, 8, 0.4)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 195, 0, 0.25)";
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();

      // Platform Inner Glowing Ring
      ctx.beginPath();
      ctx.ellipse(cx, padY, padRx * 0.75, padRy * 0.75, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(220, 38, 38, 0.35)";
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();

      // Platform Gantry Light Markers (Rotating with pad)
      const numLights = 12;
      for (let i = 0; i < numLights; i++) {
        const la = angle + (i * Math.PI * 2) / numLights;
        const lx = cx + Math.cos(la) * padRx * 0.88;
        const ly = padY + Math.sin(la) * padRy * 0.88;
        ctx.beginPath();
        ctx.arc(lx, ly, 2.5 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = i % 3 === 0 ? "rgba(0, 243, 255, 0.7)" : "rgba(255, 195, 0, 0.6)";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 6 * dpr;
        ctx.fill();
      }
      ctx.restore();

      // --- 2. 3D ROTATING IRON MAN MARK IV SUIT SILHOUETTE ---
      // We simulate 3D rotation by using isometric projection (X transformed by cosA, depth by sinA)
      ctx.save();
      ctx.translate(cx, cy);

      const suitScale = dpr * 0.85;

      // Depth shading factor (-1 facing back, 1 facing front)
      const facingFront = cosA; // > 0 faces viewer
      const depthAlpha = 0.55 + 0.35 * Math.abs(cosA);

      // Helper function to project 3D point (x, y, z) to 2D screen
      const project = (x, y, z) => {
        const rotX = x * cosA - z * sinA;
        const rotZ = x * sinA + z * cosA;
        return {
          px: rotX * suitScale,
          py: (y + rotZ * 0.12) * suitScale,
          z: rotZ
        };
      };

      // Draw Upper Torso & Chest Armor Plate
      const chestTop = project(0, -50, 0);
      const shoulderL = project(-46, -42, 0);
      const shoulderR = project(46, -42, 0);
      const waistL = project(-22, 25, 0);
      const waistR = project(22, 25, 0);

      // Torso Plate
      ctx.beginPath();
      ctx.moveTo(shoulderL.px, shoulderL.py);
      ctx.lineTo(chestTop.px, chestTop.py - 10 * suitScale);
      ctx.lineTo(shoulderR.px, shoulderR.py);
      ctx.lineTo(waistR.px, waistR.py);
      ctx.lineTo(waistL.px, waistL.py);
      ctx.closePath();
      ctx.fillStyle = `rgba(140, 18, 28, ${depthAlpha * 0.5})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 195, 0, ${depthAlpha * 0.45})`;
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();

      // Golden Faceplate / Helmet (Mark IV Angular Mask)
      const headCenter = project(0, -90, 0);
      const headW = 24 * suitScale;
      const headH = 34 * suitScale;

      ctx.beginPath();
      ctx.ellipse(headCenter.px, headCenter.py, headW, headH, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 24, 38, ${depthAlpha * 0.6})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 214, 10, ${depthAlpha * 0.6})`;
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();

      // Mask Golden Inset
      ctx.beginPath();
      ctx.moveTo(headCenter.px - 14 * suitScale, headCenter.py - 14 * suitScale);
      ctx.lineTo(headCenter.px + 14 * suitScale, headCenter.py - 14 * suitScale);
      ctx.lineTo(headCenter.px + 10 * suitScale, headCenter.py + 18 * suitScale);
      ctx.lineTo(headCenter.px - 10 * suitScale, headCenter.py + 18 * suitScale);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 195, 0, ${depthAlpha * 0.45})`;
      ctx.fill();

      // Glowing Eye Slits (Visible when facing front)
      if (facingFront > -0.2) {
        const eyeAlpha = Math.max(0.2, (facingFront + 0.2) / 1.2);
        const eyeOffset = 8 * suitScale;
        const eyeY = headCenter.py - 4 * suitScale;

        ctx.fillStyle = `rgba(255, 255, 255, ${eyeAlpha * 0.95})`;
        ctx.shadowColor = arcCyan;
        ctx.shadowBlur = 10 * dpr;

        // Left eye
        ctx.fillRect(headCenter.px - eyeOffset - 6 * suitScale, eyeY, 7 * suitScale, 2.5 * suitScale);
        // Right eye
        ctx.fillRect(headCenter.px + eyeOffset - 1 * suitScale, eyeY, 7 * suitScale, 2.5 * suitScale);
      }

      // Mark IV Circular Unibeam / Arc Reactor on Chest
      if (facingFront > -0.1) {
        const arcPos = project(0, -18, 12);
        const arcAlpha = Math.max(0.2, (facingFront + 0.1) / 1.1);
        const pulse = 1 + (isSpeaking ? 0.3 * Math.sin(angle * 8) : 0.1 * Math.sin(angle * 3));

        ctx.beginPath();
        ctx.arc(arcPos.px, arcPos.py, 8 * suitScale * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${arcAlpha * 0.95})`;
        ctx.shadowColor = arcCyan;
        ctx.shadowBlur = 16 * dpr;
        ctx.fill();

        ctx.strokeStyle = `rgba(0, 243, 255, ${arcAlpha * 0.8})`;
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();
      }

      // Legs down to Gantry Pad
      const kneeL = project(-18, 80, 0);
      const kneeR = project(18, 80, 0);
      const footL = project(-16, 130, 0);
      const footR = project(16, 130, 0);

      // Thighs
      ctx.beginPath();
      ctx.moveTo(waistL.px, waistL.py);
      ctx.lineTo(kneeL.px, kneeL.py);
      ctx.moveTo(waistR.px, waistR.py);
      ctx.lineTo(kneeR.px, kneeR.py);
      // Calves
      ctx.lineTo(footR.px, footR.py);
      ctx.moveTo(kneeL.px, kneeL.py);
      ctx.lineTo(footL.px, footL.py);
      ctx.strokeStyle = `rgba(255, 195, 0, ${depthAlpha * 0.35})`;
      ctx.lineWidth = 3.5 * dpr;
      ctx.stroke();

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [state, audioLevel]);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-35 select-none z-0 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full max-w-4xl max-h-[700px] block" />
    </div>
  );
}
