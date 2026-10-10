import React from "react";

export default function RotatingSuitPlatform({ state = "idle", audioLevel = 0 }) {
  const isSpeaking = state === "speaking";

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none z-0 overflow-hidden">
      {/* 4D Holographic Container with Deep Spatial Perspective */}
      <div 
        className="relative w-[340px] h-[580px] sm:w-[440px] sm:h-[680px] flex items-center justify-center"
        style={{
          perspective: "1400px",
          transformStyle: "preserve-3d",
        }}
      >
        {/* 4D Quantum Holographic Armor Wrapper Rotating Right to Left */}
        <div 
          className="relative w-full h-full flex items-center justify-center animate-ironman-4d"
          style={{
            transformStyle: "preserve-3d",
            opacity: isSpeaking ? 0.85 : 0.65,
          }}
        >
          {/* Main User Uploaded Iron Man Artwork */}
          <img 
            src="/ironman.png" 
            alt="Iron Man Hologram" 
            className="w-full h-full object-contain rounded-2xl filter drop-shadow-[0_0_35px_rgba(0,243,255,0.4)]"
            style={{
              backfaceVisibility: "visible",
            }}
          />

          {/* 4D Holographic Depth Layer 1 (Glowing Cyan Quantum Circuit Scanlines) */}
          <div 
            className="absolute inset-0 rounded-2xl pointer-events-none opacity-30 mix-blend-screen"
            style={{
              transform: "translateZ(30px)",
              backgroundImage: "radial-gradient(circle at 50% 35%, rgba(0,243,255,0.6) 0%, transparent 60%)",
            }}
          />

          {/* 4D Holographic Depth Layer 2 (Arc Reactor Center Beam) */}
          <div 
            className="absolute w-24 h-24 rounded-full bg-cyan-400/40 blur-xl pointer-events-none top-[36%] left-1/2 -translate-x-1/2"
            style={{
              transform: "translateZ(50px)",
              animation: isSpeaking ? "pulse 1s infinite" : "none",
            }}
          />
        </div>

        {/* Dynamic Holographic Ground Carrier Gantry Pad */}
        <div 
          className="absolute -bottom-8 w-96 h-24 rounded-full border border-cyan-400/30 bg-gradient-to-r from-red-950/30 via-cyan-950/30 to-red-950/30 blur-sm pointer-events-none"
          style={{
            transform: "rotateX(75deg)",
          }}
        />
      </div>
    </div>
  );
}
