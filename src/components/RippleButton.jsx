import React, { useState, useEffect } from 'react';

export function RippleButton({ children, onClick, className = "", ...props }) {
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden cursor-pointer select-none active:scale-95 transition-transform ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function RippleButtonRipples() {
  const [ripples, setRipples] = useState([]);

  useEffect(() => {
    const handleGlobalClick = (e) => {
      // Busca si el clic fue dentro de un botón ripple
      const button = e.target.closest('.relative.overflow-hidden');
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newRipple = {
        id: Date.now() + Math.random(),
        x,
        y,
        size: Math.max(rect.width, rect.height) * 2,
      };

      setRipples((prev) => [...prev, newRipple]);
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  return (
    <span className="absolute inset-0 pointer-events-none block overflow-hidden rounded-[inherit]">
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute bg-white/30 rounded-full pointer-events-none block transform -translate-x-1/2 -translate-y-1/2 scale-0 opacity-100"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            // Animación elegante controlada: escala del 0% al 100% y desvanecimiento de opacidad a 0
            animation: 'rippleEffect 600ms cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
          }}
          onAnimationEnd={() => {
            setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
          }}
        />
      ))}
      
      {/* Estilos inyectados localmente para la animación de onda única */}
      <style>{`
        @keyframes rippleEffect {
          to {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </span>
  );
}