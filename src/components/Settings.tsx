import { useState, useEffect } from 'react';
import { Save, CheckCircle2, Store, Printer, Volume2, Wifi, Moon, Sun, Database, RotateCcw, Clock, AlertCircle, User, LogOut, Shield, Users, Plus, Trash2, Edit2, KeyRound, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Staff } from '../types';

interface SettingsProps {
  appsScriptUrl: string;
  setAppsScriptUrl: (url: string) => void;
  appMode: 'order' | 'management';
}

function StaffLogin() {
  const { login, currentUser, logout, checkIn, checkOut, timeSheets, updateProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  
  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, pin)) {
      setUsername('');
      setPin('');
      setError('');
    } else {
      setError('Tên đăng nhập hoặc mã PIN không đúng');
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (newPin && newPin !== confirmPin) {
      setProfileError('Mã PIN xác nhận không khớp');
      return;
    }

    if (newPin && newPin.length < 4) {
      setProfileError('Mã PIN phải có ít nhất 4 ký tự');
      return;
    }

    const updates: any = {};
    if (newName && newName !== currentUser?.name) updates.name = newName;
    if (newPin) updates.pin = newPin;

    if (Object.keys(updates).length === 0) {
      setIsEditingProfile(false);
      return;
    }

    updateProfile(updates);
    setProfileSuccess('Cập nhật thông tin thành công');
    setIsEditingProfile(false);
    setNewPin('');
    setConfirmPin('');
    
    setTimeout(() => setProfileSuccess(''), 3000);
  };

  if (currentUser) {
    const todaySheet = timeSheets.find(t => t.staffId === currentUser.id && !t.checkOut);
    
    return (
      <section className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-100 dark:border-stone-800 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-400 relative overflow-hidden">
              {currentUser.role === 'manager' ? <Shield className="w-6 h-6 text-purple-500" /> : <User className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="font-black text-stone-800 dark:text-white text-lg">{currentUser.name}</h2>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${
                  currentUser.role === 'manager' 
                    ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {currentUser.role === 'manager' ? 'Quản Lý' : 'Nhân Viên'}
                </span>
                <span className={`w-2 h-2 rounded-full ${todaySheet ? 'bg-green-500' : 'bg-stone-300'}`} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setIsEditingProfile(!isEditingProfile);
                setNewName(currentUser.name);
                setNewPin('');
                setConfirmPin('');
              }}
              className="p-2 text-stone-400 hover:text-stone-800 dark:hover:text-white transition-colors bg-stone-50 dark:bg-stone-800 rounded-xl"
              title="Chỉnh sửa thông tin"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button 
              onClick={logout}
              className="p-2 text-stone-400 hover:text-red-500 transition-colors bg-stone-50 dark:bg-stone-800 rounded-xl"
              title="Đăng xuất"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Profile Edit Form */}
        {isEditingProfile && (
          <form onSubmit={handleUpdateProfile} className="bg-stone-50 dark:bg-stone-950 p-4 rounded-2xl space-y-3 border border-stone-200 dark:border-stone-800 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Tên hiển thị</label>
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-stone-400"
                placeholder="Nhập tên mới..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">PIN Mới (Tùy chọn)</label>
                <input 
                  type="password" 
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-stone-400"
                  placeholder="****"
                  maxLength={6}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Xác nhận PIN</label>
                <input 
                  type="password" 
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-stone-400"
                  placeholder="****"
                  maxLength={6}
                />
              </div>
            </div>
            {profileError && <p className="text-xs text-red-500 font-bold">{profileError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button 
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-3 py-1.5 text-xs font-bold text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button 
                type="submit"
                className="px-3 py-1.5 text-xs font-bold bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-lg shadow-sm"
              >
                Lưu thay đổi
              </button>
            </div>
          </form>
        )}

        {profileSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {profileSuccess}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={checkIn}
            disabled={!!todaySheet}
            className="py-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl font-bold text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" /> Check In
          </button>
          <button
            onClick={checkOut}
            disabled={!todaySheet}
            className="py-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-xl font-bold text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Check Out
          </button>
        </div>
        
        {todaySheet && (
          <div className="text-center text-[10px] text-stone-400 font-medium bg-stone-50 dark:bg-stone-950 py-2 rounded-lg">
            Đã check-in lúc: <span className="font-bold text-stone-600 dark:text-stone-300">{new Date(todaySheet.checkIn).toLocaleTimeString('vi-VN')}</span>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-100 dark:border-stone-800 space-y-5">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-black text-stone-800 dark:text-white text-base leading-none">Đăng nhập nhân viên</h2>
          <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mt-1">Staff Login</p>
        </div>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-wider ml-1">Tài khoản</label>
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl px-4 py-3 font-bold text-stone-800 dark:text-white text-sm outline-none focus:border-stone-400"
            placeholder="Nhập tên đăng nhập..."
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-wider ml-1">Mã PIN</label>
          <input 
            type="password" 
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl px-4 py-3 font-bold text-stone-800 dark:text-white text-sm outline-none focus:border-stone-400"
            placeholder="****"
            maxLength={6}
          />
        </div>
        
        {error && <p className="text-xs text-red-500 font-bold">{error}</p>}

        <button 
          type="submit"
          className="w-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 py-3 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-stone-900/10"
        >
          Đăng nhập
        </button>
      </form>
    </section>
  );
}

export function Settings({ appsScriptUrl, setAppsScriptUrl, appMode }: SettingsProps) {
  const { theme, toggleTheme } = useTheme();
  const { refreshInterval, setRefreshInterval, autoSyncEnabled: dataAutoSync, setAutoSyncEnabled: setDataAutoSync, fetchAllData, fixAll } = useData();
  const { currentUser, isAdmin } = useAuth();
  
  // Initial values for dirty checking
  const [initialSettings, setInitialSettings] = useState({
    storeName: localStorage.getItem('storeName') || 'Tiệm Nước Nhỏ',
    storeAddress: localStorage.getItem('storeAddress') || '123 Đường ABC, TP.HCM',
    wifiPass: localStorage.getItem('wifiPass') || '12345678',
    printerIp: localStorage.getItem('printerIp') || '192.168.1.200',
    autoPrint: localStorage.getItem('autoPrint') === 'true',
    isMuted: localStorage.getItem('notificationMuted') === 'true',
    enableAI: localStorage.getItem('enableAI') !== 'false',
    appsScriptUrl: appsScriptUrl,
    refreshInterval: refreshInterval,
    autoSyncEnabled: localStorage.getItem('autoSyncEnabled') !== 'false',
  });

  // Store Settings
  const [storeName, setStoreName] = useState(initialSettings.storeName);
  const [storeAddress, setStoreAddress] = useState(initialSettings.storeAddress);
  const [wifiPass, setWifiPass] = useState(initialSettings.wifiPass);

  // Connection Settings
  const [url, setUrl] = useState(appsScriptUrl);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(initialSettings.autoSyncEnabled);

  // Printer Settings
  const [printerIp, setPrinterIp] = useState(initialSettings.printerIp);
  const [autoPrint, setAutoPrint] = useState(initialSettings.autoPrint);

  // Sound Settings
  const [isMuted, setIsMuted] = useState(initialSettings.isMuted);

  // AI Settings
  const [enableAI, setEnableAI] = useState(initialSettings.enableAI);

  // Data Refresh Settings
  const [localRefreshInterval, setLocalRefreshInterval] = useState(initialSettings.refreshInterval);

  const [isSaved, setIsSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbxJacjM6iZXsbaf27XVLGKvs7zArOuoQ9cKK-qEKHgYz_rfhqcCuTJLDU39kpCFRrTN/exec';

  const validateUrl = (value: string) => {
    if (!value.trim()) return 'URL không được để trống';
    if (!value.startsWith('https://script.google.com/macros/s/')) {
      return 'URL Apps Script không hợp lệ. Phải bắt đầu bằng https://script.google.com/macros/s/...';
    }
    return null;
  };

  const handleRestoreDefault = () => {
    setUrl(DEFAULT_URL);
    setUrlError(null);
  };

  const handleTestConnection = async () => {
    const error = validateUrl(url);
    if (error) {
      setUrlError(error);
      return;
    }

    setIsTestingConnection(true);
    setUrlError(null);
    try {
      const response = await fetch(`${url}?action=getAllMenu`, { credentials: 'omit' });
      if (response.ok) {
        alert('Kết nối thành công! Dữ liệu đã sẵn sàng.');
      } else {
        setUrlError('Không thể kết nối. Máy chủ phản hồi lỗi: ' + response.status);
      }
    } catch (err) {
      setUrlError('Lỗi kết nối. Vui lòng kiểm tra lại URL hoặc mạng internet.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  useEffect(() => {
    const changed = 
      storeName !== initialSettings.storeName ||
      storeAddress !== initialSettings.storeAddress ||
      wifiPass !== initialSettings.wifiPass ||
      printerIp !== initialSettings.printerIp ||
      autoPrint !== initialSettings.autoPrint ||
      isMuted !== initialSettings.isMuted ||
      enableAI !== initialSettings.enableAI ||
      url !== initialSettings.appsScriptUrl ||
      localRefreshInterval !== initialSettings.refreshInterval ||
      autoSyncEnabled !== initialSettings.autoSyncEnabled;
    
    setHasChanges(changed);
  }, [storeName, storeAddress, wifiPass, printerIp, autoPrint, isMuted, enableAI, url, localRefreshInterval, autoSyncEnabled, initialSettings]);

  const handleSave = () => {
    if (localRefreshInterval < 15) {
      alert('Thời gian làm mới tối thiểu là 15 giây.');
      return;
    }

    localStorage.setItem('storeName', storeName);
    localStorage.setItem('storeAddress', storeAddress);
    localStorage.setItem('wifiPass', wifiPass);
    localStorage.setItem('printerIp', printerIp);
    localStorage.setItem('autoPrint', String(autoPrint));
    localStorage.setItem('notificationMuted', String(isMuted));
    localStorage.setItem('enableAI', String(enableAI));
    localStorage.setItem('appsScriptUrl', url);
    localStorage.setItem('refreshInterval', String(localRefreshInterval));
    localStorage.setItem('autoSyncEnabled', String(autoSyncEnabled));
    
    setAppsScriptUrl(url);
    setRefreshInterval(localRefreshInterval);
    setDataAutoSync(autoSyncEnabled);

    // Update initial settings to match current saved state
    setInitialSettings({
      storeName,
      storeAddress,
      wifiPass,
      printerIp,
      autoPrint,
      isMuted,
      enableAI,
      appsScriptUrl: url,
      refreshInterval: localRefreshInterval,
      autoSyncEnabled: autoSyncEnabled,
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleResetToDefault = () => {
    if (confirm('Bạn có chắc chắn muốn khôi phục tất cả cài đặt về mặc định ban đầu?')) {
      setStoreName('Tiệm Nước Nhỏ');
      setStoreAddress('123 Đường ABC, TP.HCM');
      setWifiPass('12345678');
      setPrinterIp('192.168.1.200');
      setAutoPrint(false);
      setIsMuted(false);
      setEnableAI(true);
      setUrl(DEFAULT_URL);
      setLocalRefreshInterval(60);
      setAutoSyncEnabled(true);
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-32 p-4 sm:p-6 space-y-6 max-w-3xl mx-auto w-full">
      
      {/* Header Section */}
      <header className="flex items-center justify-between px-2 pt-2">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-black text-stone-800 dark:text-white tracking-tight">Cài đặt</h1>
          <p className="text-stone-500 dark:text-stone-400 font-medium text-sm">
            {appMode === 'management' ? 'Quản lý cửa hàng và cấu hình hệ thống' : 'Tùy chỉnh cá nhân và thiết bị'}
          </p>
        </div>
        {appMode === 'management' && (
          <button
            onClick={handleResetToDefault}
            className="h-11 px-3 text-stone-400 hover:text-[#C9252C] hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl flex items-center justify-center gap-2 tap-active"
            title="Khôi phục cài đặt gốc"
          >
            <RotateCcw className="w-5 h-5" />
            <span className="text-xs font-bold hidden sm:inline">Khôi phục gốc</span>
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Staff Login Section */}
        <StaffLogin />

        {currentUser && (
          <>
            {/* Store Info Section */}
            <section className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-100 dark:border-stone-800 space-y-5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 text-[#C9252C] rounded-xl flex items-center justify-center shadow-inner">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-stone-800 dark:text-white text-base leading-none">Thông tin cửa hàng</h2>
              <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mt-1">Store Info</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-wider ml-1">Tên quán</label>
              <input 
                type="text" 
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Nhập tên quán..."
                disabled={appMode === 'order'}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl px-4 py-3 font-bold text-stone-800 dark:text-white text-sm focus:ring-2 focus:ring-[#C9252C]/20 focus:border-[#C9252C] outline-none disabled:opacity-60"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-wider ml-1">Mật khẩu Wifi</label>
              <div className="relative">
                <Wifi className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input 
                  type="text" 
                  value={wifiPass}
                  onChange={(e) => setWifiPass(e.target.value)}
                  placeholder="Nhập mật khẩu wifi..."
                  disabled={appMode === 'order'}
                  className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl pl-11 pr-4 py-3 font-bold text-stone-800 dark:text-white text-sm focus:ring-2 focus:ring-[#C9252C]/20 focus:border-[#C9252C] outline-none disabled:opacity-60"
                />
              </div>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[11px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-wider ml-1">Địa chỉ</label>
              <input 
                type="text" 
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="Nhập địa chỉ quán..."
                disabled={appMode === 'order'}
                className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl px-4 py-3 font-bold text-stone-800 dark:text-white text-sm focus:ring-2 focus:ring-[#C9252C]/20 focus:border-[#C9252C] outline-none disabled:opacity-60"
              />
            </div>
          </div>
        </section>

        {/* Preferences Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Appearance */}
          <section className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-100 dark:border-stone-800 space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-xl flex items-center justify-center shadow-inner">
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="font-black text-stone-800 dark:text-white text-base leading-none">Giao diện</h2>
                <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mt-1">Appearance</p>
              </div>
            </div>

            <button 
              onClick={toggleTheme}
              className="w-full flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-800 group hover:border-indigo-300 dark:hover:border-indigo-700"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </div>
                <span className="font-bold text-stone-700 dark:text-stone-300 text-sm">Chế độ tối</span>
              </div>
              <div className={`w-12 h-7 rounded-full relative ${theme === 'dark' ? 'bg-[#C9252C]' : 'bg-stone-300 dark:bg-stone-700'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-1 ${theme === 'dark' ? 'left-6' : 'left-1'}`} />
              </div>
            </button>
          </section>

          {/* Sound */}
          <section className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-100 dark:border-stone-800 space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center shadow-inner">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-stone-800 dark:text-white text-base leading-none">Âm thanh</h2>
                <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mt-1">Sound Settings</p>
              </div>
            </div>

            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="w-full flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-800 group hover:border-purple-300 dark:hover:border-purple-700"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${!isMuted ? 'bg-purple-500/10 text-purple-500' : 'bg-stone-500/10 text-stone-500'}`}>
                  <Volume2 className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-stone-700 dark:text-stone-300 text-sm">Âm báo đơn mới</span>
                  <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">Phát tiếng "Ting Ting"</span>
                </div>
              </div>
              <div className={`w-12 h-7 rounded-full relative ${!isMuted ? 'bg-[#C9252C]' : 'bg-stone-300 dark:bg-stone-700'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-1 ${!isMuted ? 'left-6' : 'left-1'}`} />
              </div>
            </button>
          </section>
        </div>

        {/* Connection Settings - Management Only */}
        {appMode === 'management' && (
          <section className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-100 dark:border-stone-800 space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-xl flex items-center justify-center shadow-inner">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-stone-800 dark:text-white text-base leading-none">Kết nối hệ thống</h2>
                <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mt-1">Connection Settings</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-wider ml-1">Google Apps Script URL</label>
                <div className="relative">
                  <Wifi className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input 
                    type="text" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/..."
                    className={`w-full bg-stone-50 dark:bg-stone-950 border ${urlError ? 'border-red-500' : 'border-stone-200 dark:border-stone-800'} rounded-2xl pl-11 pr-4 py-3 font-mono text-xs font-bold text-stone-800 dark:text-white focus:ring-2 focus:ring-[#C9252C]/20 focus:border-[#C9252C] outline-none`}
                  />
                </div>
                {urlError && <p className="text-[10px] text-red-500 font-bold px-1 mt-1">{urlError}</p>}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="flex-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 py-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isTestingConnection ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                </button>
                <button
                  onClick={handleRestoreDefault}
                  className="px-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-500 py-3 rounded-xl font-bold text-xs hover:bg-stone-100 transition-colors"
                >
                  Mặc định
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Sync Settings - Management Only */}
        {appMode === 'management' && (
          <section className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-100 dark:border-stone-800 space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl flex items-center justify-center shadow-inner">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-stone-800 dark:text-white text-base leading-none">Đồng bộ dữ liệu</h2>
                <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mt-1">Data Sync</p>
              </div>
            </div>

            <div className="p-4 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-sm font-bold text-stone-800 dark:text-white">Tự động đồng bộ</label>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">Cập nhật đơn hàng & thực đơn</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                    className={`w-12 h-7 rounded-full relative ${autoSyncEnabled ? 'bg-[#C9252C]' : 'bg-stone-300 dark:bg-stone-700'}`}
                  >
                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full ${autoSyncEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
              
              {autoSyncEnabled && (
                <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-600 dark:text-stone-400">Chu kỳ làm mới (giây):</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      min="15"
                      value={localRefreshInterval}
                      onChange={(e) => setLocalRefreshInterval(Number(e.target.value))}
                      className="w-16 bg-white dark:bg-stone-900 px-2 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-sm font-black text-[#C9252C] text-center focus:ring-2 focus:ring-[#C9252C]/20 focus:outline-none"
                    />
                  </div>
                </div>
              )}
              {autoSyncEnabled && localRefreshInterval < 15 && (
                <p className="text-xs text-red-500 font-bold mt-2">Thời gian làm mới tối thiểu là 15 giây để tránh lỗi Rate Limit.</p>
              )}
            </div>
          </section>
        )}

        {/* Printer Settings */}
        <section className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-100 dark:border-stone-800 space-y-5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-xl flex items-center justify-center shadow-inner">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-stone-800 dark:text-white text-base leading-none">Máy in & Hóa đơn</h2>
              <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mt-1">Printer Settings</p>
            </div>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => setAutoPrint(!autoPrint)}
              className="w-full flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-800 group hover:border-sky-300 dark:hover:border-sky-700"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${autoPrint ? 'bg-sky-500/10 text-sky-500' : 'bg-stone-500/10 text-stone-500'}`}>
                  <Printer className="w-4 h-4" />
                </div>
                <span className="font-bold text-stone-700 dark:text-stone-300 text-sm">Tự động in hóa đơn</span>
              </div>
              <div className={`w-12 h-7 rounded-full relative ${autoPrint ? 'bg-[#C9252C]' : 'bg-stone-300 dark:bg-stone-700'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-1 ${autoPrint ? 'left-6' : 'left-1'}`} />
              </div>
            </button>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-wider ml-1">IP Máy in LAN/WiFi</label>
              <div className="relative">
                <Wifi className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input 
                  type="text" 
                  value={printerIp}
                  onChange={(e) => setPrinterIp(e.target.value)}
                  placeholder="192.168.1.xxx"
                  className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl pl-11 pr-4 py-3 font-mono text-sm font-bold text-stone-800 dark:text-white focus:ring-2 focus:ring-[#C9252C]/20 focus:border-[#C9252C] outline-none"
                />
              </div>
              <p className="text-[10px] text-stone-400 font-medium px-1 italic mt-1">* Hệ thống hỗ trợ in trực tiếp qua trình duyệt (window.print) tối ưu cho khổ giấy 58mm/80mm.</p>
            </div>
          </div>
        </section>

        {/* AI Settings - Management Only */}
        {appMode === 'management' && (
          <section className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-100 dark:border-stone-800 space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shadow-inner">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-stone-800 dark:text-white text-base leading-none">Trí tuệ nhân tạo</h2>
                <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mt-1">AI Features</p>
              </div>
            </div>

            <button 
              onClick={() => setEnableAI(!enableAI)}
              className="w-full flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-800 group hover:border-emerald-300 dark:hover:border-emerald-700"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${enableAI ? 'bg-emerald-500/10 text-emerald-500' : 'bg-stone-500/10 text-stone-500'}`}>
                  <Database className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-stone-700 dark:text-stone-300 text-sm">Bật AI Model</span>
                  <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">Tự động tạo nội dung cho Giỏ hàng & Lịch sử</span>
                </div>
              </div>
              <div className={`w-12 h-7 rounded-full relative ${enableAI ? 'bg-[#C9252C]' : 'bg-stone-300 dark:bg-stone-700'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-1 ${enableAI ? 'left-6' : 'left-1'}`} />
              </div>
            </button>
          </section>
        )}
          </>
        )}

      </div>

      {/* Save Button */}
      {currentUser && hasChanges && (
        <div 
          className="fixed bottom-24 left-4 right-4 z-50 flex justify-center"
        >
          <button
            onClick={handleSave}
            className="w-full max-w-md bg-stone-900 dark:bg-white text-white dark:text-stone-900 py-4 rounded-2xl font-black text-base shadow-2xl shadow-stone-900/20 dark:shadow-white/10 tap-active flex items-center justify-center gap-2"
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Đã lưu thay đổi
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Lưu cấu hình
              </>
            )}
          </button>
        </div>
      )}

      {/* App Version */}
      <footer className="text-center space-y-1.5 pt-8 pb-4 opacity-50">
        <p className="text-[10px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-[0.2em]">Tiệm Nước Nhỏ • POS System</p>
        <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500">Version 1.5.0 • Build 2026</p>
      </footer>

    </div>
  );
}
