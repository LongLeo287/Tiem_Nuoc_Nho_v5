import React from 'react';
import { QrCode } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useUI } from '../context/UIContext';

interface QuickQrFabProps {
  onClick: () => void;
  appMode: 'order' | 'management' | 'finance';
}

export const QuickQrFab: React.FC<QuickQrFabProps> = ({ 
  onClick, 
  appMode
}) => {
  const location = useLocation();
  const { isFabHidden } = useUI();

  // Only show on main screen (Menu) and when in ORDER mode
  // and not hidden by other panels/modals
  const isVisible = appMode === 'order' && location.pathname === '/' && !isFabHidden;

  if (!isVisible) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-[90px] right-6 z-50 w-14 h-14 bg-[#C9252C] text-white rounded-full shadow-xl flex items-center justify-center hover:bg-[#B91C1C]"
      aria-label="Mở mã QR"
    >
      <QrCode className="w-7 h-7" />
    </button>
  );
};
