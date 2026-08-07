import React, { useEffect, useRef } from 'react';

export function BubbleBackground({ interactive = true, className = "", ...props }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let orbs = [];
    
    // Configuración del mouse con inercia (Lerp) para simular el delay suave
    const mouse = { x: null, y: null, targetX: null, targetY: null, isOver: false };
    const LERP_FACTOR = 0.04; // Factor ideal para un delay sutil, elegante y fluido

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Paleta de colores solicitada para los orbes de fondo
    const colors = [
      'rgba(249, 115, 22, 0.45)',  // Naranja llamativo
      'rgba(250, 128, 114, 0.4)', // Salmón
      'rgba(239, 68, 68, 0.4)',   // Rojo
      'rgba(128, 0, 32, 0.5)',    // Bordó profundo
      'rgba(37, 99, 235, 0.35)',  // Azul
      'rgba(26, 54, 93, 0.6)'     // Azul Marino
    ];

    class GlowingOrb {
      constructor(color, isInteractive = false) {
        this.isInteractive = isInteractive;
        this.color = color;
        this.reset();
        if (!isInteractive) {
          this.x = Math.random() * canvas.width;
          this.y = Math.random() * canvas.height;
        }
      }

      reset() {
        this.radius = Math.random() * 220 + 200; // Tamaño de los orbes
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        // Velocidades aumentadas para que tengan un dinamismo más marcado y no queden estáticos
        this.vx = (Math.random() - 0.5) * 2.2; 
        this.vy = (Math.random() - 0.5) * 2.2;
      }

      update() {
        if (this.isInteractive) {
          // Lógica del seguidor interactivo con delay físico
          if (mouse.targetX !== null && mouse.targetY !== null) {
            if (mouse.x === null) {
              mouse.x = mouse.targetX;
              mouse.y = mouse.targetY;
            }
            // Interpolación lineal (Lerp)
            mouse.x += (mouse.targetX - mouse.x) * LERP_FACTOR;
            mouse.y += (mouse.targetY - mouse.y) * LERP_FACTOR;
            
            this.x = mouse.x;
            this.y = mouse.y;
            this.radius = 340; 
          }
        } else {
          // Movimiento continuo de los orbes autónomos
          this.x += this.vx;
          this.y += this.vy;

          // Rebote fluido considerando los márgenes del radio borroso
          if (this.x < -this.radius || this.x > canvas.width + this.radius) this.vx *= -1;
          if (this.y < -this.radius || this.y > canvas.height + this.radius) this.vy *= -1;
        }
      }

      draw() {
        // No dibujar el interactivo si el cursor nunca entró a la sección
        if (this.isInteractive && !mouse.isOver) return;

        ctx.save();
        ctx.globalCompositeOperation = 'screen'; 
        
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(0.5, this.color.replace(/[\d.]+\)$/, '0.15)')); 
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); 

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();
      }
    }

    const init = () => {
      orbs = [];
      colors.forEach(color => {
        orbs.push(new GlowingOrb(color, false));
      });

      // Añadimos la burbuja especial interactiva que persigue al cursor
      if (interactive) {
        orbs.push(new GlowingOrb('rgba(251, 146, 60, 0.7)', true));
      }
    };
    init();

    const animate = () => {
      // Fondo base aclarado (un tono Slate/Azul marino translúcido que permite ver el fondo CSS)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      orbs.forEach((orb) => {
        orb.update();
        orb.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // Al escuchar sobre el contenedor padre real, capturamos el cursor pasando los pointer-events
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.isOver = true;
    };

    const handleMouseLeave = () => {
      mouse.isOver = false;
      mouse.targetX = null;
      mouse.targetY = null;
      mouse.x = null;
      mouse.y = null;
    };

    const parent = canvas.parentElement;
    if (interactive && parent) {
      parent.addEventListener('mousemove', handleMouseMove);
      parent.addEventListener('mouseleave', handleMouseLeave);
      // Por si entra directo desde arriba
      parent.addEventListener('mouseenter', handleMouseMove);
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
      if (interactive && parent) {
        parent.removeEventListener('mousemove', handleMouseMove);
        parent.removeEventListener('mouseleave', handleMouseLeave);
        parent.removeEventListener('mouseenter', handleMouseMove);
      }
    };
  }, [interactive]);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full filter blur-[50px] md:blur-[80px] ${className}`}
      {...props}
    />
  );
}