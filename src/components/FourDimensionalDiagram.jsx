import React, { useEffect, useRef } from "react";

/**
 * FourDimensionalDiagram: Crystalline Glass 4D Tesseract
 * Projects a 4-dimensional hypercube into 3D and 2D canvas space with frosted translucent glass styling.
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
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

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
      const isMobile = width < 640;
      const baseScale = isMobile ? Math.min(width, height) * 0.32 : Math.min(width, height) * 0.38;
      const pulseAmp = 1 + (audioLevel * 0.22) + (state === "speaking" ? 0.06 : state === "thinking" ? 0.04 : 0);

      const speedMult = state === "speaking" ? 1.5 : state === "thinking" ? 2.0 : 0.8;
      angleXY += 0.006 * speedMult;
      angleZW += 0.008 * speedMult;
      angleXW += 0.005 * speedMult;
      angleYZ += 0.004 * speedMult;

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

        // 3. Rotate in XW plane
        let x3 = x2 * cosXW - w2 * sinXW;
        let w3 = x2 * sinXW + w2 * cosXW;
        let y3 = y2;
        let z3 = z2;

        // 4. Rotate in YZ plane
        let y4 = y3 * cosYZ - z3 * sinYZ;
        let z4 = y3 * sinYZ + z3 * cosYZ;
        let x4 = x3;
        let w4 = w3;

        // 4D -> 3D Perspective Projection
        const d4 = 2.4;
        const wFactor = 1 / (d4 - w4);
        const x3D = x4 * wFactor;
        const y3D = y4 * wFactor;
        const z3D = z4 * wFactor;

        // 3D -> 2D Perspective Projection
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

      // 1. Frosted Glass Orbital Rings
      ctx.save();
      ctx.lineWidth = 1;
      const ringRadius = baseScale * 1.18 * pulseAmp;

      // Outer Ring
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.stroke();

      // Middle Dashed Cyan Ring
      ctx.beginPath();
      ctx.setLineDash([6, 14]);
      ctx.arc(cx, cy, ringRadius * 0.82, angleXY, angleXY + Math.PI * 2);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.14)";
      ctx.stroke();
      ctx.setLineDash([]);

      // Inner Soft Ring
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius * 0.35, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
      ctx.stroke();

      // Frosted Ticks
      const tickCount = 12;
      for (let t = 0; t < tickCount; t++) {
        const rad = (t * Math.PI * 2) / tickCount + angleZW * 0.5;
        const r1 = ringRadius - 5;
        const r2 = ringRadius + 5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rad) * r1, cy + Math.sin(rad) * r1);
        ctx.lineTo(cx + Math.cos(rad) * r2, cy + Math.sin(rad) * r2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.stroke();
      }
      ctx.restore();

      // 2. Draw 4D Hypercube Translucent Glass Edges
      edges.forEach(([i, j]) => {
        const p1 = projected2D[i];
        const p2 = projected2D[j];

        const avgW = (p1.w + p2.w) / 2;
        const normW = (avgW + 1) / 2;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);

        if (normW > 0.5) {
          ctx.strokeStyle = `rgba(56, 189, 248, ${0.12 + normW * 0.28})`;
          ctx.lineWidth = 1.2;
        } else {
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + (1 - normW) * 0.22})`;
          ctx.lineWidth = 1.0;
        }

        ctx.stroke();
      });

      // 3. Draw Crystalline Glass Vertices
      projected2D.forEach((p) => {
        const normW = (p.w + 1) / 2;
        const radius = Math.max(1.8, (2.2 + normW * 2.0) * (isMobile ? 0.8 : 1));

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);

        if (normW > 0.5) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.shadowColor = "rgba(56, 189, 248, 0.6)";
          ctx.shadowBlur = 8;
        } else {
          ctx.fillStyle = "rgba(203, 213, 225, 0.8)";
          ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
          ctx.shadowBlur = 5;
        }

        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 4. Clean minimal subtitle
      ctx.font = isMobile ? "8px 'JetBrains Mono', monospace" : "9px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      ctx.textAlign = "center";
      ctx.fillText(
        `4D TESSERACT // θ=${(angleXW % (Math.PI * 2)).toFixed(2)} rad`,
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
      {/* Soft translucent ambient background glow */}
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: "radial-gradient(circle at center, rgba(56, 189, 248, 0.08) 0%, rgba(99, 102, 241, 0.04) 45%, transparent 75%)"
        }}
      />
      {/* 4D Canvas */}
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block opacity-60 sm:opacity-75 transition-opacity duration-500" 
      />
    </div>
  );
}
