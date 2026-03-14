import { useCallback } from 'react';

export const useAddToCartAnimation = () => {
  const triggerAnimation = useCallback((itemId: string) => {
    // Step 3: Haptic feedback (nếu device hỗ trợ)
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(30);
      }
    } catch (error) {
      console.warn('Vibration API not supported', error);
    }

    // Step 1: Item card animation
    // Giả định thẻ món ăn có id dạng `menu-item-${itemId}`
    const itemElement = document.getElementById(`menu-item-${itemId}`);
    if (itemElement) {
      // Scale animation: 1.0 -> 1.08 -> 1.0 (duration: 200ms, ease-out)
      itemElement.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(1.08)' },
        { transform: 'scale(1)' }
      ], {
        duration: 200,
        easing: 'ease-out'
      });

      // Brief background flash: rgba(16,185,129,0.15) for 150ms
      const originalBg = itemElement.style.backgroundColor;
      itemElement.style.backgroundColor = 'rgba(16,185,129,0.15)';
      setTimeout(() => {
        itemElement.style.backgroundColor = originalBg;
      }, 150);
    }

    // Step 2: Cart badge (item count) animation
    // Giả định badge giỏ hàng có id `cart-badge`
    const badgeElement = document.getElementById('cart-badge');
    if (badgeElement) {
      // Bounce animation: translateY(0) -> translateY(-6px) -> translateY(0)
      badgeElement.animate([
        { transform: 'translateY(0)' },
        { transform: 'translateY(-6px)' },
        { transform: 'translateY(0)' }
      ], {
        duration: 250,
        easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' // Spring-like easing
      });

      // Badge background briefly flashes green then returns to normal
      const originalBadgeBg = badgeElement.style.backgroundColor;
      badgeElement.style.backgroundColor = '#10b981'; // emerald-500
      setTimeout(() => {
        badgeElement.style.backgroundColor = originalBadgeBg;
      }, 250);
    }
  }, []);

  return { triggerAnimation };
};
