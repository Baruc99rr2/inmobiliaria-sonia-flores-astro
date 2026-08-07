import React, { useState, useEffect, useRef } from 'react';

const LoadingScreen = ({ onFinish }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const isVideoReadyRef = useRef(false);

  useEffect(() => {
    const hasLoadedBefore = sessionStorage.getItem('hasLoadedBefore');

    if (hasLoadedBefore) {
      setIsLoading(false);
      if (onFinish) onFinish();
      return;
    }

    const duration = 3000; 
    const intervalTime = 16; 
    const step = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95 && !isVideoReadyRef.current) {
          return 95;
        }
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + step;
      });
    }, intervalTime);

    const checkUnmountInterval = setInterval(() => {
      if (isVideoReadyRef.current) {
        setProgress(100);
        clearInterval(timer);
        clearInterval(checkUnmountInterval);
        clearTimeout(safetyTimeout);

        setFadeOut(true);
        sessionStorage.setItem('hasLoadedBefore', 'true');
        
        setTimeout(() => {
          setIsLoading(false);
          if (onFinish) onFinish();
        }, 500);
      }
    }, 100);

    const safetyTimeout = setTimeout(() => {
      isVideoReadyRef.current = true; 
    }, 6500);

    return () => {
      clearInterval(timer);
      clearInterval(checkUnmountInterval);
      clearTimeout(safetyTimeout);
    };
  }, [onFinish]);

  if (!isLoading) return null;

  return (
    <>
      <div 
        className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-gradient-to-br from-red-700 via-red-950 to-neutral-950 transition-opacity duration-500 ease-out ${
          fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ willChange: 'opacity' }}
      >
        <div className="relative mb-8 max-w-[200px] sm:max-w-[260px] px-4 select-none animate-smooth-pulse">
          <img 
            src="/SoniaLogo.png" 
            alt="Inmobiliaria Sonia Flores" 
            className="w-full h-auto object-contain drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
            loading="eager"
          />
        </div>

        <div className="w-[180px] sm:w-[240px] h-[3px] bg-black/40 rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-white rounded-full transition-all ease-out"
            style={{ 
              width: `${progress}%`,
              transitionDuration: '16ms',
              willChange: 'width',
              boxShadow: '0 0 8px rgba(255, 255, 255, 0.8)'
            }}
          />
        </div>

        <p className="text-[10px] tracking-[0.25em] text-white/40 uppercase mt-4 font-medium animate-pulse">
          Inmobiliaria Sonia Flores
        </p>
      </div>

      <style>{`
        @keyframes smoothPulse {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
          }
          50% {
            transform: scale(1.025);
            filter: drop-shadow(0 6px 20px rgba(220,38,38,0.25));
          }
        }
        .animate-smooth-pulse {
          animation: smoothPulse 3.5s ease-in-out infinite;
          will-change: transform, filter;
        }
      `}</style>
    </>
  );
};

export default LoadingScreen;