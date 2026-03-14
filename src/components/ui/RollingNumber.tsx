import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RollingNumberProps {
  value: number;
  currency?: string;
}

export const RollingNumber: React.FC<RollingNumberProps> = ({ value, currency = 'đ' }) => {
  const [prevValue, setPrevValue] = useState(value);
  const isIncreasing = value > prevValue;

  useEffect(() => {
    setPrevValue(value);
  }, [value]);

  // Format number to string with commas (e.g. 1,000,000)
  const numString = value.toLocaleString('vi-VN');

  return (
    <div className="flex items-center font-mono font-bold overflow-hidden">
      <AnimatePresence mode="popLayout">
        {numString.split('').map((char, index) => {
          // If the character is a separator, don't animate it
          if (char === '.' || char === ',') {
            return <span key={`sep-${index}-${char}`}>{char}</span>;
          }

          // Use a unique key based on position and character to trigger animation when it changes
          return (
            <motion.span
              key={`${index}-${char}`}
              // Each digit: translateY(100%) -> 0 when increasing
              // Each digit: translateY(-100%) -> 0 when decreasing
              initial={{ y: isIncreasing ? '100%' : '-100%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              exit={{ y: isIncreasing ? '-100%' : '100%', opacity: 0 }}
              // Duration per digit: 180ms, ease-out
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="inline-block"
            >
              {char}
            </motion.span>
          );
        })}
      </AnimatePresence>
      <span className="ml-1">{currency}</span>
    </div>
  );
};
