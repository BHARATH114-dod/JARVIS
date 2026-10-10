import React from "react";

export default function IronManSuitModel() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 700" width="100%" height="100%">
      <defs>
        <linearGradient id="armorRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b91c1c" />
          <stop offset="50%" stopColor="#7f1d1d" />
          <stop offset="100%" stopColor="#450a0a" />
        </linearGradient>
        <linearGradient id="brightRed" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>

        <linearGradient id="armorGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>

        <filter id="arcGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ROTATING GANTRY PAD CARRIER BASE */}
      <g transform="translate(200, 620)">
        <ellipse cx="0" cy="0" rx="160" ry="40" fill="#140609" stroke="#b91c1c" strokeWidth="3" />
        <ellipse cx="0" cy="0" rx="135" ry="32" fill="none" stroke="#eab308" strokeWidth="1.5" strokeDasharray="8 6" />
        <ellipse cx="0" cy="0" rx="90" ry="20" fill="#200a0e" stroke="#00f3ff" strokeWidth="1.5" opacity="0.6" />
        <circle cx="-135" cy="0" r="4" fill="#00f3ff" filter="url(#arcGlow)" />
        <circle cx="135" cy="0" r="4" fill="#00f3ff" filter="url(#arcGlow)" />
        <circle cx="0" cy="32" r="4" fill="#eab308" filter="url(#arcGlow)" />
        <circle cx="0" cy="-32" r="4" fill="#eab308" filter="url(#arcGlow)" />
      </g>

      {/* IRON MAN MARK IV ARMOR SUIT */}
      <g transform="translate(200, 310)">
        {/* Legs */}
        <path d="M-55,140 L-25,140 L-30,230 L-60,230 Z" fill="url(#armorGold)" stroke="#7f1d1d" strokeWidth="2" />
        <path d="M-62,230 L-28,230 L-32,310 L-68,310 Z" fill="url(#armorRed)" stroke="#eab308" strokeWidth="2" />
        <path d="M25,140 L55,140 L60,230 L30,230 Z" fill="url(#armorGold)" stroke="#7f1d1d" strokeWidth="2" />
        <path d="M28,230 L62,230 L68,310 L32,310 Z" fill="url(#armorRed)" stroke="#eab308" strokeWidth="2" />

        {/* Boots */}
        <path d="M-72,310 L-25,310 L-20,330 L-76,330 Z" fill="url(#brightRed)" stroke="#b91c1c" strokeWidth="2" />
        <path d="M25,310 L72,310 L76,330 L20,330 Z" fill="url(#brightRed)" stroke="#b91c1c" strokeWidth="2" />

        {/* Waist */}
        <path d="M-50,85 L50,85 L35,145 L0,165 L-35,145 Z" fill="url(#armorRed)" stroke="#eab308" strokeWidth="2" />
        <polygon points="-20,95 20,95 12,135 0,145 -12,135" fill="url(#armorGold)" />

        {/* Torso */}
        <path d="M-45,35 L45,35 L38,85 L-38,85 Z" fill="url(#armorGold)" stroke="#b91c1c" strokeWidth="2" />
        <line x1="-35" y1="52" x2="35" y2="52" stroke="#7f1d1d" strokeWidth="3" />
        <line x1="-32" y1="68" x2="32" y2="68" stroke="#7f1d1d" strokeWidth="3" />

        {/* Chest Plate */}
        <path d="M-70,-55 L70,-55 L60,35 L-60,35 Z" fill="url(#armorRed)" stroke="#eab308" strokeWidth="2.5" />
        <polygon points="-65,-50 -10,-50 -15,10 -55,10" fill="url(#brightRed)" stroke="#a16207" strokeWidth="1.5" />
        <polygon points="65,-50 10,-50 15,10 55,10" fill="url(#brightRed)" stroke="#a16207" strokeWidth="1.5" />

        {/* Circular Arc Reactor Unibeam */}
        <circle cx="0" cy="-18" r="22" fill="#0f172a" stroke="#eab308" strokeWidth="3" />
        <circle cx="0" cy="-18" r="16" fill="#e0f2fe" filter="url(#arcGlow)" />
        <circle cx="0" cy="-18" r="9" fill="#ffffff" />

        {/* Shoulders */}
        <path d="M-70,-55 L-110,-35 L-95,15 L-65,0 Z" fill="url(#brightRed)" stroke="#eab308" strokeWidth="2" />
        <path d="M70,-55 L110,-35 L95,15 L65,0 Z" fill="url(#brightRed)" stroke="#eab308" strokeWidth="2" />

        {/* Arms */}
        <path d="M-105,-20 L-80,-15 L-85,60 L-110,55 Z" fill="url(#armorGold)" stroke="#7f1d1d" strokeWidth="2" />
        <path d="M105,-20 L80,-15 L85,60 L110,55 Z" fill="url(#armorGold)" stroke="#7f1d1d" strokeWidth="2" />
        <path d="M-112,60 L-83,65 L-88,140 L-116,135 Z" fill="url(#armorRed)" stroke="#eab308" strokeWidth="2" />
        <path d="M112,60 L83,65 L88,140 L116,135 Z" fill="url(#armorRed)" stroke="#eab308" strokeWidth="2" />

        {/* Helmet */}
        <g transform="translate(0, -95)">
          <path d="M-36,-25 C-36,-65 36,-65 36,-25 L32,32 L0,48 L-32,32 Z" fill="url(#armorRed)" stroke="#7f1d1d" strokeWidth="2.5" />
          <path d="M-26,-22 L26,-22 L22,28 L0,42 L-22,28 Z" fill="url(#armorGold)" stroke="#a16207" strokeWidth="2" />
          <path d="M-16,-22 L16,-22 L12,-2 L-12,-2 Z" fill="url(#brightRed)" />
          <polygon points="-20,5 -6,2 -7,8 -19,10" fill="#ffffff" filter="url(#arcGlow)" />
          <polygon points="20,5 6,2 7,8 19,10" fill="#ffffff" filter="url(#arcGlow)" />
          <line x1="-12" y1="26" x2="12" y2="26" stroke="#450a0a" strokeWidth="2.5" />
        </g>
      </g>
    </svg>
  );
}
