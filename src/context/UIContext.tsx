import React, { createContext, useContext, useState } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface UIContextType {
  isFabHidden: boolean;
  setIsFabHidden: (hidden: boolean) => void;
  isNavHidden: boolean;
  setIsNavHidden: (hidden: boolean) => void;
  toasts: Toast[];
  showToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  pendingWorkLabel: string | null;
  setPendingWorkLabel: (label: string | null) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [isFabHidden, setIsFabHidden] = useState(false);
  const [isNavHidden, setIsNavHidden] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pendingWorkLabel, setPendingWorkLabel] = useState<string | null>(null);

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts([{ id, message, type }]); // replace → chỉ 1 toast tại một thời điểm
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <UIContext.Provider value={{ 
      isFabHidden, setIsFabHidden, 
      isNavHidden, setIsNavHidden,
      toasts, showToast, removeToast,
      pendingWorkLabel, setPendingWorkLabel
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
