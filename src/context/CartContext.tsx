import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem } from '../types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  updateCartItem: (cartItemId: string, updatedItem: CartItem) => void;
  clearCart: () => void;
  restoreCart: (items: CartItem[]) => void;
  saveCartForLater: (name: string) => void;
  loadSavedCart: (id: string) => void;
  deleteSavedCart: (id: string) => void;
  savedCarts: { id: string; name: string; items: CartItem[]; timestamp: Date }[];
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [savedCarts, setSavedCarts] = useState<{ id: string; name: string; items: CartItem[]; timestamp: Date }[]>(() => {
    const saved = localStorage.getItem('saved_carts');
    return saved ? JSON.parse(saved).map((c: any) => ({ ...c, timestamp: new Date(c.timestamp) })) : [];
  });

  useEffect(() => {
    localStorage.setItem('saved_carts', JSON.stringify(savedCarts));
  }, [savedCarts]);

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

  const saveCartForLater = (name: string) => {
    if (cart.length === 0) return;
    const newSavedCart = {
      id: Math.random().toString(36).substr(2, 9),
      name: name || `Đơn tạm ${savedCarts.length + 1}`,
      items: [...cart],
      timestamp: new Date()
    };
    setSavedCarts(prev => [newSavedCart, ...prev]);
    setCart([]);
  };

  const loadSavedCart = (id: string) => {
    const target = savedCarts.find(c => c.id === id);
    if (target) {
      setCart(target.items);
      setSavedCarts(prev => prev.filter(c => c.id !== id));
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
