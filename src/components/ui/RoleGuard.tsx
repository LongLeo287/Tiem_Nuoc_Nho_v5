import React, { ReactNode } from 'react';
import { usePermission } from '../../hooks/usePermission';

interface RoleGuardProps {
  allowedRoles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children, fallback = null }) => {
  const { role } = usePermission();

  // Nếu role chưa được load hoặc không nằm trong danh sách allowedRoles:
  // Render fallback (mặc định là null - ẩn hoàn toàn khỏi DOM, không chỉ là CSS display:none)
  if (!role || !allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
