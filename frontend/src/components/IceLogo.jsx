import React from 'react';

// Copo de nieve SVG limpio
function Snowflake({ size, color }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    >
      {/* Ejes principales */}
      <line x1="16" y1="3" x2="16" y2="29" />
      <line x1="3" y1="16" x2="29" y2="16" />
      <line x1="6.5" y1="6.5" x2="25.5" y2="25.5" />
      <line x1="25.5" y1="6.5" x2="6.5" y2="25.5" />
      {/* Ramas eje vertical */}
      <line x1="16" y1="9" x2="12" y2="5" />
      <line x1="16" y1="9" x2="20" y2="5" />
      <line x1="16" y1="23" x2="12" y2="27" />
      <line x1="16" y1="23" x2="20" y2="27" />
      {/* Ramas eje horizontal */}
      <line x1="9"  y1="16" x2="5"  y2="12" />
      <line x1="9"  y1="16" x2="5"  y2="20" />
      <line x1="23" y1="16" x2="27" y2="12" />
      <line x1="23" y1="16" x2="27" y2="20" />
      {/* Centro */}
      <circle cx="16" cy="16" r="2.5" strokeWidth="2" />
    </svg>
  );
}

/**
 * IceLogo  variant="login" | "header"
 */
export default function IceLogo({ variant = 'header' }) {
  if (variant === 'login') {
    return (
      <div className="flex flex-col items-center gap-3">
        {/* Icono */}
        <div
          className="flex items-center justify-center rounded-3xl shadow-xl"
          style={{
            width: 80,
            height: 80,
            background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 40%, #7dd3fc 100%)',
            border: '3px solid rgba(255,255,255,0.8)',
          }}
        >
          <Snowflake size={44} color="#0369a1" />
        </div>
        {/* Nombre */}
        <div className="text-center">
          <h1 className="text-4xl font-black text-white tracking-tight leading-none">
            All <span style={{ color: '#bae6fd' }}>ice</span>
          </h1>
          <p className="text-blue-200 text-sm mt-1 font-medium">Gestión de visitas y ventas</p>
        </div>
      </div>
    );
  }

  // variant === 'header'
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex items-center justify-center rounded-xl"
        style={{
          width: 36,
          height: 36,
          background: 'linear-gradient(135deg, #bae6fd 0%, #7dd3fc 100%)',
        }}
      >
        <Snowflake size={22} color="#0c4a6e" />
      </div>
      <div className="leading-tight">
        <span className="font-black text-white text-base tracking-wide">
          All <span style={{ color: '#bae6fd' }}>ice</span>
        </span>
      </div>
    </div>
  );
}
