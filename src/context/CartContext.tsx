import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem } from '../types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  updateCartItem: (cartItemId: string, updatedItem: CartItem) => void;
  clearCart: () => void;
  restoreCart: (items: CartItem[]) => void;
  saveCartForLater: (options?: string | { editingOrderId?: string; name?: string; context?: any }) => void;
  loadSavedCart: (id: string) => void;
  deleteSavedCart: (id: string) => void;
  savedCarts: { id: string; name: string; items: CartItem[]; timestamp: Date; editingOrderId?: string; context?: any }[];
  saveDraft: (options?: string | { editingOrderId?: string; name?: string; context?: any }) => void;
  availableDrafts: { id: string; name: string; items: CartItem[]; timestamp: Date; editingOrderId?: string; context?: any }[];
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('cart_autosave');
      return saved ? (JSON.parse(saved) || []) : [];
    } catch {
      return [];
    }
  });
  const [savedCarts, setSavedCarts] = useState<{ id: string; name: string; items: CartItem[]; timestamp: Date; editingOrderId?: string; context?: any }[]>(() => {
    try {
      const saved = localStorage.getItem('saved_carts');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((c: any) => ({ ...c, timestamp: new Date(c.timestamp) }));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('saved_carts', JSON.stringify(savedCarts));
  }, [savedCarts]);

  useEffect(() => {
    localStorage.setItem('cart_autosave', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find(
        (i) =>
          i.id === item.id &&
          i.size === item.size &&
          JSON.stringify(i.toppings) === JSON.stringify(item.toppings) &&
          i.temperature === item.temperature &&
          i.sugarLevel === item.sugarLevel &&
          i.iceLevel === item.iceLevel &&
          i.note === item.note
      );

      if (existing) {
        return prev.map((i) =>
          i.cartItemId === existing.cartItemId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      
      // Ensure unique cartItemId
      let newCartItemId = item.cartItemId;
      while (prev.some(i => i.cartItemId === newCartItemId)) {
        newCartItemId = Math.random().toString(36).substr(2, 9);
      }
      
      return [...prev, { ...item, cartItemId: newCartItemId }];
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const updateCartItem = (cartItemId: string, updatedItem: CartItem) => {
    setCart((prev) =>
      prev.map((item) => (item.cartItemId === cartItemId ? updatedItem : item))
    );
  };

  const clearCart = () => setCart([]);

  const restoreCart = (items: CartItem[]) => setCart(items);

  const saveCartForLater = (options?: string | { editingOrderId?: string; name?: string; context?: any }) => {
    if ((cart || []).length === 0) return;
    
    let name = '';
    let editingOrderId = undefined;
    let context = undefined;
    
    if (typeof options === 'string') {
      name = options;
    } else if (options && typeof options === 'object') {
      name = options.name || '';
      editingOrderId = options.editingOrderId;
      context = options.context;
    }

    const newSavedCart = {
      id: Math.random().toString(36).substr(2, 9),
      name: name || (editingOrderId ? `Đang sửa: ${editingOrderId}` : `Đơn tạm ${(savedCarts || []).length + 1}`),
      items: [...cart],
      timestamp: new Date(),
      editingOrderId,
      context
    };
    setSavedCarts(prev => [newSavedCart, ...prev]);
    setCart([]);
  };

  const loadSavedCart = (id: string) => {
    const target = savedCarts.find(c => c.id === id);
    if (target) {
      setCart(target.items);
      // Deliberately keep the saved cart in savedCarts until user submits or explicitly deletes.
      // This prevents silent loss of saved orders when the user switches tabs.
      // The cart will be removed by deleteSavedCart() which Cart.tsx calls after a successful submit.
    }
  };

  const deleteSavedCart = (id: string) => {
    setSavedCarts(prev => prev.filter(c => c.id !== id));
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cart, addToCart, updateQuantity, updateCartItem, clearCart, restoreCart, 
      saveCartForLater, loadSavedCart, deleteSavedCart, savedCarts,
      saveDraft: saveCartForLater, availableDrafts: savedCarts,
      cartCount 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
