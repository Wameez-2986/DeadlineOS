'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  User, Bell, Shield, Sliders, Calendar, MessageSquare, 
  Key, Save, CheckCircle2, ChevronRight, Settings
} from 'lucide-react';

export default function SettingsView() {
  const { user } = useAuth();
  
  // Settings States
  const [profileName, setProfileName] = useState(user?.displayName || 'Chief of Staff');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackAlerts, setSlackAlerts] = useState(false);
  const [googleCalendarSync, setGoogleCalendarSync] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setSuccess(false);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 1000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 no-scrollbar space-y-6 max-w-4xl">
      
      {/* ── HEADER ──────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Settings</h1>
          <p className="text-sm text-slate-500">Configure your personal workspace and alert integrations.</p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={loading}
          className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
        >
          {loading ? 'Saving...' : success ? <><CheckCircle2 size={13} /> Saved</> : <><Save size={13} /> Save Settings</>}
        </button>
      </div>

      {/* ── SETTINGS PANELS ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Navigation Sidebar inside Settings */}
        <div className="md:col-span-1 space-y-1 bg-white/40 border border-slate-200/50 rounded-2xl p-3 h-fit">
          <button className="flex items-center justify-between w-full px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50/50 border border-indigo-100 rounded-xl cursor-pointer">
            <span className="flex items-center gap-2"><User size={13} /> Profile Settings</span>
            <ChevronRight size={12} />
          </button>
          <button className="flex items-center justify-between w-full px-3 py-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50/50 rounded-xl cursor-pointer">
            <span className="flex items-center gap-2"><Bell size={13} /> Notifications</span>
            <ChevronRight size={12} />
          </button>
          <button className="flex items-center justify-between w-full px-3 py-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50/50 rounded-xl cursor-pointer">
            <span className="flex items-center gap-2"><Settings size={13} /> Integrations</span>
            <ChevronRight size={12} />
          </button>
        </div>

        {/* Content Pane */}
        <div className="md:col-span-2 space-y-6">
          
          {/* PROFILE SECTION */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <User size={15} className="text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Account Details</h3>
            </div>
            
            <div className="flex items-center gap-4">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
                style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
              >
                {(user?.displayName?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{user?.displayName || 'Chief of Staff'}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="label-luxury block">Display Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Chief of Staff"
                className="glass-input w-full px-4 py-2.5 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* INTEGRATIONS SECTION */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Settings size={15} className="text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Workspace Sync</h3>
            </div>

            <div className="space-y-3.5">
              {/* Google Calendar */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="p-2 rounded-xl bg-blue-50 text-blue-600 mt-0.5">
                    <Calendar size={15} />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Google Calendar</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Auto-synchronize deadline events directly to your calendar.</p>
                  </div>
                </div>
                <button
                  onClick={() => setGoogleCalendarSync(!googleCalendarSync)}
                  className={`w-10 h-5 rounded-full flex items-center p-0.5 transition-all cursor-pointer ${
                    googleCalendarSync ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>

              {/* Slack Notifications */}
              <div className="flex items-center justify-between gap-4 pt-3.5 border-t border-slate-100">
                <div className="flex items-start gap-3">
                  <span className="p-2 rounded-xl bg-rose-50 text-rose-500 mt-0.5">
                    <MessageSquare size={15} />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Slack Slackbot</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Push urgency warnings and milestone progress directly to Slack channels.</p>
                  </div>
                </div>
                <button
                  onClick={() => setSlackAlerts(!slackAlerts)}
                  className={`w-10 h-5 rounded-full flex items-center p-0.5 transition-all cursor-pointer ${
                    slackAlerts ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>
            </div>
          </div>

          {/* SECURITY & API KEYS */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Key size={15} className="text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">AI Platform Keys</h3>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center mb-1">
                <label className="label-luxury block">Gemini API Key</label>
                <span className="text-[9px] text-green-500 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-150">Active (.env)</span>
              </div>
              <input
                type="password"
                value="••••••••••••••••••••••••••••••••••••••••"
                disabled
                className="glass-input w-full px-4 py-2.5 text-xs text-slate-400 bg-slate-50 cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400 leading-normal mt-1">
                The Gemini Developer API key is currently served by the server environment variables. This enables milestone roadmaps and advisory chats for your workspace.
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
