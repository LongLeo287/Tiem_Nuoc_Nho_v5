import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import { useUI } from '../context/UIContext';

export const BackToTopFab = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isFabHidden } = useUI();

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;

    const handleScroll = () => {
      setShowBackToTop(main.scrollTop > 400);

      // Mark as scrolling → hide FABs
      setIsScrolling(true);

      // Clear previous timer, restart 800ms idle timer
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

  if (!showBackToTop || isFabHidden) return null;

  return (
    <button
      onClick={() => {
        const main = document.querySelector('main');
        if (main) main.scrollTo({ top: 0, behavior: 'auto' });
      }}
      className={`fixed bottom-[160px] left-6 z-50 w-12 h-12 bg-white dark:bg-stone-900 text-stone-800 dark:text-white rounded-full shadow-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-center transition-all duration-300 ${
        isScrolling ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      aria-label="Lên đầu trang"
    >
      <ArrowUp className="w-6 h-6" />
    </button>
  );
};
