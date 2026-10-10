import React from "react";
import IronManSuitSVG from "./IronManSuitModel";

export default function RotatingSuitPlatform({ state = "idle", audioLevel = 0 }) {
  const isSpeaking = state === "speaking";

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none z-0 overflow-hidden">
      {/* 3D Container with Perspective */}
      <div 
        className="relative w-[340px] h-[600px] sm:w-[420px] sm:h-[680px] flex items-center justify-center"
        style={{
          perspective: "1200px",
        }}
      >
        {/* Horizontal 3D Rotation along Y-axis from Right to Left */}
        <div 
          className="w-full h-full animate-rotate-right-to-left"
          style={{
            transformStyle: "preserve-3d",
            filter: "drop-shadow(0 0 35px rgba(220, 38, 38, 0.35))",
            opacity: isSpeaking ? 0.7 : 0.5,
          }}
        >
          <IronManSuitSVG />
        </div>

        {/* Dynamic Holographic Ground Carrier Light Ring */}
        <div className="absolute -bottom-6 w-80 h-28 rounded-full border border-amber-500/25 bg-red-950/20 blur-md pointer-events-none" />
      </div>
    </div>
  );
}
