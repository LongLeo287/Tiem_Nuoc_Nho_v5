import React, { useState } from 'react';
import { useDrag } from '@use-gesture/react';
import { motion, useAnimation } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useNotification } from '../lib/useNotification';

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
}

export const SwipeableRow: React.FC<SwipeableRowProps> = ({ children, onDelete }) => {
  const controls = useAnimation();
  const { addNotification } = useNotification();
  const [isDeleted, setIsDeleted] = useState(false);

  const bind = useDrag(({ down, movement: [mx], direction: [xDir], velocity: [vx] }) => {
    // Chỉ cho phép vuốt sang trái (mx < 0)
    const x = Math.min(0, mx);
    
    if (down) {
      // Đang vuốt
      controls.start({ x, transition: { type: 'spring', stiffness: 400, damping: 40 } });
    } else {
      // Thả tay ra
      // Threshold: if swipe > 80px, auto-complete delete action
      if (x < -80 || (vx > 0.5 && xDir < 0)) {
        // Vượt ngưỡng 80px hoặc vuốt nhanh sang trái -> Xóa
        controls.start({ x: -window.innerWidth, transition: { duration: 0.2 } }).then(() => {
          setIsDeleted(true);
          onDelete();
          // Show a confirmation toast (auto-dismiss 8s)
          addNotification({
            type: 'success',
            message: 'Đã xóa giao dịch',
          });
        });
      } else {
        // If swipe < 80px, snap back to original position
        controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } });
      }
    }
  }, { axis: 'x' });

  if (isDeleted) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-red-500 mb-2">
      {/* Background Action (Trash) */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-end px-6 text-white">
        <Trash2 className="w-6 h-6" />
      </div>

      {/* Foreground Content */}
      <motion.div
        {...(bind() as any)}
        animate={controls}
        className="relative z-10 bg-white touch-pan-y"
        style={{ touchAction: 'pan-y' }} // Cho phép cuộn dọc, chặn cuộn ngang để vuốt
      >
        {children}
      </motion.div>
    </div>
  );
};
