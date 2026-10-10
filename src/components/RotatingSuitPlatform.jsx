import React from "react";
import IronManSuitSVG from "./IronManSuitModel";

export default function RotatingSuitPlatform({ state = "idle", audioLevel = 0 }) {
  const isSpeaking = state === "speaking";

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none z-0 overflow-hidden">
      {/* 3D Rotating Carrier Container */}
      <div 
        className="relative w-[340px] h-[600px] sm:w-[420px] sm:h-[680px] flex items-center justify-center transition-transform duration-1000"
        style={{
          perspective: "1200px",
        }}
      >
        {/* Animated Rotating Pad & Suit Wrapper */}
        <div 
          className="w-full h-full animate-[spin_26s_linear_infinite]"
          style={{
            transformStyle: "preserve-3d",
            filter: "drop-shadow(0 0 35px rgba(220, 38, 38, 0.35))",
            opacity: isSpeaking ? 0.65 : 0.48,
          }}
        >
          <IronManSuitSVG />
        </div>

        {/* Dynamic Holographic Ground Projection Rings */}
        <div className="absolute -bottom-6 w-80 h-28 rounded-full border border-amber-500/25 bg-red-950/20 blur-md pointer-events-none" />
      </div>
    </div>
  );
}
