/// <reference types="vite/client" />
import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { CheckCircle2, Circle, Settings2, Plus, ArrowLeft, Clock, Calendar, Zap } from 'lucide-react';
import axios from 'axios';
import { format, addMinutes, addHours, addDays, startOfDay, setHours, setMinutes } from 'date-fns';

const API_URL = import.meta.env.DEV ? 'http://localhost:8000' : 'https://telegram-z0dj.onrender.com';

interface Task {
  id: number;
  title: string;
  description: string | null;
  remind_at: string | null;
  is_completed: boolean;
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<'list' | 'create' | 'settings'>('list');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  
  // Custom Time State
  const [remindDate, setRemindDate] = useState<Date | null>(null);
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [customTimeStr, setCustomTimeStr] = useState('12:00');

  const [theme, setTheme] = useState<'liquid-glass' | 'dark' | 'light'>('liquid-glass');
  const [btnColor, setBtnColor] = useState('bg-white/20');

  const userId = WebApp.initDataUnsafe.user?.id || 1080737807;

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as any || 'liquid-glass';
    const savedColor = localStorage.getItem('btnColor') || 'bg-white/20';
    setTheme(savedTheme);
    setBtnColor(savedColor);
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API_URL}/tasks/${userId}`);
      setTasks(res.data);
    } catch (e) {
      console.error("Failed to fetch tasks", e);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      let finalDate = remindDate;
      if (showCustomTime && customTimeStr) {
        const [hours, minutes] = customTimeStr.split(':').map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
          let baseDate = finalDate || new Date();
          finalDate = setMinutes(setHours(baseDate, hours), minutes);
        }
      }

      await axios.post(`${API_URL}/tasks`, {
        user_id: userId,
        title,
        description: desc,
        remind_at: finalDate ? finalDate.toISOString() : null
      });
      setTitle('');
      setDesc('');
      setRemindDate(null);
      setShowCustomTime(false);
      setView('list');
      fetchTasks();
      if (WebApp.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
    } catch (e) {
      console.error("Error creating task", e);
      if (WebApp.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('error');
    }
  };

  const toggleTask = async (id: number) => {
    try {
      await axios.put(`${API_URL}/tasks/${id}/complete`);
      setTasks(tasks.map(t => t.id === id ? { ...t, is_completed: true } : t));
      if (WebApp.HapticFeedback) WebApp.HapticFeedback.impactOccurred('medium');
    } catch (e) {
      console.error("Error completing task", e);
    }
  };

  const saveSetting = (key: string, val: string) => {
    localStorage.setItem(key, val);
    if (key === 'theme') setTheme(val as any);
    if (key === 'btnColor') setBtnColor(val);
  };

  // Styles dynamically computed for liquid glassmorphism
  const isGlass = theme === 'liquid-glass';
  const isDark = theme === 'dark' || isGlass;
  
  const bgMain = isGlass ? 'bg-transparent text-white' 
             : theme === 'dark' ? 'bg-[#000000] text-[#f5f5f5]' 
             : 'bg-[#f5f5f7] text-[#1d1d1f]';

  const cardStyle = isGlass ? 'bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)]' 
                  : theme === 'dark' ? 'bg-[#1c1c1e]' 
                  : 'bg-white shadow-sm';

  return (
    <div className={`min-h-screen relative overflow-hidden font-sans transition-colors duration-500 ${bgMain}`}>
      {/* Liquid Glass Background Elements */}
      {isGlass && (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#0F172A]">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-600/40 blur-[100px] mix-blend-screen animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-blue-500/40 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[40%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-pink-500/30 blur-[90px] mix-blend-screen animate-pulse" style={{ animationDelay: '4s' }} />
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[50px]" />
        </div>
      )}

      <div className="relative z-10 p-5 h-full max-w-md mx-auto flex flex-col">
        {view === 'list' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full">
            <div className="flex justify-between items-center mb-8 pt-2">
              <h1 className="text-4xl font-semibold tracking-tight">Tasks</h1>
              <button onClick={() => setView('settings')} className="p-2 rounded-full active:scale-90 transition-transform">
                <Settings2 className="w-7 h-7 opacity-80" />
              </button>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pb-24 hide-scrollbar">
              {tasks.filter(t => !t.is_completed).length === 0 ? (
                <div className="text-center mt-20 opacity-50 font-medium text-lg">No tasks for today.<br/>You're all clear! ✨</div>
              ) : (
                tasks.filter(t => !t.is_completed).map(task => (
                  <div key={task.id} className={`${cardStyle} rounded-[24px] p-5 flex items-start space-x-4 transition-all`}>
                    <button onClick={() => toggleTask(task.id)} className="mt-0.5 flex-shrink-0 active:scale-90 transition-transform">
                      <Circle className="w-6 h-6 opacity-40 hover:opacity-100 transition-opacity" />
                    </button>
                    <div className="flex-1">
                      <h3 className="font-semibold text-[17px] leading-tight">{task.title}</h3>
                      {task.description && <p className="mt-1.5 text-[15px] opacity-70 leading-snug">{task.description}</p>}
                      {task.remind_at && (
                        <div className="mt-3 flex items-center space-x-1.5 text-[13px] font-medium opacity-80 bg-black/10 dark:bg-white/10 w-max px-2.5 py-1 rounded-full backdrop-blur-md">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{format(new Date(task.remind_at), 'MMM d, HH:mm')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setView('create')}
              className={`fixed bottom-8 right-8 w-16 h-16 ${btnColor} ${isGlass ? 'backdrop-blur-xl border border-white/30 text-white' : 'text-white'} rounded-[24px] flex items-center justify-center shadow-2xl active:scale-90 transition-all`}
            >
              <Plus className="w-8 h-8" />
            </button>
          </div>
        )}

        {view === 'create' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-300 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8 pt-2">
              <button onClick={() => setView('list')} className="active:scale-90 transition-transform opacity-80 flex items-center">
                <ArrowLeft className="w-7 h-7" />
              </button>
              <button onClick={handleCreate} className="font-semibold text-lg opacity-90 active:scale-95 transition-transform">
                Done
              </button>
            </div>

            <div className="space-y-6">
              <div className={`${cardStyle} rounded-[28px] p-6 space-y-5`}>
                <input
                  type="text"
                  placeholder="What needs to be done?"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className={`w-full bg-transparent border-none outline-none text-2xl font-semibold placeholder:opacity-40`}
                  autoFocus
                />
                <div className="h-[1px] w-full bg-gray-500/20" />
                <textarea
                  placeholder="Details (optional)"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className={`w-full bg-transparent border-none outline-none resize-none h-20 text-[17px] placeholder:opacity-40`}
                />
              </div>

              {/* Minimalist Reminder UI */}
              <div className="space-y-3">
                <h3 className="ml-2 text-[13px] font-semibold uppercase tracking-wider opacity-60">Remind me</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => { setRemindDate(addMinutes(new Date(), 15)); setShowCustomTime(false); }}
                    className={`${cardStyle} ${remindDate && Math.abs(remindDate.getTime() - addMinutes(new Date(), 15).getTime()) < 60000 ? 'ring-2 ring-white/50' : ''} rounded-2xl p-4 flex flex-col items-center justify-center space-y-1 active:scale-95 transition-all`}
                  >
                    <Zap className="w-6 h-6 opacity-70" />
                    <span className="text-[14px] font-medium">In 15 mins</span>
                  </button>
                  <button 
                    onClick={() => { setRemindDate(addHours(new Date(), 1)); setShowCustomTime(false); }}
                    className={`${cardStyle} rounded-2xl p-4 flex flex-col items-center justify-center space-y-1 active:scale-95 transition-all`}
                  >
                    <Clock className="w-6 h-6 opacity-70" />
                    <span className="text-[14px] font-medium">In 1 hour</span>
                  </button>
                  <button 
                    onClick={() => { setRemindDate(setHours(startOfDay(addDays(new Date(), 1)), 9)); setShowCustomTime(false); }}
                    className={`${cardStyle} rounded-2xl p-4 flex flex-col items-center justify-center space-y-1 active:scale-95 transition-all`}
                  >
                    <Calendar className="w-6 h-6 opacity-70" />
                    <span className="text-[14px] font-medium">Tomorrow 9 AM</span>
                  </button>
                  <button 
                    onClick={() => { setShowCustomTime(true); setRemindDate(new Date()); }}
                    className={`${cardStyle} rounded-2xl p-4 flex flex-col items-center justify-center space-y-1 active:scale-95 transition-all`}
                  >
                    <Settings2 className="w-6 h-6 opacity-70" />
                    <span className="text-[14px] font-medium">Custom</span>
                  </button>
                </div>
                
                {/* Custom Time Selector */}
                {showCustomTime && (
                  <div className={`mt-4 ${cardStyle} rounded-2xl p-5 flex items-center justify-between animate-in fade-in slide-in-from-top-2`}>
                    <span className="font-medium opacity-80">Select time</span>
                    <input 
                      type="time" 
                      value={customTimeStr}
                      onChange={(e) => setCustomTimeStr(e.target.value)}
                      className={`bg-transparent text-xl font-semibold outline-none ${isDark ? '[color-scheme:dark]' : ''}`}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="animate-in fade-in slide-in-from-left-8 duration-300 flex flex-col h-full">
            <div className="flex items-center mb-8 pt-2">
              <button onClick={() => setView('list')} className="active:scale-90 transition-transform opacity-80 flex items-center">
                <ArrowLeft className="w-7 h-7" />
              </button>
              <h1 className="text-2xl font-semibold ml-auto mr-auto pr-7">Settings</h1>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="ml-2 text-[13px] font-semibold uppercase tracking-wider opacity-60 mb-3">Theme</h3>
                <div className={`${cardStyle} rounded-[24px] overflow-hidden`}>
                  {[
                    { id: 'liquid-glass', name: 'Liquid Glass (Default)' },
                    { id: 'dark', name: 'Solid Dark' },
                    { id: 'light', name: 'Solid Light' }
                  ].map((t, idx, arr) => (
                    <div key={t.id} className="relative">
                      <button
                        onClick={() => saveSetting('theme', t.id)}
                        className={`w-full flex items-center justify-between p-4 px-5 active:bg-black/5 dark:active:bg-white/5 transition-colors`}
                      >
                        <span className="font-medium text-[16px]">{t.name}</span>
                        {theme === t.id && <CheckCircle2 className="w-5 h-5 opacity-80" />}
                      </button>
                      {idx !== arr.length - 1 && <div className="h-[1px] ml-5 bg-gray-500/20" />}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="ml-2 text-[13px] font-semibold uppercase tracking-wider opacity-60 mb-3">Accent Button Style</h3>
                <div className={`${cardStyle} rounded-[24px] p-5 flex justify-around`}>
                  {['bg-white/20', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-black'].map(color => (
                    <button
                      key={color}
                      onClick={() => saveSetting('btnColor', color)}
                      className={`w-12 h-12 rounded-full ${color} ${color === 'bg-white/20' ? 'border border-white/40 backdrop-blur-md' : ''} flex items-center justify-center shadow-lg active:scale-90 transition-transform`}
                    >
                      {btnColor === color && <CheckCircle2 className="w-6 h-6 text-white drop-shadow-md" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
