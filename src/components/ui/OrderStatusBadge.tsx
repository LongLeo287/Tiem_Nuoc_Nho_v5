import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type OrderStatus = 'pending' | 'preparing' | 'completed' | 'cancelled';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const statusConfig: Record<OrderStatus, { label: string; colorClass: string }> = {
  pending: { label: 'Chờ xử lý', colorClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  preparing: { label: 'Đang chuẩn bị', colorClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Hoàn thành', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  cancelled: { label: 'Đã hủy', colorClass: 'bg-red-100 text-red-800 border-red-200' },
};

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status];

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={status}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.15 } }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={twMerge(
          clsx(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
            config.colorClass,
            className
          )
        )}
      >
        {config.label}
      </motion.span>
    </AnimatePresence>
  );
};
