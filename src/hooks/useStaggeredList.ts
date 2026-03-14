import { Variants } from 'framer-motion';

export const useStaggeredList = () => {
  // Container variants để stagger children
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        // Item N animates after: N × 40ms delay
        staggerChildren: 0.04, 
      },
    },
  };

  // Item variants cho từng phần tử
  const itemVariants: Variants = {
    // Animation: opacity 0 -> 1, translateY(8px) -> 0
    hidden: { opacity: 0, y: 8 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        // Duration: 200ms per item, ease-out
        duration: 0.2, 
        ease: 'easeOut'
      }
    },
  };

  return { containerVariants, itemVariants };
};
