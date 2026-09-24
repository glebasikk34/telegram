/// <reference types="vite/client" />
import { useState, useEffect, useMemo } from 'react';
import WebApp from '@twa-dev/sdk';
import { CheckCircle2, Circle, Settings2, Plus, ArrowLeft, Clock, Calendar as CalendarIcon, Zap, Globe, Search, Sparkles, Pin, LayoutGrid, ListTodo, Tag } from 'lucide-react';
import axios from 'axios';
import { format, addMinutes, addHours, addDays, startOfDay, setHours, setMinutes, isSameDay, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.DEV ? 'http://localhost:8000' : 'https://telegram-z0dj.onrender.com';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'X-Telegram-Init-Data': WebApp.initData || ''
  }
});

interface Task {
  id: number;
  title: string;
  description: string | null;
  remind_at: string | null;
  is_completed: boolean;
  is_pinned: boolean;
  tags: string | null;
}

const translations = {
  en: {
    tasks: "Tasks",
    notes: "Notes",
    settings: "Settings",
    done: "Done",
    what_needs_done: "What needs to be done?",
    details: "Details (optional)",
    remind_me: "Remind me",
    in_15_m: "In 15 mins",
    in_1_h: "In 1 hour",
    tmrw_9am: "Tomorrow 9 AM",
    custom: "Custom",
    select_time: "Select time",
    theme: "Theme",
    dark_mode: "Dark Mode",
    light_mode: "Light Mode",
    no_tasks: "No tasks for today. ✨",
    no_notes: "No notes yet.",
    lang: "Language",
    english: "English",
    russian: "Russian",
    search: "Search...",
    active: "Active",
    archive: "Archive",
    task_created: "Created successfully!",
    all_tags: "All",
    today: "Today",
    upcoming: "Upcoming"
  },
  ru: {
    tasks: "Задачи",
    notes: "Заметки",
    settings: "Настройки",
    done: "Готово",
    what_needs_done: "Что нужно сделать?",
    details: "Детали (необязательно)",
    remind_me: "Напомнить",
    in_15_m: "Через 15 мин",
    in_1_h: "Через 1 час",
    tmrw_9am: "Завтра в 9:00",
    custom: "Свое время",
    select_time: "Выберите время",
    theme: "Тема оформления",
    dark_mode: "Темная",
    light_mode: "Светлая",
    no_tasks: "Вы свободны! ✨",
    no_notes: "Здесь пока пусто.",
    lang: "Язык",
    english: "Английский",
    russian: "Русский",
    search: "Поиск...",
    active: "Активные",
    archive: "Архив",
    task_created: "Успешно сохранено!",
    all_tags: "Все",
    today: "Сегодня",
    upcoming: "Предстоящие"
  }
};

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<'main' | 'create' | 'settings'>('main');
  const [mainTab, setMainTab] = useState<'notes' | 'tasks'>('notes');
  const [taskTab, setTaskTab] = useState<'active' | 'archive'>('active');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  
  const [remindDate, setRemindDate] = useState<Date | null>(null);
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [customTimeStr, setCustomTimeStr] = useState('12:00');

  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [lang, setLang] = useState<'en'|'ru'>('ru');
  
  const [flyingTask, setFlyingTask] = useState<{title: string, desc: string, id: number} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const userId = WebApp.initDataUnsafe.user?.id ?? 0;
  const t = translations[lang];

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as any || 'light';
    const savedLang = localStorage.getItem('lang') as any || 'ru';
    setTheme(savedTheme);
    setLang(savedLang);
    fetchTasks();
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const fetchTasks = async () => {
    try {
      const res = await api.get(`/tasks/${userId}`);
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Failed to fetch tasks", e);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      if (WebApp.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('error');
      return;
    }
    try {
      let finalDate = remindDate;
      if (showCustomTime && customTimeStr) {
        const [hours, minutes] = customTimeStr.split(':').map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
          let baseDate = finalDate || new Date();
          finalDate = setMinutes(setHours(baseDate, hours), minutes);
        }
      }

      const res = await api.post(`/tasks`, {
        title,
        description: desc,
        remind_at: finalDate ? finalDate.toISOString() : null
      });
      
      setFlyingTask({ title, desc, id: res.data.id });
      setTimeout(() => setFlyingTask(null), 1500);

      setTitle('');
      setDesc('');
      setRemindDate(null);
      setShowCustomTime(false);
      setView('main');
      fetchTasks();
      if (WebApp.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
    } catch (e: any) {
      console.error("Error creating task", e);
      alert("Ошибка сохранения: " + (e.message || "Неизвестная ошибка") + "\nПроверьте API_URL!");
      if (WebApp.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('error');
    }
  };

  const toggleTask = async (id: number) => {
    try {
      const res = await api.put(`/tasks/${id}/complete`);
      setTasks(tasks.map(tsk => tsk.id === id ? { ...tsk, is_completed: res.data.is_completed } : tsk));
      if (WebApp.HapticFeedback) WebApp.HapticFeedback.impactOccurred('medium');
    } catch (e) {
      console.error("Error completing task", e);
    }
  };

  const togglePin = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.put(`/tasks/${id}/pin`);
      setTasks(tasks.map(tsk => tsk.id === id ? { ...tsk, is_pinned: res.data.is_pinned } : tsk));
      if (WebApp.HapticFeedback) WebApp.HapticFeedback.impactOccurred('light');
    } catch (e) {
      console.error("Error pinning task", e);
    }
  };

  const saveSetting = (key: string, val: string) => {
    localStorage.setItem(key, val);
    if (key === 'theme') setTheme(val as any);
    if (key === 'lang') setLang(val as any);
  };

  const isDark = theme === 'dark';
  const bgMain = isDark ? 'bg-[#131314] text-[#e3e3e3]' : 'bg-[#ffffff] text-[#1f1f1f]';
  const cardStyle = isDark ? 'bg-[#1e1f20]' : 'bg-[#f0f4f9]';
  const accentGradient = 'bg-gradient-to-r from-[#4285f4] via-[#9b72cb] to-[#d96570] text-transparent bg-clip-text';
  const btnGradient = 'bg-gradient-to-r from-[#4285f4] via-[#9b72cb] to-[#d96570] text-white';

  const notes = useMemo(() => tasks.filter(t => !t.remind_at), [tasks]);
  const allTasks = useMemo(() => tasks.filter(t => t.remind_at), [tasks]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(n => {
      if (n.tags) n.tags.split(',').forEach(tag => tags.add(tag.trim()));
    });
    return Array.from(tags).sort();
  }, [notes]);

  const filteredNotes = notes.filter(tsk => {
    const matchesSearch = tsk.title.toLowerCase().includes(searchQuery.toLowerCase()) || (tsk.description && tsk.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTag = selectedTag ? tsk.tags?.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  }).sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return b.id - a.id;
  });

  const filteredActiveTasks = allTasks.filter(tsk => !tsk.is_completed).sort((a, b) => new Date(a.remind_at!).getTime() - new Date(b.remind_at!).getTime());
  const filteredArchiveTasks = allTasks.filter(tsk => tsk.is_completed).sort((a, b) => b.id - a.id);

  const renderNoteCard = (task: Task) => (
    <motion.div 
      key={task.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={`${cardStyle} rounded-[20px] p-4 flex flex-col relative h-max`}
    >
      <button onClick={(e) => togglePin(task.id, e)} className="absolute top-3 right-3 opacity-30 hover:opacity-100 transition-opacity">
        <Pin className={`w-4 h-4 ${task.is_pinned ? 'fill-current opacity-100 text-[#9b72cb]' : ''}`} />
      </button>
      <h3 className="font-medium text-[15px] leading-tight pr-6 break-words">{task.title}</h3>
      {task.description && task.description !== task.title && (
        <p className="mt-2 text-[13px] opacity-70 leading-snug break-words line-clamp-5">{task.description}</p>
      )}
      {task.tags && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {task.tags.split(',').map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 opacity-70">
              #{tag.trim()}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );

  return (
    <div className={`min-h-screen relative overflow-hidden font-sans transition-colors duration-500 ${bgMain}`}>
      <div className="relative z-10 p-5 pb-24 h-full max-w-md mx-auto flex flex-col">
        
        <AnimatePresence mode="wait">
          {view === 'main' && (
            <motion.div 
              key="main"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col h-full"
            >
              <div className="flex justify-between items-center mb-5 pt-2">
                <h1 className={`text-3xl font-medium tracking-tight flex items-center gap-2`}>
                  <Sparkles className="w-7 h-7 text-[#9b72cb]" />
                  <span className={accentGradient}>{mainTab === 'notes' ? t.notes : t.tasks}</span>
                </h1>
                <button onClick={() => setView('settings')} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <Settings2 className="w-6 h-6 opacity-70" />
                </button>
              </div>

              {mainTab === 'notes' ? (
                <>
                  <div className={`flex items-center px-4 py-3 mb-4 rounded-full ${cardStyle}`}>
                    <Search className="w-5 h-5 opacity-40 mr-3" />
                    <input
                      type="text"
                      placeholder={t.search}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-transparent border-none outline-none w-full placeholder:opacity-40 text-[15px]"
                    />
                  </div>
                  
                  {allTags.length > 0 && (
                    <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-4 pb-1">
                      <button
                        onClick={() => setSelectedTag(null)}
                        className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all ${!selectedTag ? 'bg-[#e8f0fe] text-[#1967d2] dark:bg-[#3f4a5c] dark:text-[#8ab4f8]' : 'bg-black/5 dark:bg-white/5 opacity-70'}`}
                      >
                        {t.all_tags}
                      </button>
                      {allTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => setSelectedTag(tag)}
                          className={`whitespace-nowrap flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${selectedTag === tag ? 'bg-[#e8f0fe] text-[#1967d2] dark:bg-[#3f4a5c] dark:text-[#8ab4f8]' : 'bg-black/5 dark:bg-white/5 opacity-70'}`}
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto hide-scrollbar pt-1">
                    {filteredNotes.length === 0 ? (
                      <div className="text-center mt-20 opacity-50 font-medium text-[14px]">{t.no_notes}</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 items-start">
                        <div className="flex flex-col gap-3">
                          {filteredNotes.filter((_, i) => i % 2 === 0).map(renderNoteCard)}
                        </div>
                        <div className="flex flex-col gap-3">
                          {filteredNotes.filter((_, i) => i % 2 !== 0).map(renderNoteCard)}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex gap-2 mb-5">
                    <button
                      onClick={() => setTaskTab('active')}
                      className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${taskTab === 'active' ? 'bg-[#e8f0fe] text-[#1967d2] dark:bg-[#3f4a5c] dark:text-[#8ab4f8]' : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'}`}
                    >
                      {t.active}
                    </button>
                    <button
                      onClick={() => setTaskTab('archive')}
                      className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${taskTab === 'archive' ? 'bg-[#e8f0fe] text-[#1967d2] dark:bg-[#3f4a5c] dark:text-[#8ab4f8]' : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'}`}
                    >
                      {t.archive}
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto hide-scrollbar">
                    {taskTab === 'active' ? (
                      filteredActiveTasks.length === 0 ? (
                        <div className="text-center mt-20 opacity-50 font-medium text-[14px]">{t.no_tasks}</div>
                      ) : (
                        <div className="space-y-3">
                          {filteredActiveTasks.map(task => (
                            <motion.div 
                              key={task.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`${cardStyle} rounded-[20px] p-5 flex items-start space-x-4`}
                            >
                              <button onClick={() => toggleTask(task.id)} className="mt-0.5 flex-shrink-0 transition-transform">
                                <Circle className="w-6 h-6 opacity-30 hover:opacity-100 transition-opacity" />
                              </button>
                              <div className="flex-1 pr-2">
                                <h3 className="font-medium text-[15px] leading-tight">{task.title}</h3>
                                <div className="mt-2.5 flex items-center space-x-1.5 text-[12px] font-medium text-[#1967d2] bg-[#e8f0fe] dark:text-[#8ab4f8] dark:bg-[#3f4a5c] w-max px-2.5 py-1 rounded-full">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>
                                    {isSameDay(parseISO(task.remind_at!), new Date()) 
                                      ? `${t.today}, ${format(parseISO(task.remind_at!), 'HH:mm')}`
                                      : format(parseISO(task.remind_at!), 'MMM d, HH:mm')}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="space-y-3">
                        {filteredArchiveTasks.map(task => (
                          <div key={task.id} className={`${cardStyle} rounded-[20px] p-5 flex items-start space-x-4 opacity-60`}>
                            <button onClick={() => toggleTask(task.id)} className="mt-0.5 flex-shrink-0">
                              <CheckCircle2 className="w-6 h-6 text-[#1967d2] dark:text-[#8ab4f8]" />
                            </button>
                            <div className="flex-1 line-through">
                              <h3 className="font-medium text-[15px] leading-tight">{task.title}</h3>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
              
            </motion.div>
          )}

          {view === 'create' && (
            <motion.div 
              key="create"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-8 pt-2">
                <button onClick={() => setView('main')} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <ArrowLeft className="w-6 h-6 opacity-80" />
                </button>
                <button onClick={handleCreate} className={`font-medium text-[15px] px-5 py-2 rounded-full transition-all ${title.trim() ? btnGradient + ' shadow-md shadow-purple-500/20' : cardStyle + ' opacity-50'}`}>
                  {t.done}
                </button>
              </div>

              <div className="space-y-6">
                <div className={`${cardStyle} rounded-[24px] p-6 space-y-4`}>
                  <input
                    type="text"
                    placeholder={t.what_needs_done}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className={`w-full bg-transparent border-none outline-none text-[22px] font-medium placeholder:opacity-40`}
                    autoFocus
                  />
                  <div className="h-[1px] w-full bg-black/5 dark:bg-white/5" />
                  <textarea
                    placeholder={t.details}
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    className={`w-full bg-transparent border-none outline-none resize-none h-20 text-[15px] placeholder:opacity-40`}
                  />
                </div>

                <div className="space-y-3">
                  <h3 className="ml-2 text-[12px] font-medium uppercase tracking-wider opacity-50">{t.remind_me}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => { setRemindDate(addMinutes(new Date(), 15)); setShowCustomTime(false); }}
                      className={`${cardStyle} ${remindDate && Math.abs(remindDate.getTime() - addMinutes(new Date(), 15).getTime()) < 60000 ? 'ring-2 ring-[#4285f4] bg-[#e8f0fe] dark:bg-[#3f4a5c] text-[#1967d2] dark:text-[#8ab4f8]' : ''} rounded-[20px] p-4 flex flex-col items-center justify-center space-y-2 transition-all`}
                    >
                      <Zap className="w-5 h-5 opacity-70" />
                      <span className="text-[13px] font-medium">{t.in_15_m}</span>
                    </button>
                    <button 
                      onClick={() => { setRemindDate(addHours(new Date(), 1)); setShowCustomTime(false); }}
                      className={`${cardStyle} rounded-[20px] p-4 flex flex-col items-center justify-center space-y-2 transition-all`}
                    >
                      <Clock className="w-5 h-5 opacity-70" />
                      <span className="text-[13px] font-medium">{t.in_1_h}</span>
                    </button>
                    <button 
                      onClick={() => { setRemindDate(setHours(startOfDay(addDays(new Date(), 1)), 9)); setShowCustomTime(false); }}
                      className={`${cardStyle} rounded-[20px] p-4 flex flex-col items-center justify-center space-y-2 transition-all`}
                    >
                      <CalendarIcon className="w-5 h-5 opacity-70" />
                      <span className="text-[13px] font-medium">{t.tmrw_9am}</span>
                    </button>
                    <button 
                      onClick={() => { setShowCustomTime(true); setRemindDate(new Date()); }}
                      className={`${cardStyle} rounded-[20px] p-4 flex flex-col items-center justify-center space-y-2 transition-all`}
                    >
                      <Settings2 className="w-5 h-5 opacity-70" />
                      <span className="text-[13px] font-medium">{t.custom}</span>
                    </button>
                  </div>
                  
                  <AnimatePresence>
                    {showCustomTime && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className={`mt-3 ${cardStyle} rounded-[20px] p-5 flex flex-col gap-3`}>
                          <span className="font-medium opacity-80 text-[14px]">{t.select_time}</span>
                          <div className="flex gap-3">
                            <input 
                              type="date" 
                              value={remindDate && !isNaN(remindDate.getTime()) ? format(remindDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
                              onChange={(e) => {
                                const [y, m, d] = e.target.value.split('-');
                                const newD = new Date(Number(y), Number(m)-1, Number(d));
                                const currentH = remindDate && !isNaN(remindDate.getTime()) ? remindDate.getHours() : 12;
                                const currentM = remindDate && !isNaN(remindDate.getTime()) ? remindDate.getMinutes() : 0;
                                setRemindDate(setMinutes(setHours(newD, currentH), currentM));
                              }}
                              className={`flex-1 bg-transparent text-[15px] font-medium outline-none ${isDark ? '[color-scheme:dark]' : ''}`}
                            />
                            <input 
                              type="time" 
                              value={customTimeStr}
                              onChange={(e) => setCustomTimeStr(e.target.value)}
                              className={`bg-transparent text-[15px] font-medium outline-none ${isDark ? '[color-scheme:dark]' : ''}`}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col h-full"
            >
              <div className="flex items-center mb-8 pt-2">
                <button onClick={() => setView('main')} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <ArrowLeft className="w-6 h-6 opacity-80" />
                </button>
                <h1 className="text-xl font-medium ml-auto mr-auto pr-7">{t.settings}</h1>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="ml-2 text-[12px] font-medium uppercase tracking-wider opacity-50 mb-3 flex items-center gap-1.5"><Globe className="w-4 h-4"/> {t.lang}</h3>
                  <div className={`${cardStyle} rounded-[20px] overflow-hidden flex`}>
                    <button onClick={() => saveSetting('lang', 'ru')} className={`flex-1 p-4 font-medium transition-colors ${lang === 'ru' ? 'bg-[#e8f0fe] text-[#1967d2] dark:bg-[#3f4a5c] dark:text-[#8ab4f8]' : ''}`}>{t.russian}</button>
                    <button onClick={() => saveSetting('lang', 'en')} className={`flex-1 p-4 font-medium transition-colors ${lang === 'en' ? 'bg-[#e8f0fe] text-[#1967d2] dark:bg-[#3f4a5c] dark:text-[#8ab4f8]' : ''}`}>{t.english}</button>
                  </div>
                </div>

                <div>
                  <h3 className="ml-2 text-[12px] font-medium uppercase tracking-wider opacity-50 mb-3">{t.theme}</h3>
                  <div className={`${cardStyle} rounded-[20px] overflow-hidden`}>
                    {[
                      { id: 'light', name: t.light_mode },
                      { id: 'dark', name: t.dark_mode }
                    ].map((thm, idx, arr) => (
                      <div key={thm.id} className="relative">
                        <button
                          onClick={() => saveSetting('theme', thm.id)}
                          className={`w-full flex items-center justify-between p-4 px-5 transition-colors ${theme === thm.id ? 'bg-[#e8f0fe]/50 dark:bg-[#3f4a5c]/50' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                        >
                          <span className={`font-medium text-[15px] ${theme === thm.id ? 'text-[#1967d2] dark:text-[#8ab4f8]' : ''}`}>{thm.name}</span>
                          {theme === thm.id && <CheckCircle2 className="w-5 h-5 text-[#1967d2] dark:text-[#8ab4f8]" />}
                        </button>
                        {idx !== arr.length - 1 && <div className="h-[1px] ml-5 bg-black/5 dark:bg-white/5" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
      
      {/* Bottom Navigation */}
      {view === 'main' && (
        <div className={`fixed bottom-0 left-0 right-0 z-40 px-6 py-4 flex justify-between items-center max-w-md mx-auto ${isDark ? 'bg-[#131314]/80' : 'bg-[#ffffff]/80'} backdrop-blur-xl border-t border-black/5 dark:border-white/5`}>
          <button 
            onClick={() => setMainTab('notes')}
            className={`flex flex-col items-center gap-1 transition-colors ${mainTab === 'notes' ? 'text-[#1967d2] dark:text-[#8ab4f8]' : 'opacity-40 hover:opacity-100'}`}
          >
            <LayoutGrid className="w-6 h-6" />
            <span className="text-[10px] font-medium">{t.notes}</span>
          </button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setView('create')}
            className={`w-14 h-14 -mt-8 ${btnGradient} rounded-[20px] flex items-center justify-center shadow-lg shadow-purple-500/20`}
          >
            <Plus className="w-7 h-7" />
          </motion.button>
          
          <button 
            onClick={() => setMainTab('tasks')}
            className={`flex flex-col items-center gap-1 transition-colors ${mainTab === 'tasks' ? 'text-[#1967d2] dark:text-[#8ab4f8]' : 'opacity-40 hover:opacity-100'}`}
          >
            <ListTodo className="w-6 h-6" />
            <span className="text-[10px] font-medium">{t.tasks}</span>
          </button>
        </div>
      )}

      {/* Super smooth flying animation via Framer Motion */}
      <AnimatePresence>
        {flyingTask && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, top: '50%', left: '50%', x: '-50%', y: '-50%' }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              scale: [0.8, 1.05, 1, 0.4],
              top: ['50%', '50%', '50%', '15%'],
              y: ['-50%', '-50%', '-50%', '0%']
            }}
            transition={{ duration: 1.2, times: [0, 0.2, 0.6, 1], ease: "easeInOut" }}
            className={`fixed z-50 w-[85%] max-w-sm rounded-[24px] p-6 flex flex-col items-center justify-center space-y-4 pointer-events-none shadow-2xl ${isDark ? 'bg-[#1e1f20] border border-white/10' : 'bg-white border border-black/5'}`}
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="bg-[#e8f0fe] dark:bg-[#3f4a5c] p-4 rounded-full"
            >
              <CheckCircle2 className="w-12 h-12 text-[#1967d2] dark:text-[#8ab4f8]" />
            </motion.div>
            <div className="text-center">
              <h3 className="font-medium text-lg leading-tight">{flyingTask.title}</h3>
              <p className="text-[14px] mt-1 text-[#1967d2] dark:text-[#8ab4f8] font-medium">{t.task_created}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
