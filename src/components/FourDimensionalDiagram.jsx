import React, { useEffect, useRef } from "react";

/**
 * FourDimensionalDiagram: High-performance 4D Tesseract (Hypercube) & Holographic Quantum HUD
 * Projects 16 4-dimensional vertices (x, y, z, w) rotated across XW, ZW, and YZ planes
 * into 3D and 2D canvas coordinate space with Stark holographic styling.
 * Lag-free: Uses hardware-accelerated 2D canvas with optimal devicePixelRatio.
 */
export default function FourDimensionalDiagram({ state = "idle", audioLevel = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    let animationFrameId;

    // 16 vertices of a 4D Hypercube (Tesseract): (±1, ±1, ±1, ±1)
    const vertices4D = [];
    for (let x = -1; x <= 1; x += 2) {
      for (let y = -1; y <= 1; y += 2) {
        for (let z = -1; z <= 1; z += 2) {
          for (let w = -1; w <= 1; w += 2) {
            vertices4D.push([x, y, z, w]);
          }
        }
      }
    }

    // 32 edges connecting vertices that differ in exactly one dimension
    const edges = [];
    for (let i = 0; i < vertices4D.length; i++) {
      for (let j = i + 1; j < vertices4D.length; j++) {
        let diffCount = 0;
        for (let k = 0; k < 4; k++) {
          if (vertices4D[i][k] !== vertices4D[j][k]) diffCount++;
        }
        if (diffCount === 1) {
          edges.push([i, j]);
        }
      }
    }

    // 4D Rotation angles
    let angleXY = 0;
    let angleZW = 0;
    let angleXW = 0;
    let angleYZ = 0;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // Cap at 1.5 for buttery smooth 60fps on mobile

    const resize = () => {
      if (!canvas) return;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      if (!width || !height) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      // Adjust size based on screen width (mobile vs desktop)
      const isMobile = width < 640;
      const baseScale = isMobile ? Math.min(width, height) * 0.32 : Math.min(width, height) * 0.38;
      const pulseAmp = 1 + (audioLevel * 0.25) + (state === "speaking" ? 0.08 : state === "thinking" ? 0.05 : 0);

      // 4D Rotation Speeds (Dynamic during speech/thinking)
      const speedMult = state === "speaking" ? 1.6 : state === "thinking" ? 2.2 : 0.85;
      angleXY += 0.007 * speedMult;
      angleZW += 0.009 * speedMult;
      angleXW += 0.005 * speedMult;
      angleYZ += 0.004 * speedMult;

      // Rotate and Project 4D -> 3D -> 2D
      const cosXY = Math.cos(angleXY), sinXY = Math.sin(angleXY);
      const cosZW = Math.cos(angleZW), sinZW = Math.sin(angleZW);
      const cosXW = Math.cos(angleXW), sinXW = Math.sin(angleXW);
      const cosYZ = Math.cos(angleYZ), sinYZ = Math.sin(angleYZ);

      const projected2D = [];

      for (let i = 0; i < vertices4D.length; i++) {
        let [x, y, z, w] = vertices4D[i];

        // 1. Rotate in XY plane
        let x1 = x * cosXY - y * sinXY;
        let y1 = x * sinXY + y * cosXY;
        let z1 = z;
        let w1 = w;

        // 2. Rotate in ZW plane
        let z2 = z1 * cosZW - w1 * sinZW;
        let w2 = z1 * sinZW + w1 * cosZW;
        let x2 = x1;
        let y2 = y1;

        // 3. Rotate in XW plane (Crucial 4D rotation through 4th dimension)
        let x3 = x2 * cosXW - w2 * sinXW;
        let w3 = x2 * sinXW + w2 * cosXW;
        let y3 = y2;
        let z3 = z2;

        // 4. Rotate in YZ plane
        let y4 = y3 * cosYZ - z3 * sinYZ;
        let z4 = y3 * sinYZ + z3 * cosYZ;
        let x4 = x3;
        let w4 = w3;

        // 4D -> 3D Perspective Projection (Distance d4 from 4D viewpoint)
        const d4 = 2.4;
        const wFactor = 1 / (d4 - w4);
        const x3D = x4 * wFactor;
        const y3D = y4 * wFactor;
        const z3D = z4 * wFactor;

        // 3D -> 2D Perspective Projection (Distance d3 from 3D viewpoint)
        const d3 = 3.2;
        const zFactor = 1 / (d3 - z3D);
        const px = cx + x3D * zFactor * baseScale * pulseAmp;
        const py = cy + y3D * zFactor * baseScale * pulseAmp;

        projected2D.push({
          x: px,
          y: py,
          depth: z3D,
          w: w4,
        });
      }

      // 1. Draw Holographic Circular Orbitals & Degree Markers
      ctx.save();
      ctx.lineWidth = 1;
      const ringRadius = baseScale * 1.18 * pulseAmp;

      // Outer HUD Ring
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(220, 38, 38, 0.12)";
      ctx.stroke();

      // Middle Dashed Quantum Ring
      ctx.beginPath();
      ctx.setLineDash([8, 12]);
      ctx.arc(cx, cy, ringRadius * 0.82, angleXY, angleXY + Math.PI * 2);
      ctx.strokeStyle = "rgba(245, 158, 11, 0.18)";
      ctx.stroke();
      ctx.setLineDash([]);

      // Inner Reticle Rings
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius * 0.35, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(220, 38, 38, 0.15)";
      ctx.stroke();

      // Holographic Axis Ticks
      const tickCount = 12;
      for (let t = 0; t < tickCount; t++) {
        const rad = (t * Math.PI * 2) / tickCount + angleZW * 0.5;
        const r1 = ringRadius - 6;
        const r2 = ringRadius + 6;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rad) * r1, cy + Math.sin(rad) * r1);
        ctx.lineTo(cx + Math.cos(rad) * r2, cy + Math.sin(rad) * r2);
        ctx.strokeStyle = "rgba(255, 195, 0, 0.25)";
        ctx.stroke();
      }
      ctx.restore();

      // 2. Draw 4D Hypercube Edges
      edges.forEach(([i, j]) => {
        const p1 = projected2D[i];
        const p2 = projected2D[j];

        // Color based on 4D coordinate depth (w & z)
        const avgW = (p1.w + p2.w) / 2;
        const normW = (avgW + 1) / 2; // 0 to 1

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);

        // Transition between Stark Crimson Red and Golden Amber
        if (normW > 0.5) {
          ctx.strokeStyle = `rgba(255, 195, 0, ${0.18 + normW * 0.35})`;
          ctx.lineWidth = 1.3;
        } else {
          ctx.strokeStyle = `rgba(220, 38, 38, ${0.15 + (1 - normW) * 0.3})`;
          ctx.lineWidth = 1.1;
        }

        ctx.stroke();
      });

      // 3. Draw 4D Quantum Nodes (Vertices)
      projected2D.forEach((p) => {
        const normW = (p.w + 1) / 2;
        const radius = Math.max(1.8, (2.4 + normW * 2.2) * (isMobile ? 0.8 : 1));

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);

        if (normW > 0.5) {
          ctx.fillStyle = "rgba(255, 214, 10, 0.85)";
          ctx.shadowColor = "rgba(255, 195, 0, 0.6)";
          ctx.shadowBlur = 8;
        } else {
          ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
          ctx.shadowColor = "rgba(220, 38, 38, 0.5)";
          ctx.shadowBlur = 6;
        }

        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 4. Subtle Tactical HUD telemetry text in the center
      ctx.font = isMobile ? "8px 'JetBrains Mono', monospace" : "9px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(245, 158, 11, 0.35)";
      ctx.textAlign = "center";
      ctx.fillText(
        `4D TESSERACT // θ=${(angleXW % (Math.PI * 2)).toFixed(2)} rad [XW]`,
        cx,
        cy + ringRadius + (isMobile ? 22 : 28)
      );

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, [state, audioLevel]);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
      {/* Subtle radial glow backdrop */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: "radial-gradient(circle at center, rgba(220, 38, 38, 0.18) 0%, rgba(245, 158, 11, 0.05) 45%, transparent 75%)"
        }}
      />
      {/* 4D Canvas */}
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block opacity-75 sm:opacity-85 transition-opacity duration-500" 
      />
    </div>
  );
}
