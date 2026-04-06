import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TouchButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
}

export const TouchButton = React.forwardRef<HTMLButtonElement, TouchButtonProps>(
  ({ className, variant = 'primary', fullWidth, children, ...props }, ref) => {
    // Base styles: min-height 48px, touch-action manipulation, focus ring, no hover-only dependency
    const baseStyles = "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 touch-manipulation min-h-[48px] px-4 gap-2 select-none";
    
    const variants = {
      primary: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
      secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500",
      danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
      ghost: "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500",
    };

    return (
      <motion.button
        ref={ref}
        // Active scale-down animation on press
        whileTap={{ scale: 0.97 }}
        className={cn(
          baseStyles,
          variants[variant],
          // Full width on mobile, auto on sm+
          fullWidth && "w-full sm:w-auto",
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

TouchButton.displayName = 'TouchButton';
