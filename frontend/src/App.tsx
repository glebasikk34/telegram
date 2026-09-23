/// <reference types="vite/client" />
import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { CheckCircle2, Circle, Settings2, Plus, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';

// ВАЖНО: Замените ссылку ниже на ваш настоящий URL от Render.com (например, 'https://my-bot.onrender.com')
// Иначе кнопки в интерфейсе не будут работать, так как приложение не знает, где находится бэкенд!
const API_URL = 'ВАШ_URL_ОТ_RENDER_ЗДЕСЬ'; 
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
  const [remindAt, setRemindAt] = useState('');

  const [theme, setTheme] = useState<'light' | 'dark' | 'high-contrast'>('light');
  const [fontSize, setFontSize] = useState<'text-sm' | 'text-base' | 'text-lg'>('text-base');
  const [btnColor, setBtnColor] = useState('bg-yellow-500');

  const userId = WebApp.initDataUnsafe.user?.id || 123456789;

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as any || 'light';
    const savedFont = localStorage.getItem('fontSize') as any || 'text-base';
    const savedColor = localStorage.getItem('btnColor') || 'bg-yellow-500';
    setTheme(savedTheme);
    setFontSize(savedFont);
    setBtnColor(savedColor);
    fetchTasks();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'high-contrast');
    root.classList.add(theme);
    if (theme === 'dark' || theme === 'high-contrast') {
       document.documentElement.classList.add('dark');
    } else {
       document.documentElement.classList.remove('dark');
    }
  }, [theme]);

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
      await axios.post(`${API_URL}/tasks`, {
        user_id: userId,
        title,
        description: desc,
        remind_at: remindAt ? new Date(remindAt).toISOString() : null
      });
      setTitle('');
      setDesc('');
      setRemindAt('');
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

  const isDark = theme === 'dark' || theme === 'high-contrast';
  const bgPrimary = theme === 'high-contrast' ? 'bg-black' : isDark ? 'bg-[#1c1c1e]' : 'bg-[#f2f2f7]';
  const bgCard = theme === 'high-contrast' ? 'bg-[#121212] border border-white/20' : isDark ? 'bg-[#2c2c2e]' : 'bg-white';
  const textPrimary = theme === 'high-contrast' ? 'text-white' : isDark ? 'text-[#f5f5f5]' : 'text-black';
  const textSecondary = theme === 'high-contrast' ? 'text-gray-300' : isDark ? 'text-gray-400' : 'text-gray-500';

  const saveSetting = (key: string, val: string) => {
    localStorage.setItem(key, val);
    if (key === 'theme') setTheme(val as any);
    if (key === 'fontSize') setFontSize(val as any);
    if (key === 'btnColor') setBtnColor(val);
  };

  return (
    <div className={`min-h-screen ${bgPrimary} ${textPrimary} ${fontSize} p-4 font-sans transition-all`}>
      {view === 'list' && (
        <div className="max-w-md mx-auto h-full flex flex-col">
          <div className="flex justify-between items-center mb-6 pt-2">
            <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
            <button onClick={() => setView('settings')} className="p-2 rounded-full active:opacity-70">
              <Settings2 className={`w-6 h-6 ${btnColor.replace('bg-', 'text-')}`} />
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto pb-24">
            {tasks.filter(t => !t.is_completed).length === 0 ? (
              <div className={`text-center mt-10 ${textSecondary}`}>No pending tasks.</div>
            ) : (
              tasks.filter(t => !t.is_completed).map(task => (
                <div key={task.id} className={`${bgCard} rounded-2xl p-4 shadow-sm flex items-start space-x-3`}>
                  <button onClick={() => toggleTask(task.id)} className="mt-0.5 flex-shrink-0 active:scale-90 transition-transform">
                    <Circle className={`w-6 h-6 ${textSecondary}`} />
                  </button>
                  <div className="flex-1">
                    <h3 className="font-medium leading-tight">{task.title}</h3>
                    {task.description && <p className={`mt-1 text-sm ${textSecondary}`}>{task.description}</p>}
                    {task.remind_at && (
                      <div className={`mt-2 text-xs font-medium ${btnColor.replace('bg-', 'text-')}`}>
                        ⏰ {format(new Date(task.remind_at), 'MMM d, h:mm a')}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => setView('create')}
            className={`fixed bottom-6 right-6 w-14 h-14 ${btnColor} text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform`}
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>
      )}

      {view === 'create' && (
        <div className="max-w-md mx-auto h-full flex flex-col">
          <div className="flex items-center justify-between mb-6 pt-2">
            <button onClick={() => setView('list')} className={`flex items-center space-x-1 ${btnColor.replace('bg-', 'text-')}`}>
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <button onClick={handleCreate} className={`font-semibold ${btnColor.replace('bg-', 'text-')}`}>
              Done
            </button>
          </div>

          <div className={`${bgCard} rounded-2xl p-4 shadow-sm space-y-4`}>
            <input
              type="text"
              placeholder="Task Title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={`w-full bg-transparent border-none outline-none text-xl font-medium placeholder-gray-400`}
              autoFocus
            />
            <div className={`h-[1px] w-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
            <textarea
              placeholder="Notes..."
              value={desc}
              onChange={e => setDesc(e.target.value)}
              className={`w-full bg-transparent border-none outline-none resize-none h-24 placeholder-gray-400`}
            />
            <div className={`h-[1px] w-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
            <div>
              <label className={`block text-sm font-medium ${textSecondary} mb-2`}>Reminder Date & Time</label>
              <input
                type="datetime-local"
                value={remindAt}
                onChange={e => setRemindAt(e.target.value)}
                className={`w-full bg-transparent outline-none ${isDark ? '[color-scheme:dark]' : ''}`}
              />
            </div>
          </div>
        </div>
      )}

      {view === 'settings' && (
        <div className="max-w-md mx-auto h-full flex flex-col">
          <div className="flex items-center mb-6 pt-2">
            <button onClick={() => setView('list')} className={`flex items-center space-x-1 ${btnColor.replace('bg-', 'text-')}`}>
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <h1 className="text-xl font-bold ml-auto mr-auto pr-8">Settings</h1>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className={`text-sm font-medium ${textSecondary} mb-3 uppercase tracking-wider ml-2`}>Appearance</h3>
              <div className={`${bgCard} rounded-2xl overflow-hidden shadow-sm`}>
                {[
                  { id: 'light', name: 'Light' },
                  { id: 'dark', name: 'Dark' },
                  { id: 'high-contrast', name: 'High Contrast' }
                ].map((t, idx, arr) => (
                  <div key={t.id} className="relative">
                    <button
                      onClick={() => saveSetting('theme', t.id)}
                      className={`w-full flex items-center justify-between p-4 active:bg-gray-100 dark:active:bg-gray-800 transition-colors`}
                    >
                      <span>{t.name}</span>
                      {theme === t.id && <CheckCircle2 className={`w-5 h-5 ${btnColor.replace('bg-', 'text-')}`} />}
                    </button>
                    {idx !== arr.length - 1 && <div className={`h-[1px] ml-4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className={`text-sm font-medium ${textSecondary} mb-3 uppercase tracking-wider ml-2`}>Font Size</h3>
              <div className={`${bgCard} rounded-2xl overflow-hidden shadow-sm`}>
                {[
                  { id: 'text-sm', name: 'Small' },
                  { id: 'text-base', name: 'Medium' },
                  { id: 'text-lg', name: 'Large' }
                ].map((f, idx, arr) => (
                  <div key={f.id} className="relative">
                    <button
                      onClick={() => saveSetting('fontSize', f.id)}
                      className={`w-full flex items-center justify-between p-4 active:bg-gray-100 dark:active:bg-gray-800 transition-colors`}
                    >
                      <span className={f.id}>{f.name}</span>
                      {fontSize === f.id && <CheckCircle2 className={`w-5 h-5 ${btnColor.replace('bg-', 'text-')}`} />}
                    </button>
                    {idx !== arr.length - 1 && <div className={`h-[1px] ml-4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className={`text-sm font-medium ${textSecondary} mb-3 uppercase tracking-wider ml-2`}>Accent Color</h3>
              <div className={`${bgCard} rounded-2xl p-4 shadow-sm flex justify-around`}>
                {['bg-yellow-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500'].map(color => (
                  <button
                    key={color}
                    onClick={() => saveSetting('btnColor', color)}
                    className={`w-10 h-10 rounded-full ${color} flex items-center justify-center border-2 ${btnColor === color ? 'border-black dark:border-white' : 'border-transparent'}`}
                  >
                    {btnColor === color && <CheckCircle2 className="w-6 h-6 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
