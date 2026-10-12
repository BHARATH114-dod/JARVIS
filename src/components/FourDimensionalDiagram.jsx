import React, { useEffect, useRef } from "react";

/**
 * FourDimensionalDiagram: 4D Tesseract canvas supporting Pitch Black and Light themes.
 */
export default function FourDimensionalDiagram({ state = "idle", audioLevel = 0, theme = "pitch-black" }) {
  const canvasRef = useRef(null);
  const isLight = theme === "light";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    let animationFrameId;

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

        let x1 = x * cosXY - y * sinXY;
        let y1 = x * sinXY + y * cosXY;
        let z1 = z;
        let w1 = w;

        let z2 = z1 * cosZW - w1 * sinZW;
        let w2 = z1 * sinZW + w1 * cosZW;
        let x2 = x1;
        let y2 = y1;

        let x3 = x2 * cosXW - w2 * sinXW;
        let w3 = x2 * sinXW + w2 * cosXW;
        let y3 = y2;
        let z3 = z2;

        let y4 = y3 * cosYZ - z3 * sinYZ;
        let z4 = y3 * sinYZ + z3 * cosYZ;
        let x4 = x3;
        let w4 = w3;

        const d4 = 2.4;
        const wFactor = 1 / (d4 - w4);
        const x3D = x4 * wFactor;
        const y3D = y4 * wFactor;
        const z3D = z4 * wFactor;

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

      // Orbital Rings
      ctx.save();
      ctx.lineWidth = 1;
      const ringRadius = baseScale * 1.18 * pulseAmp;

      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.07)" : "rgba(255, 255, 255, 0.08)";
      ctx.stroke();

      ctx.beginPath();
      ctx.setLineDash([6, 14]);
      ctx.arc(cx, cy, ringRadius * 0.82, angleXY, angleXY + Math.PI * 2);
      ctx.strokeStyle = isLight ? "rgba(37, 99, 235, 0.12)" : "rgba(56, 189, 248, 0.14)";
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius * 0.35, 0, Math.PI * 2);
      ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.05)" : "rgba(255, 255, 255, 0.07)";
      ctx.stroke();

      const tickCount = 12;
      for (let t = 0; t < tickCount; t++) {
        const rad = (t * Math.PI * 2) / tickCount + angleZW * 0.5;
        const r1 = ringRadius - 5;
        const r2 = ringRadius + 5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rad) * r1, cy + Math.sin(rad) * r1);
        ctx.lineTo(cx + Math.cos(rad) * r2, cy + Math.sin(rad) * r2);
        ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.1)" : "rgba(255, 255, 255, 0.15)";
        ctx.stroke();
      }
      ctx.restore();

      // Edges
      edges.forEach(([i, j]) => {
        const p1 = projected2D[i];
        const p2 = projected2D[j];

        const avgW = (p1.w + p2.w) / 2;
        const normW = (avgW + 1) / 2;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);

        if (isLight) {
          ctx.strokeStyle = normW > 0.5
            ? `rgba(37, 99, 235, ${0.12 + normW * 0.25})`
            : `rgba(15, 23, 42, ${0.08 + (1 - normW) * 0.18})`;
          ctx.lineWidth = normW > 0.5 ? 1.2 : 1.0;
        } else {
          ctx.strokeStyle = normW > 0.5
            ? `rgba(56, 189, 248, ${0.12 + normW * 0.28})`
            : `rgba(255, 255, 255, ${0.1 + (1 - normW) * 0.22})`;
          ctx.lineWidth = normW > 0.5 ? 1.2 : 1.0;
        }

        ctx.stroke();
      });

      // Vertices
      projected2D.forEach((p) => {
        const normW = (p.w + 1) / 2;
        const radius = Math.max(1.8, (2.2 + normW * 2.0) * (isMobile ? 0.8 : 1));

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);

        if (isLight) {
          ctx.fillStyle = normW > 0.5 ? "rgba(37, 99, 235, 0.85)" : "rgba(100, 116, 139, 0.8)";
          ctx.shadowColor = "rgba(37, 99, 235, 0.4)";
          ctx.shadowBlur = 6;
        } else {
          ctx.fillStyle = normW > 0.5 ? "rgba(255, 255, 255, 0.9)" : "rgba(203, 213, 225, 0.8)";
          ctx.shadowColor = "rgba(56, 189, 248, 0.6)";
          ctx.shadowBlur = 8;
        }

        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Subtitle
      ctx.font = isMobile ? "8px 'JetBrains Mono', monospace" : "9px 'JetBrains Mono', monospace";
      ctx.fillStyle = isLight ? "rgba(15, 23, 42, 0.25)" : "rgba(255, 255, 255, 0.25)";
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
  }, [state, audioLevel, isLight]);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: isLight
            ? "radial-gradient(circle at center, rgba(37, 99, 235, 0.06) 0%, transparent 65%)"
            : "radial-gradient(circle at center, rgba(56, 189, 248, 0.06) 0%, transparent 70%)"
        }}
      />
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block opacity-60 sm:opacity-75 transition-opacity duration-500" 
      />
    </div>
  );
}
