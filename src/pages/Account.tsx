import React, { useState } from 'react';
import { useERPStore } from '../store/useERPStore';
import { useAuthStore } from '../store/useAuthStore';
import { LogOut, Save, Wifi, WifiOff, RefreshCw, Cloud, CloudOff, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Account: React.FC = () => {
  const { 
    userName, businessName, updateProfile, clearData,
    dbSyncEnabled, setDbSyncEnabled,
    isOnline, isSyncing, syncToCloud, resetAllData
  } = useERPStore();
  const { signOut, user } = useAuthStore();
  
  const [name, setName] = useState(userName);
  const [company, setCompany] = useState(businessName);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile(name, company);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    clearData();
    await signOut();
  };

  const handleToggleSync = async () => {
    await setDbSyncEnabled(!dbSyncEnabled);
  };

  return (
    <div className="pb-28 bg-brand-bg min-h-screen relative text-text-primary">
      {/* Header */}
      <header className="pt-6 pb-4 px-4 bg-white shadow-sm border-b border-brand-border sticky top-0 z-10">
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Settings</span>
        <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Account</h1>
      </header>

      <div className="px-4 mt-5 space-y-5">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-tr from-primary to-secondary p-5 rounded-[20px] text-white shadow-lg shadow-primary/20 flex items-center space-x-4"
        >
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30 shrink-0">
            <span className="text-xl font-extrabold tracking-widest uppercase">
              {userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate leading-tight">{userName}</h2>
            <p className="text-white/80 text-xs font-medium truncate mt-0.5">{businessName}</p>
            <p className="text-white/60 text-[10px] mt-1 break-all">{user?.email}</p>
          </div>
        </motion.div>

        {/* Edit Profile */}
        <div className="bg-white p-5 rounded-[20px] border border-brand-border shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Profile Details</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-text-secondary mb-1 block uppercase tracking-wider">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full h-11 px-4 border border-brand-border bg-slate-50/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-secondary mb-1 block uppercase tracking-wider">Company / Business Name</label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Enter company name"
                className="w-full h-11 px-4 border border-brand-border bg-slate-50/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-medium"
              />
            </div>
          </div>
          <AnimatePresence>
            {saveSuccess && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-emerald-600 font-bold text-center"
              >
                ✓ Profile saved successfully
              </motion.p>
            )}
          </AnimatePresence>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center space-x-2 active:scale-[0.98] transition-all disabled:opacity-70 cursor-pointer"
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>

        {/* Network & Sync Settings */}
        <div className="bg-white p-5 rounded-[20px] border border-brand-border shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Data & Sync</h3>

          {/* Network Status */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-brand-border">
            <div className="flex items-center space-x-2.5">
              {isOnline
                ? <Wifi size={16} className="text-emerald-500 shrink-0" />
                : <WifiOff size={16} className="text-red-500 shrink-0" />
              }
              <div>
                <p className="text-xs font-bold text-text-primary">Network Status</p>
                <p className={`text-[10px] font-semibold ${isOnline ? 'text-emerald-600' : 'text-red-500'}`}>
                  {isOnline ? 'Connected to Internet' : 'Offline — using local data'}
                </p>
              </div>
            </div>
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
          </div>

          {/* DB Sync Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-brand-border">
            <div className="flex items-center space-x-2.5">
              {dbSyncEnabled
                ? <Cloud size={18} className="text-primary shrink-0" />
                : <CloudOff size={18} className="text-text-secondary shrink-0" />
              }
              <div>
                <p className="text-xs font-bold text-text-primary">Database Sync</p>
                <p className="text-[10px] text-text-secondary font-medium">
                  {dbSyncEnabled
                    ? 'Data syncs to Supabase cloud'
                    : 'Local only — no cloud backup'}
                </p>
              </div>
            </div>
            {/* Toggle Switch */}
            <button
              onClick={handleToggleSync}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 cursor-pointer shrink-0 ${
                dbSyncEnabled ? 'bg-primary' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                  dbSyncEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Manual Sync Button */}
          <button
            onClick={async () => {
              if (!isOnline) {
                setSyncMsg('No internet connection. Connect to sync.');
              } else if (!dbSyncEnabled) {
                setSyncMsg('Enable Database Sync toggle first.');
              } else {
                setSyncMsg('');
                await syncToCloud();
                setSyncMsg('✓ All data synced to cloud!');
              }
              setTimeout(() => setSyncMsg(''), 3000);
            }}
            className="w-full h-11 border border-primary bg-primary/5 text-primary rounded-xl font-bold text-sm flex items-center justify-center space-x-2 active:scale-[0.98] transition-all cursor-pointer"
          >
            <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now to Cloud'}</span>
          </button>
          {syncMsg && (
            <p className={`text-[11px] font-semibold text-center ${syncMsg.startsWith('✓') ? 'text-emerald-600' : 'text-amber-600'}`}>
              {syncMsg}
            </p>
          )}
          <p className="text-[10px] text-text-secondary text-center pb-2">
            App works fully offline. Data is stored locally and optionally synced to cloud when connected.
          </p>

          <hr className="border-brand-border" />

          {/* Delete All Data Button */}
          <button
            onClick={async () => {
              const confirmDelete = window.confirm("⚠️ WARNING: Are you sure you want to delete ALL data? This will completely reset the app and cannot be undone.");
              if (confirmDelete) {
                await resetAllData();
                window.location.reload();
              }
            }}
            className="w-full h-11 bg-red-50 border border-red-200 text-red-600 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 active:scale-[0.98] transition-all cursor-pointer mt-2"
          >
            <Trash2 size={15} />
            <span>Delete All Data & Reset App</span>
          </button>
        </div>

        {/* Contact DIC */}
        <div className="bg-white p-5 rounded-[20px] border border-brand-border shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Contact DIC</h3>
          <p className="text-sm font-semibold text-text-primary">Need help or access support?</p>
          <div className="space-y-2 text-sm text-text-secondary">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-text-secondary">Phone</p>
              <a href="https://wa.me/918760363765" target="_blank" rel="noreferrer noopener" className="text-primary font-semibold hover:underline">
                +91 87603 63765
              </a>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-text-secondary">Email</p>
              <a href="mailto:deskinnovations03@gmail.com" className="text-primary font-semibold hover:underline">
                deskinnovations03@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full h-12 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 active:scale-[0.98] transition-all cursor-pointer"
        >
          <LogOut size={16} />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
};

export default Account;
