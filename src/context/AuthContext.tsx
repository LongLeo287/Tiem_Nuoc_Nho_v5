import React, { createContext, useContext, useState, useEffect } from 'react';
import { Staff, TimeSheet, Role } from '../types';

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  performerName?: string;
}

interface AuthContextType {
  currentUser: Staff | null;
  staffList: Staff[];
  timeSheets: TimeSheet[];
  logs: AuditLog[];
  login: (username: string, pin: string) => boolean;
  logout: () => void;
  checkIn: () => void;
  checkOut: () => void;
  addStaff: (staff: Omit<Staff, 'id'>) => void;
  updateStaff: (id: string, updates: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;
  updateProfile: (updates: Partial<Pick<Staff, 'name' | 'pin' | 'username'>>) => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- Staff Management ---
  const [staffList, setStaffList] = useState<Staff[]>(() => {
    const saved = localStorage.getItem('staff_list');
    return saved ? JSON.parse(saved) : [
      // Default Admin Account
      { id: 'admin', username: 'admin', pin: '1234', name: 'Quản Lý', role: 'manager', active: true },
      // Default Staff Account
      { id: 'staff1', username: 'staff', pin: '0000', name: 'Nhân Viên 1', role: 'staff', active: true }
    ];
  });

  useEffect(() => {
    localStorage.setItem('staff_list', JSON.stringify(staffList));
  }, [staffList]);

  // --- Current Session ---
  const [currentUser, setCurrentUser] = useState<Staff | null>(() => {
    const saved = localStorage.getItem('current_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('current_user');
    }
  }, [currentUser]);

  // --- Time Sheets ---
  const [timeSheets, setTimeSheets] = useState<TimeSheet[]>(() => {
    const saved = localStorage.getItem('time_sheets');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('time_sheets', JSON.stringify(timeSheets));
  }, [timeSheets]);

  // --- Audit Logs ---
  const [logs, setLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('audit_logs');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('audit_logs', JSON.stringify(logs));
  }, [logs]);

  const logAction = (action: string, details: string) => {
    const newLog: AuditLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      action,
      details,
      performerName: currentUser?.name || 'System'
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // --- Actions ---

  const login = (username: string, pin: string) => {
    // Case-insensitive username check
    let user = staffList.find(s => s.username.toLowerCase() === username.toLowerCase() && s.pin === pin && s.active);
    
    // Emergency Fallback for Admin/1234
    if (!user && username.toLowerCase() === 'admin' && pin === '1234') {
       const existingAdminIndex = staffList.findIndex(s => s.username.toLowerCase() === 'admin');
       
       if (existingAdminIndex >= 0) {
         // Update existing admin
         const updatedList = [...staffList];
         updatedList[existingAdminIndex] = { 
           ...updatedList[existingAdminIndex], 
           pin: '1234',
           active: true,
           role: 'manager' 
         };
         setStaffList(updatedList);
         user = updatedList[existingAdminIndex];
       } else {
         // Create default admin
         const defaultAdmin: Staff = { id: 'admin', username: 'admin', pin: '1234', name: 'Quản Lý', role: 'manager', active: true };
         setStaffList(prev => [...prev, defaultAdmin]);
         user = defaultAdmin;
       }
    }

    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const checkIn = () => {
    if (!currentUser) return;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Check if already checked in today without checkout?
    // For simplicity, allow multiple check-ins per day, create new entry
    const newEntry: TimeSheet = {
      id: Date.now().toString(),
      staffId: currentUser.id,
      checkIn: now.toISOString(),
      date: today
    };
    setTimeSheets(prev => [newEntry, ...prev]);
  };

  const checkOut = () => {
    if (!currentUser) return;
    // Find the latest open session for this user
    const openSession = timeSheets.find(t => t.staffId === currentUser.id && !t.checkOut);
    if (openSession) {
      const now = new Date();
      const checkInTime = new Date(openSession.checkIn);
      const diffMs = now.getTime() - checkInTime.getTime();
      const hours = diffMs / (1000 * 60 * 60);

      const updatedSession = {
        ...openSession,
        checkOut: now.toISOString(),
        totalHours: parseFloat(hours.toFixed(2))
      };

      setTimeSheets(prev => prev.map(t => t.id === openSession.id ? updatedSession : t));
    }
  };

  const addStaff = (staff: Omit<Staff, 'id'>) => {
    const newStaff = { ...staff, id: Date.now().toString() };
    setStaffList(prev => [...prev, newStaff]);
    logAction('Thêm nhân viên', `Thêm nhân viên mới: ${staff.name} (${staff.username})`);
  };

  const updateStaff = (id: string, updates: Partial<Staff>) => {
    const oldStaff = staffList.find(s => s.id === id);
    
    // Prevent changing own role if not admin, or ensure logic is safe
    // For now, we trust the UI to hide the role selector for non-admins
    
    setStaffList(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    
    // If updating current user, update session too
    if (currentUser && currentUser.id === id) {
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
    
    if (oldStaff) {
      const changes = Object.keys(updates).map(key => {
        if (key === 'pin') return 'PIN';
        return key;
      }).join(', ');
      logAction('Cập nhật nhân viên', `Cập nhật ${oldStaff.name}: ${changes}`);
    }
  };

  const updateProfile = (updates: Partial<Pick<Staff, 'name' | 'pin' | 'username'>>) => {
    if (!currentUser) return;
    updateStaff(currentUser.id, updates);
    logAction('Cập nhật cá nhân', `${currentUser.name} tự cập nhật thông tin`);
  };

  const deleteStaff = (id: string) => {
    const staff = staffList.find(s => s.id === id);
    setStaffList(prev => prev.filter(s => s.id !== id));
    if (currentUser?.id === id) logout();
    
    if (staff) {
      logAction('Xóa nhân viên', `Xóa nhân viên: ${staff.name}`);
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      staffList,
      timeSheets,
      logs,
      login,
      logout,
      checkIn,
      checkOut,
      addStaff,
      updateStaff,
      deleteStaff,
      updateProfile,
      isAdmin: currentUser?.role === 'manager',
      isAuthenticated: !!currentUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
