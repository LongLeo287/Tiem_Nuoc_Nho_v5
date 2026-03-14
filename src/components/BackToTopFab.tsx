import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export const BackToTopFab = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;

    const handleScroll = () => {
      setShowBackToTop(main.scrollTop > 400);
    };

    main.addEventListener('scroll', handleScroll, { passive: true });
    return () => main.removeEventListener('scroll', handleScroll);
  }, []);

  if (!showBackToTop) return null;

  return (
    <button
      onClick={() => {
        const main = document.querySelector('main');
        if (main) main.scrollTo({ top: 0, behavior: 'auto' });
      }}
      className="fixed bottom-[160px] right-6 z-50 w-12 h-12 bg-white dark:bg-stone-900 text-stone-800 dark:text-white rounded-full shadow-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-center"
      aria-label="Lên đầu trang"
    >
      <ArrowUp className="w-6 h-6" />
    </button>
  );
};
