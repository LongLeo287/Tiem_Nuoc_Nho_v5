import React, { useState, useEffect, useRef } from 'react';
import { QrCode } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useUI } from '../context/UIContext';

interface QuickQrFabProps {
  onClick: () => void;
  appMode: 'order' | 'management' | 'finance';
}

export const QuickQrFab: React.FC<QuickQrFabProps> = ({ onClick, appMode }) => {
  const location = useLocation();
  const { isFabHidden } = useUI();
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;

    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 400);
    };

    main.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      main.removeEventListener('scroll', handleScroll);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  // Show on Menu (/) and History (/history) when in ORDER mode
  const isVisible = appMode === 'order' && (location.pathname === '/' || location.pathname === '/history') && !isFabHidden;

  if (!isVisible) return null;

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-[90px] left-6 z-50 w-14 h-14 bg-[#C9252C] text-white rounded-full shadow-xl flex items-center justify-center hover:bg-[#B91C1C] transition-all duration-300 ${
        isScrolling ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      aria-label="Mở mã QR"
    >
      <QrCode className="w-7 h-7" />
    </button>
  );
};
