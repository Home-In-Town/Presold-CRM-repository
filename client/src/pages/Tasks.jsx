import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Check, Trash2, Calendar, Sparkles } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const JOURNEY_TASKS = [
  'Confirm lead source and collect contact details',
  'Qualify buyer budget, location, and requirement',
  'Send first intro message or WhatsApp follow-up',
  'Check reply and understand exact property need',
  'Share project video, brochure, or price details',
  'Book a site visit or property demo call',
  'Send reminder for site visit or meeting',
  'Share proposal, pricing, and payment plan',
  'Follow up for decision and close the deal',
  'Ask for referral after successful closure'
];

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    try { const res = await api.get('/tasks'); setTasks(res.data); } catch {}
    setLoading(false);
  };

  const addTask = async (e) => {
    e.preventDefault();
    const taskTitle = title.trim();
    if (!taskTitle) return;
    try {
      const res = await api.post('/tasks', { title: taskTitle });
      setTasks([res.data, ...tasks]);
      setTitle('');
      toast.success('Task added');
    } catch { toast.error('Failed to add task'); }
  };

  const addSuggestedTask = async (taskTitle) => {
    try {
      const res = await api.post('/tasks', { title: taskTitle });
      setTasks([res.data, ...tasks]);
      toast.success('Suggested task added');
    } catch {
      toast.error('Failed to add suggested task');
    }
  };

  const toggleTask = async (id, completed) => {
    try {
      const res = await api.put(`/tasks/${id}`, { completed: !completed });
      const xpGain = Number(res.data?.xpGain || 0);
      setTasks(tasks.map(t => t.id === id ? { ...t, completed: !completed, completedAt: res.data.completedAt || t.completedAt } : t));
      if (xpGain > 0) {
        toast.success(`+${xpGain} XP — Task completed! ✅`);
        window.dispatchEvent(new CustomEvent('xp:update', { detail: { xpGain } }));
      }
    } catch {}
  };

  const deleteTask = async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(tasks.filter(t => t.id !== id));
    } catch {}
  };

  const pending = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white">Tasks</h1>

      <form onSubmit={addTask} className="flex gap-2">
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Add a task..." className="input-field text-sm flex-1" />
        <button type="submit" className="btn-primary px-4"><Plus size={16} /></button>
      </form>

      <div className="glass-card p-3">
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles size={13} className="text-brand-400" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Suggested by lead journey</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {JOURNEY_TASKS.map(task => (
            <button
              key={task}
              type="button"
              onClick={() => addSuggestedTask(task)}
              className="rounded-full border border-brand-500/20 bg-brand-600/5 px-2.5 py-1.5 text-[11px] text-brand-200 hover:bg-brand-600/10 transition-colors"
            >
              {task}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {pending.map(task => (
          <motion.div key={task.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-3.5 flex items-center gap-3">
            <button onClick={() => toggleTask(task.id, task.completed)} className="w-5 h-5 rounded-full border-2 border-gray-600 hover:border-brand-500 flex-shrink-0 transition-colors" />
            <span className="text-sm text-gray-300 flex-1">{task.title}</span>
            <button onClick={() => deleteTask(task.id)} className="p-1 rounded hover:bg-red-500/10 text-gray-600 hover:text-red-400"><Trash2 size={13} /></button>
          </motion.div>
        ))}
      </div>

      {completed.length > 0 && (
        <div>
          <p className="text-xs text-gray-600 mb-2">Completed ({completed.length})</p>
          <div className="space-y-1.5">
            {completed.map(task => (
              <div key={task.id} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-dark-700/30">
                <button onClick={() => toggleTask(task.id, task.completed)} className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0"><Check size={10} className="text-white" strokeWidth={3} /></button>
                <span className="text-sm text-gray-500 line-through flex-1">{task.title}</span>
                <button onClick={() => deleteTask(task.id)} className="p-1 rounded hover:bg-red-500/10 text-gray-600 hover:text-red-400"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
