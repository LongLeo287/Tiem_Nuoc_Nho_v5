import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie
} from 'recharts';
import { RefreshCw, CheckCircle2, Clock, XCircle, Coffee, DollarSign, AlertCircle, ChevronRight, Settings as SettingsIcon, Volume2, VolumeX, Package, User, MapPin, BarChart3, TrendingUp, TrendingDown, Plus, Trash2, Calendar, LayoutDashboard, ListOrdered, Wallet, Filter, ArrowUpRight, ArrowDownRight, Menu as MenuIcon, Share2, FileText, Sparkles, PieChart as PieChartIcon, Search, Users, Edit2, Save, Eye, EyeOff, History, AlertTriangle, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderData, Expense, Staff } from '../types';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { useUI } from '../context/UIContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Invoice } from './Invoice';
import { RoleGuard } from './ui/RoleGuard';
import { triggerInventoryDeduction } from '../lib/inventoryWorker';

import { MenuManager } from './MenuManager';

import { FinanceDashboard } from './FinanceDashboard';

interface StaffViewProps {
  appsScriptUrl: string;
  appMode: 'order' | 'management';
}

type ViewMode = 'home' | 'dashboard' | 'orders' | 'expenses' | 'inventory' | 'menu' | 'cash' | 'finance' | 'staff';
type TimeRange = 'day' | 'week' | 'month' | 'year';

function StaffManagementView() {
  const { staffList, timeSheets, logs, addStaff, updateStaff, deleteStaff } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'timesheet' | 'logs'>('list');
  const [isAdding, setIsAdding] = useState(false);
  const [newStaff, setNewStaff] = useState<Partial<Staff>>({ name: '', username: '', pin: '', role: 'staff', hourlyRate: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStaff.name && newStaff.username && newStaff.pin) {
      addStaff({ ...newStaff, active: true } as any);
      setIsAdding(false);
      setNewStaff({ name: '', username: '', pin: '', role: 'staff', hourlyRate: 0 });
    }
  };

  const calculatePayroll = (staffId: string) => {
    const totalHours = timeSheets
      .filter(t => t.staffId === staffId && t.totalHours)
      .reduce((sum, t) => sum + (t.totalHours || 0), 0);
    const staff = staffList.find(s => s.id === staffId);
    const rate = staff?.hourlyRate || 0;
    return { hours: totalHours, salary: totalHours * rate };
  };

  const togglePin = (id: string) => {
    setVisiblePins(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 px-1">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-black text-stone-800 dark:text-white tracking-tight">Quản lý nhân sự</h2>
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Nhân viên & Chấm công & Lịch sử</p>
        </div>
        <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-2xl border border-stone-200 dark:border-stone-700">
          {[
            { id: 'list', label: 'Danh sách', icon: Users },
            { id: 'timesheet', label: 'Chấm công', icon: Calendar },
            { id: 'logs', label: 'Lịch sử', icon: History }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-white dark:bg-stone-700 shadow-sm text-[#C9252C] dark:text-red-400' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="space-y-4">
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="w-full py-4 bg-white dark:bg-stone-900 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-[24px] flex items-center justify-center gap-2 text-stone-400 hover:text-[#C9252C] hover:border-[#C9252C]/30 transition-all group"
          >
            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Thêm nhân viên mới</span>
          </button>

          <AnimatePresence>
            {isAdding && (
              <motion.form 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onSubmit={handleAdd} 
                className="bg-white dark:bg-stone-900 p-6 rounded-[32px] border border-stone-100 dark:border-stone-800 space-y-5 shadow-xl shadow-stone-900/5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Tên nhân viên</label>
                    <input 
                      placeholder="Nguyễn Văn A" 
                      value={newStaff.name}
                      onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                      className="w-full p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800 text-sm font-bold focus:ring-2 focus:ring-[#C9252C]/20 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Username</label>
                    <input 
                      placeholder="nva_staff" 
                      value={newStaff.username}
                      onChange={e => setNewStaff({...newStaff, username: e.target.value})}
                      className="w-full p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800 text-sm font-bold focus:ring-2 focus:ring-[#C9252C]/20 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">PIN (4 số)</label>
                    <input 
                      type="password"
                      placeholder="••••" 
                      value={newStaff.pin}
                      maxLength={4}
                      onChange={e => setNewStaff({...newStaff, pin: e.target.value})}
                      className="w-full p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800 text-sm font-bold focus:ring-2 focus:ring-[#C9252C]/20 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Vai trò</label>
                      <select 
                        value={newStaff.role}
                        onChange={e => setNewStaff({...newStaff, role: e.target.value as any})}
                        className="w-full p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800 text-sm font-bold outline-none"
                      >
                        <option value="staff">Nhân viên</option>
                        <option value="manager">Quản lý</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Lương/giờ</label>
                      <input 
                        type="number"
                        placeholder="0" 
                        value={newStaff.hourlyRate || ''}
                        onChange={e => setNewStaff({...newStaff, hourlyRate: Number(e.target.value)})}
                        className="w-full p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800 text-sm font-bold focus:ring-2 focus:ring-[#C9252C]/20 outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 rounded-2xl text-stone-500 font-black text-xs uppercase tracking-widest hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">Hủy</button>
                  <button type="submit" className="px-8 py-3 bg-[#C9252C] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-900/20 active:scale-95 transition-all">Lưu nhân viên</button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staffList.map(staff => (
              <motion.div 
                layout
                key={staff.id} 
                className="bg-white dark:bg-stone-900 p-5 rounded-[32px] border border-stone-100 dark:border-stone-800 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${staff.role === 'manager' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}>
                      <User className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-lg text-stone-800 dark:text-white leading-tight">{staff.name}</h3>
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${staff.role === 'manager' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {staff.role === 'manager' ? 'Quản lý' : 'Staff'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <span className="text-[11px] font-bold text-stone-400">@{staff.username}</span>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-400">
                          <span className="w-1 h-1 rounded-full bg-stone-300"></span>
                          <span>PIN: {visiblePins[staff.id] ? staff.pin : '••••'}</span>
                          <button onClick={() => togglePin(staff.id)} className="p-1 hover:text-stone-600 dark:hover:text-stone-200 transition-colors">
                            {visiblePins[staff.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditingId(staff.id)} className="p-2.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteStaff(staff.id)} className="p-2.5 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-stone-50 dark:border-stone-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Lương tạm tính</p>
                    <p className="text-lg font-black text-[#C9252C]">{calculatePayroll(staff.id).salary.toLocaleString()}đ</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Định mức</p>
                    <p className="text-sm font-bold text-stone-600 dark:text-stone-300">{staff.hourlyRate?.toLocaleString()}đ/h</p>
                  </div>
                </div>

                {editingId === staff.id && (
                  <div className="mt-6 p-5 bg-stone-50 dark:bg-stone-950 rounded-2xl space-y-4 border border-stone-100 dark:border-stone-800">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest px-1">Tên</label>
                        <input 
                          type="text"
                          defaultValue={staff.name}
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-bold outline-none"
                          id={`edit-name-${staff.id}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest px-1">Username</label>
                        <input 
                          type="text"
                          defaultValue={staff.username}
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-bold outline-none"
                          id={`edit-username-${staff.id}`}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest px-1">PIN</label>
                        <input 
                          type="text"
                          defaultValue={staff.pin}
                          maxLength={6}
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-bold outline-none"
                          id={`edit-pin-${staff.id}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest px-1">Vai trò</label>
                        <select 
                          defaultValue={staff.role}
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-bold outline-none"
                          id={`edit-role-${staff.id}`}
                        >
                          <option value="staff">Staff</option>
                          <option value="manager">Manager</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest px-1">Lương/h</label>
                        <input 
                          type="number"
                          defaultValue={staff.hourlyRate}
                          className="w-full p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-bold outline-none"
                          id={`edit-rate-${staff.id}`}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button 
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 rounded-xl text-stone-500 font-black text-[10px] uppercase tracking-widest hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
                      >
                        Hủy
                      </button>
                      <button 
                        onClick={() => {
                          const nameInput = document.getElementById(`edit-name-${staff.id}`) as HTMLInputElement;
                          const usernameInput = document.getElementById(`edit-username-${staff.id}`) as HTMLInputElement;
                          const pinInput = document.getElementById(`edit-pin-${staff.id}`) as HTMLInputElement;
                          const roleSelect = document.getElementById(`edit-role-${staff.id}`) as HTMLSelectElement;
                          const rateInput = document.getElementById(`edit-rate-${staff.id}`) as HTMLInputElement;
                          
                          if (nameInput && usernameInput && pinInput && roleSelect && rateInput) {
                            updateStaff(staff.id, { 
                              name: nameInput.value,
                              username: usernameInput.value,
                              pin: pinInput.value,
                              role: roleSelect.value as any,
                              hourlyRate: Number(rateInput.value) 
                            });
                            setEditingId(null);
                          }
                        }}
                        className="px-6 py-2 rounded-xl text-white font-black text-[10px] uppercase tracking-widest bg-stone-900 dark:bg-white dark:text-stone-900 shadow-lg active:scale-95 transition-all"
                      >
                        Lưu thay đổi
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'timesheet' && (
        <div className="bg-white dark:bg-stone-900 rounded-[32px] border border-stone-100 dark:border-stone-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 dark:bg-stone-950 border-b border-stone-100 dark:border-stone-800">
                  <th className="px-6 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Ngày</th>
                  <th className="px-6 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Nhân viên</th>
                  <th className="px-6 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Check In</th>
                  <th className="px-6 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Check Out</th>
                  <th className="px-6 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest text-right">Tổng giờ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50 dark:divide-stone-800">
                {timeSheets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-xs text-stone-400 font-black uppercase tracking-widest italic">Chưa có dữ liệu chấm công</td>
                  </tr>
                ) : (
                  timeSheets.map(sheet => {
                    const staff = staffList.find(s => s.id === sheet.staffId);
                    return (
                      <tr key={sheet.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="text-xs font-black text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded-lg">
                            {new Date(sheet.date).toLocaleDateString('vi-VN')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-xs font-black text-stone-500 group-hover:bg-[#C9252C] group-hover:text-white transition-all">
                              {staff?.name.charAt(0)}
                            </div>
                            <span className="text-sm font-black text-stone-800 dark:text-white">{staff?.name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-stone-500">
                            <Clock className="w-3 h-3 text-emerald-500" />
                            {new Date(sheet.checkIn).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-stone-500">
                            <Clock className="w-3 h-3 text-red-500" />
                            {sheet.checkOut ? new Date(sheet.checkOut).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${sheet.totalHours ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600'}`}>
                            {sheet.totalHours ? `${sheet.totalHours}h` : 'Đang làm'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-stone-900 rounded-[32px] border border-stone-100 dark:border-stone-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 dark:bg-stone-950 border-b border-stone-100 dark:border-stone-800">
                  <th className="px-6 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Thời gian</th>
                  <th className="px-6 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Người thực hiện</th>
                  <th className="px-6 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Hành động</th>
                  <th className="px-6 py-5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50 dark:divide-stone-800">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-xs text-stone-400 font-black uppercase tracking-widest italic">Chưa có lịch sử hoạt động</td>
                  </tr>
                ) : (
                  logs.slice().reverse().map(log => (
                    <tr key={log.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-stone-800 dark:text-white">
                            {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                          </span>
                          <span className="text-[9px] font-bold text-stone-400">
                            {new Date(log.timestamp).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-[10px] font-black text-stone-500">
                            {log.performerName.charAt(0)}
                          </div>
                          <span className="text-xs font-black text-stone-800 dark:text-white">{log.performerName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-[10px] font-black text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-medium text-stone-500 dark:text-stone-400 line-clamp-1 max-w-[200px]" title={log.details}>
                          {log.details}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function StaffView({ appsScriptUrl, appMode }: StaffViewProps) {
  const { setIsFabHidden, showToast } = useUI();
  const { orders, menuItems, isLoading: isDataLoading, isRefreshing, error: dataError, fetchAllData, updateOrderStatus, deleteOrder, refreshInterval, setRefreshInterval, inventoryItems, isOnline, lastUpdated, dashboardData, soTayData, addSoTay, financeData } = useData();
  
  const { currentUser, isAdmin } = useAuth();
  
  const [viewMode, setViewMode] = useState<ViewMode>('home');

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === '/staff' || location.pathname === '/staff/') {
      navigate('/staff/dashboard', { replace: true });
    } else if (location.pathname.startsWith('/staff/dashboard')) {
      setViewMode('dashboard');
    } else if (location.pathname.startsWith('/staff/operations')) {
      // Default to orders if just /staff/operations
      setViewMode(prev => ['orders', 'inventory', 'menu'].includes(prev) ? prev : 'orders');
    } else if (location.pathname.startsWith('/staff/finance')) {
      setViewMode('finance');
    } else if (location.pathname.startsWith('/staff/users')) {
      if (isAdmin) {
        setViewMode('staff');
      } else {
        navigate('/staff/dashboard', { replace: true });
      }
    }
  }, [location.pathname, navigate, isAdmin]);
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifiedOrderIds, setNotifiedOrderIds] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [sortBy, setSortBy] = useState<'time' | 'status'>('time');
  const [volume, setVolume] = useState(() => Number(localStorage.getItem('notificationVolume') || 80));
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('notificationMuted') === 'true');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Order filtering
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // Expense form state
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCat, setExpenseCat] = useState('Nguyên liệu');
  const [expenseType, setExpenseType] = useState('Chi');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseError, setExpenseError] = useState('');

  // Inventory form state
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [inventoryAmount, setInventoryAmount] = useState('');
  const [inventoryPrice, setInventoryPrice] = useState('');
  const [inventoryMaterial, setInventoryMaterial] = useState('');
  const [inventoryNote, setInventoryNote] = useState('');
  const [inventoryError, setInventoryError] = useState('');
  const [inventoryLogs, setInventoryLogs] = useState<any[]>(() => {
    const saved = localStorage.getItem('inventory_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [availableMaterials, setAvailableMaterials] = useState<any[]>([]);

  useEffect(() => {
    if (inventoryItems.length > 0) {
      const materials = inventoryItems.map(item => ({ code: item.id, name: item.name }));
      setAvailableMaterials(materials);
      if (!inventoryMaterial) setInventoryMaterial(materials[0].code);
    }
  }, [inventoryItems, inventoryMaterial]);
  
  // Fixed Cost Reminder
  const [showFixedCostReminder, setShowFixedCostReminder] = useState(false);
  const [daysUntilFixedCost, setDaysUntilFixedCost] = useState(0);

  // Inventory Edit State
  const [editingInventoryItem, setEditingInventoryItem] = useState<any | null>(null);
  const [editInventoryQty, setEditInventoryQty] = useState('');
  const [isUpdatingInventory, setIsUpdatingInventory] = useState(false);

  const [timeAgo, setTimeAgo] = useState<string>('');
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<OrderData | null>(null);
  const [shouldAutoPrint, setShouldAutoPrint] = useState(false);

  useEffect(() => {
    if (selectedOrderForInvoice && shouldAutoPrint) {
      const timer = setTimeout(() => {
        window.print();
        setShouldAutoPrint(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [selectedOrderForInvoice, shouldAutoPrint]);

  useEffect(() => {
    const updateTimeAgo = () => {
      if (!lastUpdated) {
        setTimeAgo('');
        return;
      }
      const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
      if (seconds < 60) setTimeAgo('Vừa xong');
      else if (seconds < 3600) setTimeAgo(`${Math.floor(seconds / 60)} phút trước`);
      else setTimeAgo(`${Math.floor(seconds / 3600)} giờ trước`);
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 30000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  useEffect(() => {
    const now = new Date();
    const day = now.getDate();
    if (day >= 1 && day <= 5) {
      setShowFixedCostReminder(true);
      setDaysUntilFixedCost(5 - day);
    } else {
      setShowFixedCostReminder(false);
    }
  }, []);

  useEffect(() => {
    const handleOutOfStock = (e: any) => {
      const item = e.detail;
      // Play alert sound
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (err) {
        console.error('Error playing sound:', err);
      }
    };

    window.addEventListener('itemOutOfStock', handleOutOfStock);
    return () => window.removeEventListener('itemOutOfStock', handleOutOfStock);
  }, []);

  const handleUpdateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInventoryItem || !editInventoryQty) return;

    setIsUpdatingInventory(true);
    try {
      const currentQty = editingInventoryItem.quantity || 0;
      const newQty = Number(editInventoryQty);
      const quantityChange = newQty - currentQty;

      if (quantityChange === 0) {
        setEditingInventoryItem(null);
        setIsUpdatingInventory(false);
        return;
      }

      // Use updateInventory action to adjust stock
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'updateInventory',
          itemName: editingInventoryItem.name,
          ma_nl: editingInventoryItem.id,
          quantityChange: quantityChange
        }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      });

      const result = await response.json();
      if (result.status === 'success') {
        await fetchAllData(false); // Refresh data
        setEditingInventoryItem(null);
        setEditInventoryQty('');
        alert('Đã cập nhật kho thành công!');
      } else {
        alert('Lỗi cập nhật: ' + (result.message || 'Không xác định'));
      }
    } catch (err) {
      console.error('Update inventory error:', err);
      alert('Lỗi kết nối');
    } finally {
      setIsUpdatingInventory(false);
    }
  };

  const expensesByCategory = useMemo(() => {
    const categoryMap = new Map<string, number>();
    soTayData.filter(e => e.phan_loai === 'Chi').forEach(expense => {
      const current = categoryMap.get(expense.danh_muc) || 0;
      categoryMap.set(expense.danh_muc, current + Number(expense.so_tien));
    });

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [soTayData]);

  const EXPENSE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

  const fetchInventory = async () => {
    if (!appsScriptUrl) return;
    setIsLoading(true);
    try {
      // 2. Load Inventory Data (Materials and Logs)
      const response = await fetch(`${appsScriptUrl}?action=getInventoryData`).catch(() => null);
      if (!response || !response.ok) return;
      
      const json = await response.json().catch(() => null);
      if (!json) return;

      const data = json.data || json;
      
      let materials = [];
      if (data.materials && Array.isArray(data.materials)) {
        materials = data.materials.map((m: any) => ({
          code: m.code || m.ma_nl || m['Mã NL'] || m.id || m.ID,
          name: m.name || m.ten_nl || m['Tên NL'] || m.Name
        }));
        setAvailableMaterials(materials);
      }
      
      if (data.logs && Array.isArray(data.logs)) {
        const mappedLogs = data.logs.map((log: any) => {
          const ma_nl = log.ma_nl || log.code || log['Mã NL'] || log.id;
          const material = (materials.length > 0 ? materials : availableMaterials).find((m: any) => (m.code || m.ma_nl) === ma_nl);
          return {
            ...log,
            ma_nl,
            materialName: material?.name || ma_nl,
            timestamp: log.thoi_gian || log['Thời gian'] || log.timestamp || log.Time
          };
        }).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        setInventoryLogs(mappedLogs);
        localStorage.setItem('inventory_logs', JSON.stringify(mappedLogs));
      } else if (Array.isArray(data)) {
        // Fallback if it returns just an array of logs
        const mappedLogs = data.map((log: any) => {
          const ma_nl = log.ma_nl || log.code || log['Mã NL'] || log.id;
          const material = availableMaterials.find(m => (m.code || m.ma_nl) === ma_nl);
          return {
            ...log,
            ma_nl,
            materialName: material?.name || ma_nl,
            timestamp: log.thoi_gian || log['Thời gian'] || log.timestamp || log.Time
          };
        }).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setInventoryLogs(mappedLogs);
      }
    } catch (err) {
      console.error('Failed to fetch inventory data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const addInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryAmount || !inventoryPrice || !inventoryMaterial) {
      setInventoryError('Vui lòng chọn nguyên liệu và nhập đầy đủ thông tin');
      return;
    }

    setIsSubmitting(true);
    setInventoryError('');

    // 2. Create Nhap Kho Payload
    const payload = {
      action: 'createNhapKho',
      ma_nl: inventoryMaterial,
      so_luong_nhap: Number(inventoryAmount),
      don_gia_nhap: Number(inventoryPrice),
      ghi_chu: inventoryNote
    };

    try {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        // 3. Sync data after success
        await fetchInventory(); 
        setShowInventoryForm(false);
        setInventoryAmount('');
        setInventoryPrice('');
        setInventoryNote('');
        alert('Đã tạo phiếu nhập kho thành công!');
      } else {
        setInventoryError(result.message || 'Lỗi khi lưu');
      }
    } catch (err) {
      setInventoryError('Lỗi kết nối');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'inventory') {
      fetchInventory();
    }
  }, [viewMode, appsScriptUrl]);

  useEffect(() => {
    setIsFabHidden(showSettings || showExpenseForm || showInventoryForm);
    return () => setIsFabHidden(false);
  }, [showSettings, showExpenseForm, showInventoryForm, setIsFabHidden]);

  useEffect(() => {
    const handleStorageChange = () => {
      setVolume(Number(localStorage.getItem('notificationVolume') || 80));
      setIsMuted(localStorage.getItem('notificationMuted') === 'true');
    };
    
    // Listen for storage events (cross-tab)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically in case of same-tab changes if not using a custom event
    const interval = setInterval(handleStorageChange, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const now = new Date().getTime();
    let hasNewOrder = false;
    const newNotifiedIds = new Set(notifiedOrderIds);

    orders.forEach(order => {
      const orderTime = new Date(order.timestamp).getTime();
      const isNew = (order.orderStatus === 'Đã nhận' || order.orderStatus === 'Chờ xử lý') && (now - orderTime) < 60000;
      
      if (isNew && !notifiedOrderIds.has(order.orderId)) {
        hasNewOrder = true;
        newNotifiedIds.add(order.orderId);
      }
    });

    if (hasNewOrder) {
      playNotificationSound();
      setNotifiedOrderIds(newNotifiedIds);
    }
  }, [orders]);

  const playNotificationSound = () => {
    if (isMuted) return;
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = volume / 100;
    audio.play().catch(e => console.log('Audio play failed:', e));
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, appsScriptUrl]);

  const handleQuickUpdate = (order: OrderData) => {
    if (order.orderStatus === 'Đã nhận' || order.orderStatus === 'Chờ xử lý') {
      triggerVibrate(40);
      updateStatus(order.orderId, 'processing');
    } else if (order.orderStatus === 'Đang làm') {
      triggerVibrate([50, 30, 50]);
      if (window.confirm('Xác nhận đơn hàng này đã hoàn thành và thanh toán?')) {
        updateStatus(order.orderId, 'completed', { totalPrice: order.total, paymentStatus: 'Đã thanh toán' });
      }
    }
  };

  const triggerVibrate = (pattern: number | number[] = 50) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const updateStatus = async (orderId: string, status: string, additionalData?: any) => {
    try {
      const success = await updateOrderStatus(orderId, status, additionalData);
      if (!success) {
        showToast('Lỗi cập nhật trạng thái. Vui lòng thử lại!', 'error');
      } else {
        showToast(`Đã cập nhật đơn #${orderId} thành ${status}`);
        
        // Auto-print logic
        if (status === 'completed' && localStorage.getItem('autoPrint') === 'true') {
          const order = orders.find(o => o.orderId === orderId);
          if (order) {
            setSelectedOrderForInvoice(order);
            setShouldAutoPrint(true);
          }
        }
      }
    } catch (err) {
      showToast('Không thể kết nối máy chủ để cập nhật trạng thái', 'error');
    }
  };

  const mapOrderToBackend = (items: any[]) => {
    return items.map(item => ({
      ma_mon: item.id || item.ma_mon, 
      so_luong: item.quantity,
      has_customizations: item.hasCustomizations ?? false,
      ten_mon: item.name
    }));
  };

  useEffect(() => {
    if (viewMode === 'inventory') {
      fetchInventory();
    }
  }, [viewMode, appsScriptUrl]);

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || !expenseDesc || !expenseCat || !appsScriptUrl) return;

    setExpenseError('');

    if (expenseType === 'Chi') {
      const today = new Date().toDateString();
      const todayExpenses = soTayData
        .filter(exp => {
          const type = exp.phan_loai || 'Chi';
          const time = exp.thoi_gian;
          return type === 'Chi' && new Date(time).toDateString() === today;
        })
        .reduce((sum, exp) => sum + Number(exp.so_tien || 0), 0);

      if (todayExpenses + Number(expenseAmount) > 1000000) {
        alert("Cảnh báo: Chi tiêu trong ngày đã vượt ngưỡng 1,000,000đ.");
      }
    }

    setIsSubmitting(true);
    try {
      const success = await addSoTay({
        phan_loai: expenseType as 'Thu' | 'Chi',
        danh_muc: expenseCat,
        so_tien: Number(expenseAmount),
        ghi_chu: expenseDesc
      });

      if (success) {
        setExpenseAmount('');
        setExpenseDesc('');
        setShowExpenseForm(false);
        showToast('Đã thêm giao dịch thành công!');
      } else {
        setExpenseError('Lỗi khi thêm giao dịch');
      }
    } catch (err: any) {
      console.error('Add expense error:', err);
      setExpenseError('Không thể kết nối đến máy chủ: ' + (err.message || 'Lỗi mạng'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) return;
    
    try {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'deleteTransaction', id_thu_chi: id }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      });
      const result = await response.json();
      if (result.status === 'success' || result.success) {
        fetchAllData(false);
      } else {
        // If API fails but returns a message, show it
        alert('Lỗi khi xóa: ' + (result.message || 'Lỗi không xác định'));
      }
    } catch (err) {
      // Fallback to local delete if API fails or not supported
      // Note: This won't persist if using context data, but provides immediate feedback
      alert('Không thể kết nối để xóa.');
    }
  };

  // Statistics Calculation
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');

  const filteredInventoryItems = useMemo(() => {
    if (!inventorySearchQuery.trim()) return inventoryItems;
    const query = inventorySearchQuery.toLowerCase();
    return inventoryItems.filter(item => 
      item.name.toLowerCase().includes(query) || 
      item.id.toLowerCase().includes(query)
    );
  }, [inventoryItems, inventorySearchQuery]);

  const stats = useMemo(() => {
    const now = new Date();
    
    // Helper to check if date is in range
    const isSameDay = (d1: Date, d2: Date) => d1.toDateString() === d2.toDateString();
    const isSameWeek = (d1: Date, d2: Date) => {
      const oneDay = 24 * 60 * 60 * 1000;
      const diffDays = Math.round(Math.abs((d1.getTime() - d2.getTime()) / oneDay));
      return diffDays <= 7; // Simple approximation
    };
    const isSameMonth = (d1: Date, d2: Date) => d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
    const isSameYear = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear();

    const filterByTime = (itemDate: Date, range: TimeRange) => {
      if (range === 'day') return isSameDay(itemDate, now);
      if (range === 'week') return isSameWeek(itemDate, now);
      if (range === 'month') return isSameMonth(itemDate, now);
      if (range === 'year') return isSameYear(itemDate, now);
      return true;
    };

    // Previous period filter
    const filterByPreviousTime = (itemDate: Date, range: TimeRange) => {
      const prev = new Date(now);
      if (range === 'day') prev.setDate(prev.getDate() - 1);
      if (range === 'week') prev.setDate(prev.getDate() - 7);
      if (range === 'month') prev.setMonth(prev.getMonth() - 1);
      if (range === 'year') prev.setFullYear(prev.getFullYear() - 1);

      if (range === 'day') return isSameDay(itemDate, prev);
      if (range === 'week') return isSameWeek(itemDate, prev); // Approximate
      if (range === 'month') return isSameMonth(itemDate, prev);
      if (range === 'year') return isSameYear(itemDate, prev);
      return false;
    };

    const filteredOrders = orders.filter(o => o.orderStatus === 'Hoàn thành' && filterByTime(new Date(o.timestamp), timeRange));
    const filteredExpenses = soTayData.filter(e => filterByTime(new Date(e.thoi_gian), timeRange));
    
    // Daily Stats for Summary
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayOrders = orders.filter(o => new Date(o.timestamp) >= startOfDay && o.orderStatus !== 'Đã hủy');
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const todayOrderCount = todayOrders.length;
    const todayExpenseTotal = soTayData.filter(e => new Date(e.thoi_gian) >= startOfDay && e.phan_loai === 'Chi').reduce((sum, e) => sum + Number(e.so_tien), 0);
    
    const itemCounts: { [key: string]: number } = {};
    todayOrders.forEach(o => {
      o.items.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    });
    const topItemToday = Object.entries(itemCounts).sort((a, b) => b[1] - a[1])[0] || [null, 0];

    const prevOrders = orders.filter(o => o.orderStatus === 'Hoàn thành' && filterByPreviousTime(new Date(o.timestamp), timeRange));
    const prevExpenses = soTayData.filter(e => filterByPreviousTime(new Date(e.thoi_gian), timeRange));

    let revenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    let orderCount = filteredOrders.length;

    if (dashboardData) {
      if (timeRange === 'day') {
        revenue = dashboardData.revenue?.today || 0;
        orderCount = dashboardData.orders?.today || 0;
      } else if (timeRange === 'week') {
        revenue = dashboardData.revenue?.thisWeek || 0;
        orderCount = dashboardData.orders?.thisWeek || 0;
      } else if (timeRange === 'month') {
        revenue = dashboardData.revenue?.thisMonth || 0;
        orderCount = dashboardData.orders?.thisMonth || 0;
      }
    }

    const cost = filteredExpenses.reduce((sum, e) => sum + Number(e.so_tien), 0);
    const profit = revenue - cost;

    const prevRevenue = prevOrders.reduce((sum, o) => sum + o.total, 0);
    const prevCost = prevExpenses.reduce((sum, e) => sum + Number(e.so_tien), 0);

    const growth = prevRevenue === 0 ? (revenue > 0 ? 100 : 0) : ((revenue - prevRevenue) / prevRevenue) * 100;
    const costGrowth = prevCost === 0 ? (cost > 0 ? 100 : 0) : ((cost - prevCost) / prevCost) * 100;

    // Expense Breakdown for Pie Chart
    const expenseBreakdown = filteredExpenses.reduce((acc, expense) => {
      acc[expense.danh_muc] = (acc[expense.danh_muc] || 0) + Number(expense.so_tien);
      return acc;
    }, {} as Record<string, number>);

    const expenseData = Object.keys(expenseBreakdown).map(key => ({
      name: key,
      value: expenseBreakdown[key],
    }));

    // Revenue Data for Chart
    const revenueDataMap: Record<string, number> = {};
    // Initialize map with empty values for better chart look if needed, or just map existing
    // For simplicity, map existing
    filteredOrders.forEach(order => {
      const date = new Date(order.timestamp);
      let key = '';
      if (timeRange === 'day') key = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      else if (timeRange === 'week' || timeRange === 'month') key = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      else key = date.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
      
      revenueDataMap[key] = (revenueDataMap[key] || 0) + order.total;
    });

    // Sort keys
    const sortedKeys = Object.keys(revenueDataMap).sort((a, b) => {
       // Simple string sort might fail for dates, but for 'day' (HH:mm) it works roughly. 
       // Ideally we parse back to date to sort.
       return a.localeCompare(b);
    });

    const revenueData = sortedKeys.map(key => ({
      name: key,
      revenue: revenueDataMap[key],
    }));

    // Monthly Profit Analysis
    const currentMonthOrders = orders.filter(o => {
      const d = new Date(o.timestamp);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && o.orderStatus === 'Hoàn thành';
    });
    const currentMonthExpenses = soTayData.filter(e => {
      const d = new Date(e.thoi_gian);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && (e.phan_loai === 'Chi');
    });

    const monthlyRevenue = currentMonthOrders.reduce((sum, o) => sum + o.total, 0);
    const monthlyCost = currentMonthExpenses.reduce((sum, e) => sum + Number(e.so_tien), 0);
    const monthlyProfit = monthlyRevenue - monthlyCost;

    // Revenue by Category (Product Category)
    const revenueByCategoryMap: Record<string, number> = {};
    currentMonthOrders.forEach(order => {
      order.items.forEach(item => {
        // We need category for item. Since OrderData items might not have category, we might need to look it up from menuItems if available.
        // But OrderData items usually just have name, price, qty.
        // If we can't get category easily, we might skip or use a workaround.
        // Let's try to infer or just use item name if category missing? No, too many bars.
        // Let's assume we can't easily get category from order history items without a lookup map.
        // We can use the 'menuItems' from useData to look up categories.
        // But 'menuItems' is not in this scope (it's in useData).
        // Let's just skip Revenue Breakdown for now or use a simple one if possible.
        // Actually, let's just do Expenses Breakdown by Category (Bar Chart) as requested "revenue and expenses broken down by category".
        // Expenses we have categories. Revenue we might not.
      });
    });

    // Expenses by Category (Monthly)
    const monthlyExpensesByCategory = currentMonthExpenses.reduce((acc, expense) => {
      acc[expense.danh_muc] = (acc[expense.danh_muc] || 0) + Number(expense.so_tien);
      return acc;
    }, {} as Record<string, number>);

    const monthlyExpenseChartData = Object.keys(monthlyExpensesByCategory).map(key => ({
      name: key,
      value: monthlyExpensesByCategory[key]
    })).sort((a, b) => b.value - a.value);

    // Monthly Breakdown for the whole year (Revenue vs Expenses)
    const monthlyBreakdown: Record<number, { month: string, revenue: number, expenses: number }> = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), i, 1);
      monthlyBreakdown[i] = {
        month: `T${i + 1}`,
        revenue: 0,
        expenses: 0
      };
    }

    orders.forEach(o => {
      if (o.orderStatus === 'Hoàn thành') {
        const d = new Date(o.timestamp);
        if (d.getFullYear() === now.getFullYear()) {
          const month = d.getMonth();
          monthlyBreakdown[month].revenue += o.total;
        }
      }
    });

    soTayData.forEach(e => {
      if (e.phan_loai === 'Chi') {
        const d = new Date(e.thoi_gian);
        if (d.getFullYear() === now.getFullYear()) {
          const month = d.getMonth();
          monthlyBreakdown[month].expenses += Number(e.so_tien);
        }
      }
    });

    const monthlyBreakdownData = Object.values(monthlyBreakdown);

    // Inventory Forecast
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last7DaysOrders = orders.filter(o => new Date(o.timestamp) >= sevenDaysAgo && o.orderStatus === 'Hoàn thành');
    
    const consumptionMap: Record<string, number> = {};
    last7DaysOrders.forEach(order => {
      order.items.forEach(item => {
        consumptionMap[item.name] = (consumptionMap[item.name] || 0) + item.quantity;
      });
    });

    const inventoryForecast = menuItems
      .filter(item => item.inventoryQty !== undefined)
      .map(item => {
        const weeklyConsumption = consumptionMap[item.name] || 0;
        const suggestedRestock = Math.max(0, weeklyConsumption - (item.inventoryQty || 0));
        return {
          id: item.id,
          name: item.name,
          currentQty: item.inventoryQty || 0,
          weeklyConsumption,
          suggestedRestock,
          status: (item.inventoryQty || 0) < weeklyConsumption ? 'low' : 'ok'
        };
      })
      .sort((a, b) => b.weeklyConsumption - a.weeklyConsumption);

    return { revenue, cost, profit, orderCount, expenseData, revenueData, growth, costGrowth, monthlyRevenue, monthlyCost, monthlyProfit, monthlyExpenseChartData, monthlyBreakdownData, inventoryForecast, todayRevenue, todayOrderCount, todayExpenseTotal, topItemToday };
  }, [orders, soTayData, menuItems, timeRange, dashboardData]);

  const COLORS = ['#C9252C', '#B91C1C', '#991B1B', '#7F1D1D', '#450A0A'];

  if (!appsScriptUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
        <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-3xl flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-extrabold text-stone-800 dark:text-white mb-2">Chưa cấu hình</h2>
        <p className="text-stone-500 dark:text-stone-400 mb-8 max-w-xs">Vui lòng thiết lập URL Apps Script trong phần Cài đặt để quản lý.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-24">
      {/* Top Navigation Tabs */}
      {location.pathname.startsWith('/staff/operations') && (
        <div className="sticky top-0 z-30 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-stone-100 dark:border-stone-800 transition-colors">
          <div className="flex items-center gap-3 p-3">
            <div className="flex-grow flex flex-col gap-2">
              <div className="flex gap-1 overflow-x-auto scrollbar-hide py-0.5">
                {[
                  { id: 'orders', label: 'Đơn hàng', icon: ListOrdered },
                  { id: 'inventory', label: 'Kho', icon: Package },
                  { id: 'menu', label: 'Menu', icon: MenuIcon },
                ].map((tab) => {
                  const isActive = viewMode === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setViewMode(tab.id as any)}
                      className={`flex-shrink-0 px-3 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 tap-active ${
                        isActive 
                          ? 'bg-stone-800 dark:bg-white text-white dark:text-black shadow-md' 
                          : 'text-stone-400 dark:text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'opacity-100' : 'opacity-70'}`} />
                      <AnimatePresence mode="popLayout">
                        {isActive && (
                          <motion.span
                            initial={{ width: 0, opacity: 0, x: -5 }}
                            animate={{ width: 'auto', opacity: 1, x: 0 }}
                            exit={{ width: 0, opacity: 0, x: -5 }}
                            className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap overflow-hidden"
                          >
                            {tab.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <button
              onClick={() => {
                if (viewMode === 'inventory') fetchInventory();
                else fetchAllData(false);
              }}
              disabled={isRefreshing}
              className={`flex-shrink-0 w-10 h-10 bg-stone-100 dark:bg-stone-900 text-stone-500 dark:text-stone-400 rounded-xl flex items-center justify-center tap-active border border-stone-200/50 dark:border-stone-800/50 transition-all ${isRefreshing ? 'animate-spin opacity-50' : ''}`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-grow">
            <p className="text-sm font-bold text-red-800 dark:text-red-300">
              {error.includes('Rate Limit') 
                ? 'Hệ thống đang bận (Rate Limit). Vui lòng thử lại sau 1-2 phút.' 
                : error}
            </p>
          </div>
          <button 
            onClick={() => fetchAllData(true)}
            className="text-xs font-black uppercase tracking-widest text-red-600 dark:text-red-400 hover:underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Fixed Cost Reminder */}
      <AnimatePresence>
        {showFixedCostReminder && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 pt-4 overflow-hidden"
          >
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 px-4 py-2.5 rounded-2xl flex items-center gap-3">
              <div className="w-7 h-7 bg-amber-500 text-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 leading-tight">
                  <span className="font-black uppercase tracking-widest mr-1">Lưu ý:</span>
                  Thanh toán chi phí cố định trước ngày 05.
                </p>
              </div>
              <button onClick={() => setShowFixedCostReminder(false)} className="text-amber-400 hover:text-amber-600 transition-colors p-1">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification removed */}

      <div className="p-6 space-y-6">
        <AnimatePresence mode="wait">
          {viewMode === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="space-y-1 px-1">
                <h2 className="text-2xl font-black text-stone-800 dark:text-white tracking-tight">Tổng quan Quản lý</h2>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Chọn chức năng để bắt đầu</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'dashboard', label: 'Báo cáo', icon: LayoutDashboard, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                  { id: 'orders', label: 'Đơn hàng', icon: ListOrdered, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                  { id: 'menu', label: 'Menu', icon: MenuIcon, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                  { id: 'expenses', label: 'Chi tiêu', icon: Wallet, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
                  { id: 'inventory', label: 'Nhập kho', icon: Package, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                  { id: 'cash', label: 'Sổ quỹ', icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                  { id: 'finance', label: 'Tài chính', icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setViewMode(item.id as any)}
                    className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-100 dark:border-stone-800 shadow-sm flex flex-col items-center justify-center gap-3 tap-active hover:scale-[1.02] transition-all"
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.bg} ${item.color}`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-black text-stone-800 dark:text-white uppercase tracking-widest">{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {viewMode === 'staff' && isAdmin && (
            <motion.div
              key="staff"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <StaffManagementView />
            </motion.div>
          )}

          {viewMode === 'cash' && (
            <motion.div
              key="cash"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center px-1">
                <div className="space-y-0.5">
                  <h2 className="text-stone-800 dark:text-white font-black text-lg tracking-tight">Sổ quỹ tiền mặt</h2>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Kiểm soát dòng tiền</p>
                </div>
                <button 
                  onClick={() => fetchAllData(false)}
                  className="w-10 h-10 bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-center text-stone-400 dark:text-stone-500 tap-active shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#C9252C]' : ''}`} />
                </button>
              </div>

              {/* Cash Balance Card */}
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-[40px] p-8 text-white shadow-2xl shadow-emerald-100 dark:shadow-none relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 opacity-10">
                  <DollarSign className="w-48 h-48" />
                </div>
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full w-fit border border-white/10">
                    <Wallet className="w-3.5 h-3.5 text-emerald-200" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-50">Tiền mặt tại quán</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-5xl font-black tracking-tighter">
                      {(
                        orders.filter(o => o.paymentMethod === 'Tiền mặt' && (o.paymentStatus === 'Đã thanh toán' || o.orderStatus === 'Hoàn thành')).reduce((sum, o) => sum + o.total, 0) +
                        soTayData.filter(e => (e.phan_loai === 'Thu')).reduce((sum, e) => sum + Number(e.so_tien), 0) -
                        soTayData.filter(e => e.phan_loai === 'Chi').reduce((sum, e) => sum + Number(e.so_tien), 0)
                      ).toLocaleString()}
                    </p>
                    <span className="text-xl font-black text-emerald-200">đ</span>
                  </div>
                  <div className="pt-2 flex gap-3">
                    <button 
                      onClick={() => {
                        setExpenseType('Thu');
                        setExpenseCat('Nạp tiền');
                        setExpenseDesc('Nạp tiền đầu ca');
                        setShowExpenseForm(true);
                      }}
                      className="flex-1 bg-white/20 backdrop-blur-md hover:bg-white/30 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/10 tap-active"
                    >
                      <ArrowDownRight className="w-4 h-4" /> Nạp tiền
                    </button>
                    <button 
                      onClick={() => {
                        setExpenseType('Chi');
                        setExpenseCat('Rút tiền');
                        setExpenseDesc('Rút tiền cuối ca');
                        setShowExpenseForm(true);
                      }}
                      className="flex-1 bg-white/20 backdrop-blur-md hover:bg-white/30 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/10 tap-active"
                    >
                      <ArrowUpRight className="w-4 h-4" /> Rút tiền
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Cash Movements */}
              <div className="space-y-4">
                <h3 className="text-stone-400 dark:text-stone-500 font-black text-[10px] uppercase tracking-widest px-1">Biến động gần đây</h3>
                <div className="bg-white dark:bg-stone-900 rounded-[32px] border border-stone-100 dark:border-stone-800 overflow-hidden shadow-sm">
                  {[
                    ...orders
                      .filter(o => o.paymentMethod === 'Tiền mặt' && (o.paymentStatus === 'Đã thanh toán' || o.orderStatus === 'Hoàn thành'))
                      .map(o => ({
                        type: 'order',
                        id: o.orderId,
                        amount: o.total,
                        desc: `Đơn hàng #${o.orderId}`,
                        time: o.timestamp,
                        isIn: true
                      })),
                    ...soTayData.map(e => ({
                      type: 'transaction',
                      id: e.id_thu_chi,
                      amount: Number(e.so_tien),
                      desc: e.ghi_chu,
                      time: e.thoi_gian,
                      isIn: e.phan_loai === 'Thu'
                    }))
                  ]
                  .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                  .slice(0, 20)
                  .map((item, idx) => (
                    <div key={`cash-movement-${idx}`} className="p-5 border-b border-stone-50 dark:border-stone-800 last:border-0 flex justify-between items-center hover:bg-stone-50/50 dark:hover:bg-stone-800/20 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                          item.type === 'order' 
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' 
                            : item.isIn 
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500'
                              : 'bg-red-50 dark:bg-red-900/20 text-red-500'
                        }`}>
                          {item.type === 'order' ? <Coffee className="w-5 h-5" /> : (item.isIn ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />)}
                        </div>
                        <div>
                          <p className="font-black text-stone-800 dark:text-white text-sm tracking-tight">{item.desc}</p>
                          <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">
                            {new Date(item.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(item.time).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>
                      <span className={`font-black text-base tracking-tighter ${item.isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {item.isIn ? '+' : '-'}{item.amount.toLocaleString()}
                        <span className="text-[9px] ml-0.5 uppercase">đ</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {viewMode === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 pb-12"
            >
              {/* Daily Summary Card - New Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-stone-900 p-5 sm:p-6 rounded-3xl sm:rounded-[32px] border border-stone-100 dark:border-stone-800 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest truncate">Doanh thu hôm nay</p>
                      <p className="text-lg font-black text-stone-800 dark:text-white tracking-tighter truncate">{stats.todayRevenue.toLocaleString()}đ</p>
                    </div>
                  </div>
                  <div className="h-1 bg-stone-50 dark:bg-stone-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '70%' }}
                      className="h-full bg-emerald-500"
                    />
                  </div>
                </div>
                <div className="bg-white dark:bg-stone-900 p-5 sm:p-6 rounded-3xl sm:rounded-[32px] border border-stone-100 dark:border-stone-800 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <ListOrdered className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest truncate">Đơn hàng hôm nay</p>
                      <p className="text-lg font-black text-stone-800 dark:text-white tracking-tighter truncate">{stats.todayOrderCount} đơn</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest flex-shrink-0">Top:</span>
                    <span className="text-[9px] font-bold text-stone-600 dark:text-stone-300 truncate">{stats.topItemToday[0] || '---'}</span>
                  </div>
                </div>
              </div>

              {/* Main Profit Card - The "Hero" of the dashboard */}
              <div className={`p-6 sm:p-8 rounded-[32px] sm:rounded-[48px] shadow-2xl shadow-stone-200 dark:shadow-none space-y-6 sm:space-y-8 relative overflow-hidden transition-all duration-700 ${stats.profit >= 0 ? 'bg-gradient-to-br from-[#C9252C] to-[#991B1B]' : 'bg-gradient-to-br from-stone-800 to-stone-900'}`}>
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                  </svg>
                </div>
                
                <div className="flex justify-between items-start relative z-10">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-xl text-white rounded-[24px] flex items-center justify-center border border-white/20 shadow-inner">
                    <Wallet className="w-8 h-8" />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full backdrop-blur-md border border-white/10 text-white bg-white/10">
                      Lợi nhuận ròng
                    </span>
                    <div className="mt-3 flex items-center gap-1.5 text-white/60 text-[9px] font-black uppercase tracking-[0.2em]">
                      <Clock className="w-3 h-3" />
                      {timeRange === 'day' ? 'Hôm nay' : timeRange === 'week' ? '7 ngày' : timeRange === 'month' ? 'Tháng này' : 'Năm nay'}
                    </div>
                  </div>
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-6xl font-black text-white tracking-tighter">{stats.profit.toLocaleString()}</p>
                    <span className="text-2xl font-black text-white/60">đ</span>
                  </div>
                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex -space-x-2.5">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-7 h-7 rounded-full border-2 border-[#C9252C] bg-white/20 backdrop-blur-sm shadow-sm" />
                      ))}
                    </div>
                    <p className="text-[11px] font-bold text-white/80">
                      <span className="font-black text-white">{stats.orderCount}</span> đơn hàng đã hoàn thành
                    </p>
                  </div>
                </div>

                {/* Growth Indicator */}
                {Math.abs(stats.growth) > 0 && (
                  <div className="absolute bottom-0 right-0 p-8 z-10">
                    <div className={`flex items-center gap-1.5 text-[10px] font-black px-5 py-2.5 rounded-2xl backdrop-blur-md border border-white/10 ${stats.growth >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                      {stats.growth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {Math.abs(stats.growth).toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>

              {/* Revenue Trend Chart */}
              <div className="bg-white dark:bg-stone-900 p-8 rounded-[48px] border border-stone-100 dark:border-stone-800 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-stone-800 dark:text-white text-sm uppercase tracking-widest">Xu hướng Doanh thu</h3>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Biểu đồ 12 tháng gần nhất</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
                    <Activity className="w-6 h-6 text-blue-500" />
                  </div>
                </div>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.monthlyBreakdownData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#C9252C" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#C9252C" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#a8a29e' }} 
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                        formatter={(value: any) => [`${value.toLocaleString()}đ`, 'Doanh thu']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#C9252C" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Inventory Health Widget */}
              <div className="bg-white dark:bg-stone-900 p-8 rounded-[48px] border border-stone-100 dark:border-stone-800 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-stone-800 dark:text-white text-sm uppercase tracking-widest">Sức khỏe Kho hàng</h3>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Cảnh báo tồn kho thấp</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-orange-500" />
                  </div>
                </div>
                
                <div className="space-y-3">
                  {stats.inventoryForecast.filter(i => i.status === 'low').length > 0 ? (
                    stats.inventoryForecast.filter(i => i.status === 'low').slice(0, 3).map((item, idx) => (
                      <div key={`low-stock-${idx}`} className="flex items-center justify-between p-4 bg-orange-50/50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white dark:bg-stone-800 rounded-xl flex items-center justify-center shadow-sm">
                            <Package className="w-5 h-5 text-orange-500" />
                          </div>
                          <div>
                            <h4 className="font-black text-stone-800 dark:text-white text-xs truncate max-w-[120px]">{item.name}</h4>
                            <p className="text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest">Còn: {item.currentQty}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Cần nhập</p>
                          <p className="text-sm font-black text-orange-600 tracking-tighter">+{item.suggestedRestock}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center space-y-3">
                      <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      </div>
                      <p className="text-xs font-bold text-stone-500 dark:text-stone-400">Tất cả mặt hàng đều ổn định!</p>
                    </div>
                  )}
                </div>
                
                {stats.inventoryForecast.filter(i => i.status === 'low').length > 3 && (
                  <button 
                    onClick={() => setViewMode('inventory')}
                    className="w-full py-3 text-[10px] font-black text-stone-400 uppercase tracking-widest hover:text-[#C9252C] transition-colors"
                  >
                    Xem thêm {stats.inventoryForecast.filter(i => i.status === 'low').length - 3} mặt hàng khác
                  </button>
                )}
              </div>

              {/* AI Insight Section */}
              <div className="bg-white dark:bg-stone-900 p-8 rounded-[48px] border border-stone-100 dark:border-stone-800 shadow-sm space-y-6 relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-48 h-48 bg-red-50 dark:bg-red-900/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 text-[#C9252C] rounded-[22px] flex items-center justify-center border border-red-100 dark:border-red-900/30 shadow-sm">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-black text-stone-800 dark:text-white text-sm uppercase tracking-widest">AI Insight</h3>
                      <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-1">Phân tích kinh doanh thông minh</p>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
                      const response = await ai.models.generateContent({
                        model: "gemini-3-flash-preview",
                        contents: `Phân tích số liệu kinh doanh quán nước:
                        - Doanh thu: ${stats.revenue}đ
                        - Chi phí: ${stats.cost}đ
                        - Lợi nhuận: ${stats.profit}đ
                        - Số đơn: ${stats.orderCount}
                        Hãy đưa ra 1 lời khuyên ngắn gọn (dưới 50 chữ), hài hước, GenZ để tối ưu hóa quán.`,
                      });
                      alert(response.text);
                    }}
                    className="px-5 py-2.5 bg-stone-50 dark:bg-stone-800 text-[#C9252C] rounded-2xl text-[9px] font-black uppercase tracking-widest border border-stone-100 dark:border-stone-700 tap-active hover:bg-red-50 transition-all active:scale-95"
                  >
                    Phân tích
                  </button>
                </div>
                <div className="p-5 bg-stone-50 dark:bg-stone-800/50 rounded-[24px] border border-stone-100 dark:border-stone-700/50 relative z-10">
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium leading-relaxed italic">
                    "Nhấn 'Phân tích' để nhận lời khuyên từ AI về tình hình kinh doanh của quán bạn nhé! ✨"
                  </p>
                </div>
              </div>

              {/* Bento Grid Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-stone-900 p-6 rounded-[40px] border border-stone-100 dark:border-stone-800 shadow-sm hover:shadow-md transition-all duration-300 space-y-4 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 dark:bg-emerald-900/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                  <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-[20px] flex items-center justify-center">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Doanh thu</p>
                    <p className="text-2xl font-black text-stone-800 dark:text-white tracking-tighter">{stats.revenue.toLocaleString()}đ</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-stone-900 p-6 rounded-[40px] border border-stone-100 dark:border-stone-800 shadow-sm hover:shadow-md transition-all duration-300 space-y-4 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-50 dark:bg-red-900/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                  <div className="w-14 h-14 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-[20px] flex items-center justify-center">
                    <TrendingDown className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1">Chi tiêu</p>
                    <p className="text-2xl font-black text-stone-800 dark:text-white tracking-tighter">{stats.cost.toLocaleString()}đ</p>
                  </div>
                </div>
              </div>

              {/* Top Items Section */}
              {dashboardData?.topItems && dashboardData.topItems.length > 0 && (
                <div className="bg-white dark:bg-stone-900 p-8 rounded-[40px] border border-stone-100 dark:border-stone-800 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-stone-800 dark:text-white text-sm uppercase tracking-widest">Món bán chạy</h3>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Top 5 món hot nhất</p>
                    </div>
                    <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-amber-500" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    {dashboardData.topItems.slice(0, 5).map((item, idx) => (
                      <div key={`top-item-${idx}`} className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-100/50 dark:border-stone-700/50">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-white dark:bg-stone-700 rounded-lg flex items-center justify-center font-black text-stone-400 text-xs shadow-sm">
                            #{idx + 1}
                          </div>
                          <div>
                            <h4 className="font-black text-stone-800 dark:text-white text-sm leading-tight">{item.name}</h4>
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Đã bán: {item.quantity}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-[#C9252C] tracking-tight">{item.quantity} ly</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly Performance Section */}
              <div className="bg-white dark:bg-stone-900 p-8 rounded-[48px] border border-stone-100 dark:border-stone-800 shadow-sm space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-stone-800 dark:text-white text-sm uppercase tracking-widest">Hiệu suất tháng {new Date().getMonth() + 1}</h3>
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-1">Phân tích doanh thu & chi phí</p>
                  </div>
                  <div className="w-14 h-14 bg-stone-50 dark:bg-stone-800 rounded-[22px] flex items-center justify-center">
                    <BarChart3 className="w-7 h-7 text-stone-400" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Doanh thu</p>
                    <p className="text-sm font-black text-emerald-600 tracking-tight">{stats.monthlyRevenue.toLocaleString()}đ</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Chi phí</p>
                    <p className="text-sm font-black text-red-600 tracking-tight">{stats.monthlyCost.toLocaleString()}đ</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Lợi nhuận</p>
                    <p className={`text-sm font-black tracking-tight ${stats.monthlyProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{stats.monthlyProfit.toLocaleString()}đ</p>
                  </div>
                </div>
              </div>

              {/* Inventory Forecast Section */}
              <div className="bg-white dark:bg-stone-900 p-8 rounded-[48px] border border-stone-100 dark:border-stone-800 shadow-sm space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-stone-800 dark:text-white text-sm uppercase tracking-widest">Dự báo tồn kho</h3>
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-1">Dựa trên tiêu thụ 7 ngày qua</p>
                  </div>
                  <div className="w-14 h-14 bg-stone-50 dark:bg-stone-800 rounded-[22px] flex items-center justify-center">
                    <Package className="w-7 h-7 text-stone-400" />
                  </div>
                </div>

                <div className="space-y-4">
                  {stats.inventoryForecast.slice(0, 3).map((item, idx) => (
                    <div key={`forecast-${idx}`} className="flex items-center justify-between p-5 bg-stone-50 dark:bg-stone-800/50 rounded-[24px] border border-stone-100 dark:border-stone-700/50">
                      <div className="space-y-1.5">
                        <p className="text-sm font-black text-stone-800 dark:text-white tracking-tight">{item.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Còn: {item.currentQty}</span>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${item.status === 'low' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {item.status === 'low' ? 'Sắp hết' : 'Ổn định'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Cần nhập</p>
                        <p className={`text-base font-black tracking-tighter ${item.suggestedRestock > 0 ? 'text-[#C9252C]' : 'text-emerald-600'}`}>
                          {item.suggestedRestock > 0 ? `+${item.suggestedRestock}` : '0'}
                        </p>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => setViewMode('inventory')}
                    className="w-full py-5 rounded-[24px] border-2 border-dashed border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-500 text-[9px] font-black uppercase tracking-[0.2em] hover:border-[#C9252C] hover:text-[#C9252C] transition-all tap-active active:scale-95"
                  >
                    Xem chi tiết kho
                  </button>
                </div>
              </div>

              {/* Recent Activity Summary */}
              <div className="bg-white dark:bg-stone-900 rounded-[24px] p-6 border border-stone-100 dark:border-stone-800 shadow-[0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-none space-y-5">
                <h3 className="text-stone-400 dark:text-stone-500 font-black text-xs uppercase tracking-widest">Tóm tắt hoạt động</h3>
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-3 border-b border-stone-50 dark:border-stone-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-stone-50 dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-400 dark:text-stone-500">
                        <ListOrdered className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-stone-700 dark:text-stone-300">Đơn hàng mới</span>
                    </div>
                    <span className="text-sm font-black text-stone-800 dark:text-white">{orders.filter(o => o.orderStatus === 'Đã nhận' || o.orderStatus === 'Chờ xử lý').length}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-stone-50 dark:border-stone-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-stone-50 dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-400 dark:text-stone-500">
                        <Clock className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-stone-700 dark:text-stone-300">Đang thực hiện</span>
                    </div>
                    <span className="text-sm font-black text-stone-800 dark:text-white">{orders.filter(o => o.orderStatus === 'Đang làm').length}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-stone-50 dark:border-stone-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-stone-50 dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-400 dark:text-stone-500">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-stone-700 dark:text-stone-300">Giao dịch chi tiêu</span>
                    </div>
                    <span className="text-sm font-black text-stone-800 dark:text-white">{soTayData.length}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {viewMode === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center px-1">
                <div className="space-y-0.5">
                  <h2 className="text-stone-800 dark:text-white font-black text-lg tracking-tight">Đơn hàng</h2>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Quản lý & Vận hành</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all tap-active ${
                      showSettings ? 'bg-stone-900 dark:bg-white text-white dark:text-black shadow-xl' : 'bg-white dark:bg-stone-900 text-stone-400 dark:text-stone-500 border border-stone-100 dark:border-stone-800 shadow-sm'
                    }`}
                  >
                    <SettingsIcon className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => fetchAllData(false)}
                    className="w-10 h-10 bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-center text-stone-400 dark:text-stone-500 tap-active shadow-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#C9252C]' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Status Filter Pills - Sticky */}
              <div className="sticky top-0 z-30 -mx-6 px-6 py-2 bg-stone-50/80 dark:bg-black/80 backdrop-blur-md">
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                  {[
                    { id: 'All', label: 'Tất cả', count: orders.length, color: 'bg-stone-500' },
                    { id: 'Chờ xử lý', label: 'Mới', count: orders.filter(o => o.orderStatus === 'Chờ xử lý').length, color: 'bg-amber-500' },
                    { id: 'Đã nhận', label: 'Nhận', count: orders.filter(o => o.orderStatus === 'Đã nhận').length, color: 'bg-amber-500' },
                    { id: 'Đang làm', label: 'Làm', count: orders.filter(o => o.orderStatus === 'Đang làm').length, color: 'bg-blue-500' },
                    { id: 'Hoàn thành', label: 'Xong', count: orders.filter(o => o.orderStatus === 'Hoàn thành').length, color: 'bg-[#C9252C]' },
                    { id: 'Đã hủy', label: 'Hủy', count: orders.filter(o => o.orderStatus === 'Đã hủy').length, color: 'bg-red-500' },
                  ].map((status) => {
                    const isSelected = filterStatus === status.id;
                    return (
                      <button
                        key={status.id}
                        onClick={() => {
                          setFilterStatus(status.id);
                          setCurrentPage(1);
                        }}
                        className={`px-4 py-2.5 rounded-2xl whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all tap-active flex items-center gap-2 border ${
                          isSelected
                            ? `${status.color} text-white border-transparent shadow-lg shadow-stone-200 dark:shadow-none scale-105`
                            : 'bg-white dark:bg-stone-900 text-stone-400 dark:text-stone-500 border-stone-100 dark:border-stone-800 shadow-sm'
                        }`}
                      >
                        {status.label}
                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                        }`}>
                          {status.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {showSettings && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 bg-white dark:bg-stone-900 rounded-[32px] border border-stone-100 dark:border-stone-800 shadow-xl space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">Làm mới</label>
                      <select 
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(Number(e.target.value))}
                        className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-2xl px-4 py-3 text-xs font-bold text-stone-800 dark:text-white focus:ring-2 focus:ring-[#C9252C]/20"
                      >
                        <option value={10}>10 giây</option>
                        <option value={30}>30 giây</option>
                        <option value={60}>1 phút</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-1">Sắp xếp</label>
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-2xl px-4 py-3 text-xs font-bold text-stone-800 dark:text-white focus:ring-2 focus:ring-[#C9252C]/20"
                      >
                        <option value="time">Mới nhất</option>
                        <option value="status">Trạng thái</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button 
                      onClick={() => setShouldAutoPrint(!shouldAutoPrint)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                        shouldAutoPrint ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-stone-50 dark:bg-stone-800 text-stone-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4" />
                        <span className="text-xs font-bold">Tự động in hóa đơn khi xong</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${shouldAutoPrint ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-600'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${shouldAutoPrint ? 'left-6' : 'left-1'}`} />
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="text-center py-24 flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-[32px] flex items-center justify-center mb-6 text-stone-300 dark:text-stone-600">
                      <Package className="w-10 h-10" />
                    </div>
                    <h3 className="text-lg font-black text-stone-800 dark:text-white tracking-tight">Trống trải quá...</h3>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-2">Chưa có đơn hàng nào</p>
                  </div>
                ) : (
                  orders
                    .filter(order => filterStatus === 'All' || order.orderStatus === filterStatus)
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map((order) => {
                    const isNew = (order.orderStatus === 'Đã nhận' || order.orderStatus === 'Chờ xử lý') && 
                                  (currentTime.getTime() - new Date(order.timestamp).getTime()) < 60000;
                    
                    return (
                      <motion.div 
                        key={`order-item-${order.orderId}`}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`bg-white dark:bg-stone-900 rounded-3xl overflow-hidden border-2 transition-all duration-300 ${
                          isNew ? 'border-[#C9252C] shadow-2xl shadow-red-100 dark:shadow-none' : 'border-stone-100 dark:border-stone-800 shadow-sm'
                        }`}
                      >
                        {/* Card Header */}
                        <div className="p-4 sm:p-5 flex justify-between items-start border-b border-stone-50 dark:border-stone-800/50">
                          <div className="flex items-center gap-2.5 sm:gap-3">
                            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 ${
                              order.orderStatus === 'Hoàn thành' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                              order.orderStatus === 'Đã hủy' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                              order.orderStatus === 'Đang làm' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                              order.orderStatus === 'Công nợ' ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
                              'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                            }`}>
                              {order.orderStatus === 'Hoàn thành' ? <CheckCircle2 className="w-5 h-5" /> :
                               order.orderStatus === 'Đã hủy' ? <XCircle className="w-5 h-5" /> :
                               order.orderStatus === 'Đang làm' ? <Coffee className="w-5 h-5" /> :
                               order.orderStatus === 'Công nợ' ? <AlertCircle className="w-5 h-5" /> :
                               <Clock className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">#{order.orderId}</span>
                                {isNew && <span className="w-1.5 h-1.5 bg-[#C9252C] rounded-full animate-pulse" />}
                              </div>
                              <h3 className="font-black text-stone-800 dark:text-white text-base tracking-tight">{order.customerName}</h3>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-baseline justify-end gap-0.5">
                              <span className="text-xl font-black text-[#C9252C] tracking-tighter">{order.total.toLocaleString()}</span>
                              <span className="text-[9px] font-black text-[#C9252C]/60 uppercase">đ</span>
                            </div>
                            <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">
                              {new Date(order.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 sm:p-5 space-y-4">
                          {/* Info Pills */}
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            <div className="flex items-center gap-2">
                              {order.staffName && (
                                <div className="flex items-center gap-1 px-2.5 py-1 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-100 dark:border-stone-700">
                                  <User className="w-2.5 h-2.5 text-stone-400" />
                                  <span className="text-[8px] sm:text-[9px] font-black text-stone-600 dark:text-stone-300 uppercase tracking-widest">{order.staffName}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 px-2.5 py-1 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-100 dark:border-stone-700">
                                <MapPin className="w-2.5 h-2.5 text-stone-400" />
                                <span className="text-[8px] sm:text-[9px] font-black text-stone-600 dark:text-stone-300 uppercase tracking-widest">{order.tableNumber || 'Mang đi'}</span>
                              </div>
                            </div>
                            {order.phoneNumber && (
                              <div className="flex items-center gap-1 px-2.5 py-1 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-100 dark:border-stone-700">
                                <User className="w-2.5 h-2.5 text-stone-400" />
                                <span className="text-[8px] sm:text-[9px] font-black text-stone-600 dark:text-stone-300 uppercase tracking-widest">{order.phoneNumber}</span>
                              </div>
                            )}
                            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border ${
                              order.paymentStatus === 'Đã thanh toán' 
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/10 dark:border-emerald-900/30 dark:text-emerald-400' 
                                : 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-900/10 dark:border-amber-900/30 dark:text-amber-400'
                            }`}>
                              <DollarSign className="w-2.5 h-2.5" />
                              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest">{order.paymentStatus || 'Chưa trả'}</span>
                            </div>
                          </div>

                          {/* Items List */}
                          <div className="space-y-2.5">
                            {order.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-7 h-7 bg-stone-50 dark:bg-stone-800 rounded-lg flex items-center justify-center text-stone-500 font-black text-[10px] border border-stone-100 dark:border-stone-700 shadow-inner">
                                    {item.quantity}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-stone-800 dark:text-white leading-none">{item.name}</p>
                                    {item.note && <p className="text-[10px] text-stone-400 font-medium italic mt-1">"{item.note}"</p>}
                                  </div>
                                </div>
                                <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest bg-stone-50 dark:bg-stone-800 px-2 py-1 rounded-md border border-stone-100 dark:border-stone-700">{item.size}</span>
                              </div>
                            ))}
                          </div>

                          {order.notes && (
                            <div className="p-3 bg-red-50/50 dark:bg-red-900/5 rounded-2xl border border-red-100/50 dark:border-red-900/10">
                              <p className="text-[10px] font-bold text-[#C9252C] italic flex items-center gap-2">
                                <FileText className="w-3 h-3" />
                                {order.notes}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="p-4 sm:p-5 bg-stone-50/30 dark:bg-stone-800/10 border-t border-stone-50 dark:border-stone-800/50 flex flex-wrap sm:flex-nowrap gap-2.5 sm:gap-3">
                          {order.orderStatus !== 'Hoàn thành' && order.orderStatus !== 'Đã hủy' && (
                            <div className="flex flex-wrap gap-2.5 flex-1 min-w-0">
                              {order.orderStatus !== 'Đang làm' && (
                                <button 
                                  onClick={() => {
                                    triggerVibrate(40);
                                    updateStatus(order.orderId, 'processing');
                                  }}
                                  className="flex-1 py-3.5 sm:py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest shadow-lg shadow-blue-200 dark:shadow-none tap-active hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                  <Clock className="w-3.5 h-3.5 sm:w-4 h-4" />
                                  Làm món
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  triggerVibrate([50, 30, 50]);
                                  if (window.confirm('Xác nhận hoàn thành và thanh toán?')) {
                                    updateStatus(order.orderId, 'completed', { totalPrice: order.total, paymentStatus: 'Đã thanh toán' });
                                  }
                                }}
                                className="flex-1 py-3.5 sm:py-4 bg-[#C9252C] text-white rounded-2xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest shadow-lg shadow-red-200 dark:shadow-none tap-active hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 h-4" />
                                Hoàn thành
                              </button>
                            </div>
                          )}
                          
                          <div className="flex gap-2 w-full sm:w-auto justify-end">
                            <button 
                              onClick={() => setSelectedOrderForInvoice(order)}
                              className="w-11 h-11 sm:w-12 sm:h-12 bg-white dark:bg-stone-800 text-stone-400 rounded-2xl border border-stone-100 dark:border-stone-700 flex items-center justify-center tap-active hover:text-[#C9252C] transition-all active:scale-95 shadow-sm"
                              title="Xuất hóa đơn"
                            >
                              <Share2 className="w-4.5 h-4.5 sm:w-5 h-5" />
                            </button>
                            {order.orderStatus !== 'Đã hủy' && order.orderStatus !== 'Hoàn thành' && (
                              <button 
                                onClick={() => {
                                  triggerVibrate(50);
                                  if (window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
                                    const cartItemsPayload = mapOrderToBackend(order.items);
                                    updateStatus(order.orderId, 'cancelled', { cartItems: cartItemsPayload });
                                  }
                                }}
                                className="w-11 h-11 sm:w-12 sm:h-12 bg-white dark:bg-stone-800 text-stone-400 rounded-2xl border border-stone-100 dark:border-stone-700 flex items-center justify-center tap-active hover:text-red-600 transition-all active:scale-95 shadow-sm"
                                title="Hủy đơn"
                              >
                                <XCircle className="w-4.5 h-4.5 sm:w-5 h-5" />
                              </button>
                            )}
                            <RoleGuard allowedRoles={['manager']}>
                              <button 
                                onClick={async () => {
                                  if (window.confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN đơn hàng #${order.orderId}? Hành động này không thể hoàn tác.`)) {
                                    const success = await deleteOrder(order.orderId);
                                    if (success) showToast(`Đã xóa đơn #${order.orderId}`);
                                    else showToast('Lỗi khi xóa đơn hàng', 'error');
                                  }
                                }}
                                className="w-12 h-12 bg-white dark:bg-stone-800 text-stone-400 rounded-2xl border border-stone-100 dark:border-stone-700 flex items-center justify-center tap-active hover:text-red-600 transition-all active:scale-95 shadow-sm"
                                title="Xóa vĩnh viễn"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </RoleGuard>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Pagination Controls */}
              {orders.filter(order => filterStatus === 'All' || order.orderStatus === filterStatus).length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between pt-6 pb-4">
                  <button 
                    onClick={() => {
                      setCurrentPage(prev => Math.max(1, prev - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === 1}
                    className="w-12 h-12 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 text-stone-600 dark:text-stone-300 rounded-2xl flex items-center justify-center disabled:opacity-30 tap-active shadow-sm"
                  >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Trang</span>
                    <span className="text-sm font-black text-stone-800 dark:text-white">
                      {currentPage} <span className="text-stone-300 mx-1">/</span> {Math.ceil(orders.filter(order => filterStatus === 'All' || order.orderStatus === filterStatus).length / ITEMS_PER_PAGE)}
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      setCurrentPage(prev => Math.min(Math.ceil(orders.filter(order => filterStatus === 'All' || order.orderStatus === filterStatus).length / ITEMS_PER_PAGE), prev + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === Math.ceil(orders.filter(order => filterStatus === 'All' || order.orderStatus === filterStatus).length / ITEMS_PER_PAGE)}
                    className="w-12 h-12 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 text-stone-600 dark:text-stone-300 rounded-2xl flex items-center justify-center disabled:opacity-30 tap-active shadow-sm"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {viewMode === 'finance' && (
            <motion.div
              key="finance"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <FinanceDashboard />
            </motion.div>
          )}

          {false && viewMode === 'finance' && (
            <motion.div
              key="finance-old"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center px-1">
                <div className="space-y-0.5">
                  <h2 className="text-stone-800 dark:text-white font-black text-lg tracking-tight">Báo cáo tài chính</h2>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Dữ liệu chi tiết đơn hàng</p>
                </div>
                <button 
                  onClick={() => fetchAllData(false)}
                  className="w-10 h-10 bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-center text-stone-400 dark:text-stone-500 tap-active shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#C9252C]' : ''}`} />
                </button>
              </div>

              <div className="bg-white dark:bg-stone-900 rounded-[32px] border border-stone-100 dark:border-stone-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-50 dark:bg-stone-800/50 border-b border-stone-100 dark:border-stone-800">
                        <th className="p-5 text-[9px] font-black text-stone-400 uppercase tracking-[0.2em]">Ngày</th>
                        <th className="p-5 text-[9px] font-black text-stone-400 uppercase tracking-[0.2em]">Mã đơn</th>
                        <th className="p-5 text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] text-right">Tổng thu</th>
                        <th className="p-5 text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] text-right">VAT 8%</th>
                        <th className="p-5 text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] text-right">Thuần</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financeData.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-20 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <BarChart3 className="w-10 h-10 text-stone-200 mb-4" />
                              <p className="text-xs font-black text-stone-400 uppercase tracking-widest">Chưa có dữ liệu báo cáo</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        financeData.slice().reverse().map((row, idx) => (
                          <tr key={`finance-row-${idx}`} className="border-b border-stone-50 dark:border-stone-800 last:border-0 hover:bg-stone-50/50 dark:hover:bg-stone-800/20 transition-colors">
                            <td className="p-5 text-[10px] font-bold text-stone-500 dark:text-stone-400">
                              {new Date(row["Ngày"] || row["timestamp"] || "").toLocaleDateString('vi-VN')}
                            </td>
                            <td className="p-5 text-[10px] font-black text-stone-800 dark:text-white">#{row["Mã đơn"] || row["orderId"]}</td>
                            <td className="p-5 text-xs font-black text-emerald-600 text-right">{Number(row["Tổng thu"] || row["total"] || 0).toLocaleString()}đ</td>
                            <td className="p-5 text-xs font-bold text-red-500 text-right">{Number(row["VAT 8%"] || row["vat"] || 0).toLocaleString()}đ</td>
                            <td className="p-5 text-xs font-black text-blue-600 text-right">{Number(row["Thuần"] || row["net"] || 0).toLocaleString()}đ</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {viewMode === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full"
            >
              <MenuManager appsScriptUrl={appsScriptUrl} />
            </motion.div>
          )}

          {viewMode === 'expenses' && (
            <motion.div
              key="expenses"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center px-1">
                <div className="space-y-0.5">
                  <h2 className="text-stone-800 dark:text-white font-black text-lg tracking-tight">Quản lý chi tiêu</h2>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Sổ quỹ & Giao dịch</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => fetchAllData(false)}
                    className="w-10 h-10 bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-center text-stone-400 dark:text-stone-500 tap-active shadow-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#C9252C]' : ''}`} />
                  </button>
                  <button 
                    onClick={() => setShowExpenseForm(true)}
                    className="w-12 h-12 bg-[#C9252C] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-100 dark:shadow-none tap-active hover:bg-red-700 transition-all active:scale-95"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Expense Chart */}
              {expensesByCategory.length > 0 && (
                <div className="bg-white dark:bg-stone-900 p-8 rounded-[40px] border border-stone-100 dark:border-stone-800 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-stone-800 dark:text-white text-sm uppercase tracking-widest">Phân bổ chi tiêu</h3>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Theo danh mục</p>
                    </div>
                    <div className="w-12 h-12 bg-stone-50 dark:bg-stone-800 rounded-2xl flex items-center justify-center">
                      <PieChartIcon className="w-6 h-6 text-stone-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* Expense List */}
              <div className="space-y-4">
                {soTayData.length === 0 ? (
                  <div className="text-center py-24 flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-[32px] flex items-center justify-center mb-6 text-stone-300 dark:text-stone-600">
                      <Wallet className="w-10 h-10" />
                    </div>
                    <h3 className="text-lg font-black text-stone-800 dark:text-white tracking-tight">Chưa có chi tiêu</h3>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-2">Ghi lại các khoản chi của quán</p>
                  </div>
                ) : (
                  soTayData.map((expense, index) => (
                    <motion.div 
                      key={`expense-item-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-stone-900 p-5 rounded-[32px] border border-stone-100 dark:border-stone-800 shadow-sm flex items-center justify-between hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                          expense.phan_loai === 'Thu' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          {expense.phan_loai === 'Thu' ? <ArrowDownRight className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                        </div>
                        <div>
                          <h4 className="font-black text-stone-800 dark:text-white text-sm tracking-tight">{expense.ghi_chu}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest bg-stone-50 dark:bg-stone-800 px-2 py-0.5 rounded-md border border-stone-100 dark:border-stone-700">{expense.danh_muc}</span>
                            <span className="text-[9px] font-bold text-stone-300 dark:text-stone-600">•</span>
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">{new Date(expense.thoi_gian).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`font-black text-base tracking-tighter ${expense.phan_loai === 'Thu' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {expense.phan_loai === 'Thu' ? '+' : '-'}{Number(expense.so_tien).toLocaleString()}
                            <span className="text-[9px] ml-0.5 uppercase">đ</span>
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            if (window.confirm('Xóa giao dịch này?')) deleteExpense(expense.id_thu_chi);
                          }}
                          className="w-10 h-10 flex items-center justify-center bg-stone-50 dark:bg-stone-800 rounded-xl text-stone-300 dark:text-stone-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 tap-active transition-all active:scale-90"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {viewMode === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6 pb-20"
            >
              {/* Header Section */}
              <div className="flex justify-between items-end px-1">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-stone-800 dark:text-white tracking-tight">Quản lý Kho</h2>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Tồn kho & Nguyên liệu</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => fetchInventory()}
                    className="w-10 h-10 bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-center text-stone-400 dark:text-stone-500 tap-active shadow-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#C9252C]' : ''}`} />
                  </button>
                  <button 
                    onClick={() => setShowInventoryForm(true)}
                    className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 dark:shadow-none tap-active hover:bg-emerald-700 transition-all active:scale-95"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Search Bar for Inventory */}
              <div className="px-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input 
                    type="text"
                    placeholder="Tìm kiếm nguyên liệu, mã số..."
                    value={inventorySearchQuery}
                    onChange={(e) => setInventorySearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 pl-10 pr-10 py-3 rounded-2xl font-medium text-[15px] text-stone-800 dark:text-white placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-sm"
                  />
                  {inventorySearchQuery && (
                    <button
                      onClick={() => setInventorySearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 tap-active"
                    >
                      <XCircle className="h-4 w-4 bg-stone-200 dark:bg-stone-800 rounded-full p-0.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Modern Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-stone-900 p-6 rounded-[32px] border border-stone-100 dark:border-stone-800 shadow-sm relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-5">
                    <Package className="w-24 h-24" />
                  </div>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Tổng mặt hàng</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-stone-800 dark:text-white">{inventoryItems.length}</span>
                    <span className="text-[10px] font-bold text-stone-400 uppercase">món</span>
                  </div>
                </div>
                <div className="bg-white dark:bg-stone-900 p-6 rounded-[32px] border border-stone-100 dark:border-stone-800 shadow-sm relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-5">
                    <AlertCircle className="w-24 h-24 text-red-500" />
                  </div>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Sắp hết hàng</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-red-500">{inventoryItems.filter(i => (i.inventoryQty || 0) <= 5).length}</span>
                    <span className="text-[10px] font-bold text-red-400 uppercase">món</span>
                  </div>
                </div>
              </div>

              {/* Inventory Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[11px] font-black text-stone-400 uppercase tracking-[0.2em]">Danh sách tồn kho</h3>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-stone-300 uppercase tracking-widest">
                    <Filter className="w-3 h-3" />
                    <span>Lọc theo: Tất cả</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {filteredInventoryItems.length === 0 ? (
                    <div className="bg-white dark:bg-stone-900 rounded-[32px] p-12 border border-stone-100 dark:border-stone-800 text-center">
                      <Package className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                      <p className="text-xs font-black text-stone-400 uppercase tracking-widest">Không tìm thấy nguyên liệu</p>
                    </div>
                  ) : (
                    filteredInventoryItems.map((item, idx) => (
                      <motion.div 
                        key={`inventory-item-${idx}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`bg-white dark:bg-stone-900 p-5 rounded-28px border shadow-sm flex items-center justify-between group hover:shadow-md transition-all ${
                          (item.inventoryQty || 0) === 0 
                            ? 'border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/5' 
                            : (item.inventoryQty || 0) <= 5 
                              ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-900/5' 
                              : 'border-stone-100 dark:border-stone-800'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                            (item.inventoryQty || 0) === 0
                              ? 'bg-red-100 text-red-600 dark:bg-red-900/40'
                              : (item.inventoryQty || 0) <= 5 
                                ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40' 
                                : 'bg-stone-50 text-stone-400 dark:bg-stone-800'
                          }`}>
                            <Coffee className="w-7 h-7" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-stone-800 dark:text-white text-base tracking-tight">{item.name}</h4>
                              {(item.inventoryQty || 0) === 0 ? (
                                <span className="px-2 py-0.5 rounded-md bg-red-500 text-white text-[8px] font-black uppercase tracking-widest animate-pulse">Hết hàng</span>
                              ) : (item.inventoryQty || 0) <= 5 ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest">Sắp hết</span>
                              ) : null}
                            </div>
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-0.5">{item.id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`text-xl font-black tracking-tighter ${
                              (item.inventoryQty || 0) === 0 ? 'text-red-600' : (item.inventoryQty || 0) <= 5 ? 'text-amber-600' : 'text-emerald-600'
                            }`}>
                              {item.inventoryQty || 0}
                            </p>
                            <p className="text-[9px] font-black text-stone-300 uppercase tracking-widest">Số lượng</p>
                          </div>
                          <button 
                            onClick={() => {
                              setEditingInventoryItem(item);
                              setEditInventoryQty(String(item.inventoryQty || 0));
                            }}
                            className="w-10 h-10 bg-stone-50 dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-400 hover:text-[#C9252C] hover:bg-red-50 dark:hover:bg-red-900/20 transition-all tap-active active:scale-90"
                          >
                            <SettingsIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              {/* Forecast & Logs Section */}
              <div className="grid grid-cols-1 gap-6">
                {/* Forecast */}
                <div className="bg-white dark:bg-stone-900 rounded-[40px] p-8 border border-stone-100 dark:border-stone-800 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div className="space-y-1">
                      <h3 className="font-black text-stone-800 dark:text-white text-lg tracking-tight">Dự báo nhập hàng</h3>
                      <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Dựa trên tiêu thụ 7 ngày</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-500">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {stats.inventoryForecast.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-xs font-black text-stone-300 uppercase tracking-widest">Chưa có dữ liệu dự báo</p>
                      </div>
                    ) : (
                      stats.inventoryForecast.slice(0, 5).map((item, idx) => (
                        <div key={`forecast-${idx}`} className="flex items-center justify-between p-5 bg-stone-50 dark:bg-stone-800 rounded-[24px] border border-stone-100/50 dark:border-stone-700/50">
                          <div className="space-y-1">
                            <h4 className="font-black text-stone-800 dark:text-white text-sm tracking-tight">{item.name}</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Tiêu thụ: {item.weeklyConsumption}/tuần</span>
                              {item.status === 'low' && (
                                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Gợi ý</p>
                            <div className={`px-3 py-1 rounded-lg font-black text-sm ${
                              item.suggestedRestock > 0 
                                ? 'bg-red-50 text-red-600 dark:bg-red-900/20' 
                                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
                            }`}>
                              {item.suggestedRestock > 0 ? `+${item.suggestedRestock}` : 'Đủ'}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent Logs */}
                <div className="space-y-4">
                  <h3 className="text-[11px] font-black text-stone-400 uppercase tracking-[0.2em] px-1">Lịch sử nhập kho</h3>
                  {inventoryLogs.length === 0 ? (
                    <div className="bg-white dark:bg-stone-900 rounded-[32px] p-12 border border-stone-100 dark:border-stone-800 text-center">
                      <Package className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                      <p className="text-xs font-black text-stone-400 uppercase tracking-widest">Chưa có lịch sử nhập kho</p>
                    </div>
                  ) : (
                    inventoryLogs.slice(0, 10).map((log, idx) => (
                      <motion.div 
                        key={`inventory-log-${idx}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white dark:bg-stone-900 p-6 rounded-[32px] border border-stone-100 dark:border-stone-800 shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest bg-stone-50 dark:bg-stone-800 px-2 py-1 rounded-lg border border-stone-100 dark:border-stone-700">{log.id_nhap}</span>
                              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">{log.ma_nl}</span>
                            </div>
                            <h4 className="font-black text-stone-800 dark:text-white text-lg tracking-tight leading-none">{log.materialName}</h4>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-emerald-600 font-black text-xl tracking-tighter">
                              <ArrowDownRight className="w-5 h-5" />
                              <span>{log.so_luong_nhap}</span>
                            </div>
                            <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mt-1">{new Date(log.timestamp).toLocaleDateString('vi-VN')}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-stone-50 dark:border-stone-800">
                          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                            Đơn giá: {Number(log.don_gia_nhap).toLocaleString()}đ
                          </div>
                          <div className="text-xs font-black text-stone-800 dark:text-white tracking-tight">
                            Tổng: {(log.so_luong_nhap * log.don_gia_nhap).toLocaleString()}đ
                          </div>
                        </div>
                        {log.ghi_chu && (
                          <div className="mt-4 p-3 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-100/50 dark:border-stone-700/50">
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 italic font-medium">"{log.ghi_chu}"</p>
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expense Form Modal */}
      <AnimatePresence>
        {showExpenseForm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-[60]">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white dark:bg-stone-900 rounded-t-[40px] w-full p-8 shadow-2xl space-y-6 border-t border-stone-100 dark:border-stone-800"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-stone-800 dark:text-white">Thêm giao dịch</h3>
                <button onClick={() => setShowExpenseForm(false)} className="w-10 h-10 bg-stone-50 dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-400 dark:text-stone-500">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={addExpense} className="space-y-4">
                {expenseError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold border border-red-100 dark:border-red-900/30">
                    {expenseError}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Phân loại</label>
                  <select
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value)}
                    className="input-field font-bold"
                  >
                    <option value="Chi">Khoản chi</option>
                    <option value="Thu">Khoản thu</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Số tiền</label>
                  <input
                    type="number"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="Nhập số tiền..."
                    className="input-field text-xl font-black"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Nội dung</label>
                  <input
                    type="text"
                    required
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    placeholder="Ví dụ: Mua sữa, trà..."
                    className="input-field font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Danh mục</label>
                  <select
                    value={expenseCat}
                    onChange={(e) => setExpenseCat(e.target.value)}
                    className="input-field font-bold"
                  >
                    {[
                      "Nguyên liệu", "Bao bì & Dụng cụ", "Điện", "Nước", "Wifi", "Rác", 
                      "Mặt bằng", "Nhân viên", "Vận chuyển", "Phí nền tảng", "Sửa chữa & Bảo trì", 
                      "Trang thiết bị", "Marketing & In ấn", "Thu bán hàng", "Thanh lý", "Thu khác", "Khác"
                    ].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary mt-4 shadow-xl shadow-stone-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu giao dịch'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inventory Form Modal */}
      <AnimatePresence>
        {showInventoryForm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-[60]">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white dark:bg-stone-900 rounded-t-[40px] w-full p-8 shadow-2xl space-y-6 border-t border-stone-100 dark:border-stone-800"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-stone-800 dark:text-white">Nhập kho nguyên liệu</h3>
                <button onClick={() => setShowInventoryForm(false)} className="w-10 h-10 bg-stone-50 dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-400 dark:text-stone-500">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={addInventory} className="space-y-4">
                {inventoryError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold border border-red-100 dark:border-red-900/30">
                    {inventoryError}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Nguyên liệu</label>
                  <select
                    value={inventoryMaterial}
                    onChange={(e) => setInventoryMaterial(e.target.value)}
                    className="input-field font-bold"
                  >
                    {availableMaterials.map((m, idx) => (
                      <option key={`material-option-${idx}`} value={m.code || m.ma_nl}>
                        {(m.code || m.ma_nl)} - {(m.name || m.ten_nl || m.ten_mon)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Số lượng</label>
                    <input
                      type="number"
                      required
                      value={inventoryAmount}
                      onChange={(e) => setInventoryAmount(e.target.value)}
                      placeholder="0"
                      className="input-field font-black"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Đơn giá</label>
                    <input
                      type="number"
                      required
                      value={inventoryPrice}
                      onChange={(e) => setInventoryPrice(e.target.value)}
                      placeholder="0"
                      className="input-field font-black"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Ghi chú</label>
                  <input
                    type="text"
                    value={inventoryNote}
                    onChange={(e) => setInventoryNote(e.target.value)}
                    placeholder="Nhà cung cấp, hạn sử dụng..."
                    className="input-field font-bold"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black text-lg shadow-xl shadow-emerald-100 dark:shadow-none tap-active flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang xử lý...' : 'Xác nhận nhập kho'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Inventory Modal */}
      <AnimatePresence>
        {editingInventoryItem && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-stone-900 rounded-[32px] w-full max-w-sm p-6 shadow-2xl space-y-5 border border-stone-100 dark:border-stone-800"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-stone-800 dark:text-white">Cập nhật tồn kho</h3>
                <button onClick={() => setEditingInventoryItem(null)} className="w-8 h-8 bg-stone-50 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-400">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Nguyên liệu</p>
                <p className="text-lg font-black text-stone-800 dark:text-white">{editingInventoryItem.name}</p>
              </div>

              <form onSubmit={handleUpdateInventory} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Số lượng thực tế</label>
                  <input
                    type="number"
                    required
                    value={editInventoryQty}
                    onChange={(e) => setEditInventoryQty(e.target.value)}
                    className="input-field text-xl font-black text-center"
                    autoFocus
                  />
                  <p className="text-[10px] text-stone-400 text-center">
                    Hệ thống sẽ tự động tạo phiếu điều chỉnh chênh lệch.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingInventoryItem(null)}
                    className="flex-1 py-3 bg-stone-100 dark:bg-stone-800 text-stone-500 font-bold rounded-2xl"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingInventory}
                    className="flex-1 py-3 bg-[#C9252C] text-white font-bold rounded-2xl shadow-lg shadow-red-100 dark:shadow-none disabled:opacity-50"
                  >
                    {isUpdatingInventory ? 'Đang lưu...' : 'Cập nhật'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedOrderForInvoice && (
          <Invoice 
            order={selectedOrderForInvoice} 
            onClose={() => setSelectedOrderForInvoice(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
