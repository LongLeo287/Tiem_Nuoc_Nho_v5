import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { useLocation } from 'react-router-dom';

export const BackToTopFab = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeScrollerRef = useRef<HTMLElement | Window | null>(null);
  const { isFabHidden } = useUI();
  const location = useLocation();

  // Reset state when navigating to a new tab
  useEffect(() => {
    setShowBackToTop(false);
    activeScrollerRef.current = null;
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | Document;
      // Handle document/body scroll or specific elements like pos-scroll-container
      const scrollTop = target instanceof Document ? target.documentElement.scrollTop : target.scrollTop;
      
      // Ensure the target is actually scrollable (has enough overflow) to avoid capturing micro-scrollers
      const scrollHeight = target instanceof Document ? target.documentElement.scrollHeight : target.scrollHeight;
      const clientHeight = target instanceof Document ? target.documentElement.clientHeight : target.clientHeight;
      
      const isScrollableNode = scrollHeight > clientHeight + 20;
      
      if (isScrollableNode) {
        // Capture the active scrolling container
        activeScrollerRef.current = target instanceof Document ? window : target;
        setShowBackToTop(scrollTop > 400);

        setIsScrolling(true);
        if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = setTimeout(() => {
          setIsScrolling(false);
        }, 400);
      }
    };

    // Use capturing phase (true) to catch scroll events from any nested container
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  const handleBackToTop = () => {
    if (activeScrollerRef.current) {
      activeScrollerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Fallback strategies
      const menuScroller = document.getElementById('pos-scroll-container');
      if (menuScroller && menuScroller.scrollTop > 0) {
        menuScroller.scrollTo({ top: 0, behavior: 'smooth' });
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Hide on settings page as requested
  if (!showBackToTop || isFabHidden || location.pathname === '/settings') return null;

  return (
    <button
      onClick={handleBackToTop}
      className={`fixed bottom-[160px] left-6 lg:bottom-[110px] lg:left-[284px] z-50 w-12 h-12 bg-white dark:bg-stone-900 text-stone-800 dark:text-white rounded-full shadow-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-center transition-all duration-300 ${
        isScrolling ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      aria-label="Lên đầu trang"
    >
      <ArrowUp className="w-6 h-6" />
    </button>
  );
};
