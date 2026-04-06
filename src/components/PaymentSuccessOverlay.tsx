import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../lib/useNotification';

interface PaymentSuccessOverlayProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export const PaymentSuccessOverlay: React.FC<PaymentSuccessOverlayProps> = ({ isVisible, onComplete }) => {
  const { addNotification } = useNotification();
  const [showCheckmark, setShowCheckmark] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Step 2 (150-450ms): Show checkmark SVG after 150ms
      const checkmarkTimer = setTimeout(() => {
        setShowCheckmark(true);
      }, 150);

      // Step 3 (450ms+): Show success toast and trigger onComplete callback
      const toastTimer = setTimeout(() => {
        addNotification({
          type: 'success',
          message: 'Thanh toán thành công! 🎉',
        });
        if (onComplete) onComplete();
      }, 450);

      return () => {
        clearTimeout(checkmarkTimer);
        clearTimeout(toastTimer);
      };
    } else {
      setShowCheckmark(false);
    }
  }, [isVisible, addNotification, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          {/* Step 1 (0-150ms): Full-screen overlay opacity 0 -> 0.6, emerald-500 */}
          {/* Step 2 (150-450ms): Overlay fades out 0.6 -> 0 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0, transition: { duration: 0.3, delay: 0.15 } }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-emerald-500"
          />

          {/* Step 2: Checkmark SVG animates in at center */}
          <AnimatePresence>
            {showCheckmark && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1.0] }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3, type: 'spring' }} // spring, 300ms
                className="relative z-10 bg-white rounded-full p-6 shadow-2xl"
              >
                <svg
                  className="w-20 h-20 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  {/* Stroke draw animation (SVG stroke-dashoffset trick) */}
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
};
