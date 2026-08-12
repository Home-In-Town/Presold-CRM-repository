import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Lock, Unlock, Upload, Download, MessageCircle, Image,
  ChevronDown, ChevronUp, Calendar, CheckCircle2, X, Edit, Trash2
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const TOTAL_DAYS = 90;

export default function DayPlan() {
  const [contents, setContents] = useState([]);
  const [completedDays, setCompletedDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState(null);
  const [uploadingDay, setUploadingDay] = useState(null);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', whatsappText: '', file: null, targetRole: 'ALL' });
  const { user } = useAuth();
  const isContentTeam = user?.role === 'CONTENT_CREATION' || user?.role === 'ADMIN';

  useEffect(() => { loadContents(); loadCompletions(); }, []);

  const loadContents = async () => {
    try {
      const res = await api.get('/dayplan');
      setContents(res.data || []);
    } catch {}
    setLoading(false);
  };

  const loadCompletions = async () => {
    try {
      const res = await api.get('/dayplan/completions');
      setCompletedDays(res.data || []);
    } catch {}
  };

  const getContentForDay = (day) => contents.find(c => c.day === day);

  const handleUpload = async (day) => {
    if (!uploadForm.title) return toast.error('Title is required');
    try {
      const fd = new FormData();
      fd.append('title', uploadForm.title);
      fd.append('description', uploadForm.description);
      fd.append('whatsappText', uploadForm.whatsappText);
      fd.append('targetRole', uploadForm.targetRole);
      if (uploadForm.file) fd.append('file', uploadForm.file);
      await api.post(`/dayplan/${day}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Day ${day} content uploaded for ${uploadForm.targetRole === 'ALL' ? 'All Teams' : uploadForm.targetRole.replace('_', ' ')}!`);
      setUploadingDay(null);
      setUploadForm({ title: '', description: '', whatsappText: '', file: null, targetRole: 'ALL' });
      loadContents();
    } catch {
      toast.error('Upload failed');
    }
  };

  const handleDownload = (content) => {
    if (content.imageUrl) {
      const a = document.createElement('a');
      a.href = content.imageUrl;
      a.download = content.imageName || `day-${content.day}.jpg`;
      a.click();
    }
  };

  const handleWhatsApp = (content) => {
    const text = content.whatsappText || `Day ${content.day}: ${content.title}\n\n${content.description || ''}`;
    const imageNote = content.imageUrl ? `\n\n📷 Image: ${window.location.origin}${content.imageUrl}` : '';
    window.open(`https://wa.me/?text=${encodeURIComponent(text + imageNote)}`, '_blank');
  };

  const handleDelete = async (day) => {
    if (!window.confirm(`Delete content for Day ${day}?`)) return;
    try {
      const content = getContentForDay(day);
      const role = content?.targetRole || 'ALL';
      await api.delete(`/dayplan/${day}?targetRole=${role}`);
      setContents(contents.filter(c => !(c.day === day && c.targetRole === role)));
      toast.success(`Day ${day} content deleted`);
    } catch {
      toast.error('Delete failed');
    }
  };

  // Determine unlocked days: a day is unlocked if user completed the previous day (or it's day 1)
  const isDayUnlocked = (day) => {
    if (isContentTeam) return true; // content team can see all days
    if (day === 1) return true;
    return completedDays.includes(day - 1);
  };

  const isDayCompleted = (day) => completedDays.includes(day);

  const markComplete = async (day) => {
    try {
      const res = await api.post(`/dayplan/complete/${day}`);
      if (res.data.completed) {
        setCompletedDays([...completedDays, day]);
        toast.success(`+5 XP — Day ${day} completed!`);
        window.dispatchEvent(new CustomEvent('xp:update', { detail: { xpGain: 5 } }));
      } else {
        setCompletedDays(completedDays.filter(d => d !== day));
        toast.success(`Day ${day} unmarked`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const progress = Math.round((completedDays.length / TOTAL_DAYS) * 100);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={18} className="text-brand-400" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-400">90-Day Sales Plan</span>
            </div>
            <h1 className="text-xl font-bold text-white">90-Day Action Plan</h1>
            <p className="text-sm text-gray-400 mt-1">Daily content and action points to build your sales momentum.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center px-3 py-2 rounded-xl bg-dark-700 border border-white/5">
              <p className="text-xs font-bold text-white">{completedDays.length}/{TOTAL_DAYS}</p>
              <p className="text-[10px] text-gray-500">Days Done</p>
            </div>
            <div className="text-center px-3 py-2 rounded-xl bg-dark-700 border border-white/5">
              <p className="text-xs font-bold text-green-400">{progress}%</p>
              <p className="text-[10px] text-gray-500">Complete</p>
            </div>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.6 }}
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-green-500" />
          </div>
        </div>
      </div>

      {/* Day Cards */}
      <div className="space-y-2">
        {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map(day => {
          const content = getContentForDay(day);
          const isUnlocked = isDayUnlocked(day);
          const isCompleted = isDayCompleted(day);
          const isExpanded = expandedDay === day;
          const isUploading = uploadingDay === day;

          return (
            <div key={day} className={`rounded-xl border transition-all ${isCompleted ? 'border-green-500/20 bg-dark-800/80' : isUnlocked ? 'border-white/10 bg-dark-800' : 'border-white/5 bg-dark-800/50 opacity-60'}`}>
              {/* Day Header */}
              <div
                className={`flex items-center gap-3 px-4 py-3 ${isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                onClick={() => isUnlocked && setExpandedDay(isExpanded ? null : day)}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isCompleted ? 'bg-green-500/20' : isUnlocked ? 'bg-brand-500/20' : 'bg-dark-600'}`}>
                  {isCompleted ? <CheckCircle2 size={14} className="text-green-400" /> : isUnlocked ? <Unlock size={14} className="text-brand-400" /> : <Lock size={14} className="text-gray-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isCompleted ? 'text-white' : isUnlocked ? 'text-gray-300' : 'text-gray-600'}`}>
                    Day {day} {content ? `— ${content.title}` : isUnlocked ? '— Ready' : '— Locked'}
                  </p>
                  {content?.description && <p className="text-[10px] text-gray-500 truncate">{content.description}</p>}
                  {isContentTeam && content?.targetRole && content.targetRole !== 'ALL' && (
                    <span className="text-[9px] text-brand-400 uppercase">{content.targetRole.replace('_', ' ')}</span>
                  )}
                </div>
                {content?.imageUrl && <Image size={14} className="text-green-400 flex-shrink-0" />}
                {isUnlocked && (
                  <span className="text-gray-500">{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                )}
              </div>

              {/* Expanded Content */}
              {isExpanded && isUnlocked && (
                <div className="border-t border-white/5 px-4 py-4 space-y-3">
                  {content ? (
                    <>
                      {/* Show uploaded content */}
                      {content.imageUrl && (
                        <div className="rounded-xl overflow-hidden border border-white/10">
                          <img src={content.imageUrl} alt={content.title} className="w-full max-h-72 object-contain bg-dark-900" />
                        </div>
                      )}
                      {content.description && (
                        <p className="text-sm text-gray-300 leading-relaxed">{content.description}</p>
                      )}
                      {content.whatsappText && (
                        <div className="p-3 rounded-lg bg-dark-700/50 border border-white/5">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Message</p>
                          <p className="text-xs text-gray-300 whitespace-pre-line">{content.whatsappText}</p>
                        </div>
                      )}
                      {/* Action buttons for all users */}
                      <div className="flex gap-2 pt-2">
                        {content.imageUrl && (
                          <button onClick={() => handleDownload(content)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors">
                            <Download size={13} /> Download
                          </button>
                        )}
                        <button onClick={() => handleWhatsApp(content)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors">
                          <MessageCircle size={13} /> Share on WhatsApp
                        </button>
                      </div>
                      {/* Mark as completed button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); markComplete(day); }}
                        className={`w-full mt-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${isCompleted ? 'bg-green-500/20 border border-green-500/30 text-green-400' : 'bg-brand-500 text-white hover:bg-brand-400'}`}
                      >
                        <CheckCircle2 size={14} />
                        {isCompleted ? 'Completed ✓' : 'Mark as Completed (+5 XP)'}
                      </button>
                      {/* Content team can re-upload */}
                      {isContentTeam && (
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => { setUploadingDay(day); setUploadForm({ title: content.title || '', description: content.description || '', whatsappText: content.whatsappText || '', file: null, targetRole: content.targetRole || 'ALL' }); }}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors">
                            <Edit size={13} /> Edit
                          </button>
                          <button onClick={() => handleDelete(day)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors">
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* No content yet */}
                      {isContentTeam ? (
                        <button onClick={() => setUploadingDay(day)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-white/10 hover:border-pink-500/30 hover:bg-pink-500/5 text-gray-500 hover:text-pink-400 transition-all">
                          <Upload size={16} /> Upload content for Day {day}
                        </button>
                      ) : (
                        <p className="text-center text-xs text-gray-500 py-4">Content not yet available. The content team will upload soon.</p>
                      )}
                      {/* Mark as completed even without content */}
                      <button
                        onClick={(e) => { e.stopPropagation(); markComplete(day); }}
                        className={`w-full mt-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${isCompleted ? 'bg-green-500/20 border border-green-500/30 text-green-400' : 'bg-brand-500 text-white hover:bg-brand-400'}`}
                      >
                        <CheckCircle2 size={14} />
                        {isCompleted ? 'Completed ✓' : 'Mark as Completed (+5 XP)'}
                      </button>
                    </>
                  )}

                  {/* Upload Form (content team only) */}
                  {isUploading && isContentTeam && (
                    <div className="mt-3 p-4 rounded-xl bg-dark-900 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">Upload for Day {day}</p>
                        <button onClick={() => setUploadingDay(null)} className="text-gray-500 hover:text-white"><X size={14} /></button>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Target Team</label>
                        <select value={uploadForm.targetRole} onChange={e => setUploadForm({ ...uploadForm, targetRole: e.target.value })}
                          className="input-field text-sm">
                          <option value="ALL">All Teams</option>
                          <option value="SALES_EXECUTIVE">Builder / Developer Team</option>
                          <option value="B2B_SALES">B2B Sales Team</option>
                          <option value="DMA_WHITE_LABEL">DMA White Label Team</option>
                        </select>
                      </div>
                      <input type="text" placeholder="Title *" value={uploadForm.title}
                        onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                        className="input-field text-sm" />
                      <textarea placeholder="Description (optional)" value={uploadForm.description}
                        onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })}
                        className="input-field text-sm" rows={2} />
                      <textarea placeholder="WhatsApp message text (optional)" value={uploadForm.whatsappText}
                        onChange={e => setUploadForm({ ...uploadForm, whatsappText: e.target.value })}
                        className="input-field text-sm" rows={3} />
                      <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/10 cursor-pointer hover:border-pink-500/30 transition-colors">
                        <Image size={14} className="text-pink-400" />
                        <span className="text-xs text-gray-400">{uploadForm.file ? uploadForm.file.name : 'Select photo'}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={e => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })} />
                      </label>
                      <button onClick={() => handleUpload(day)} className="btn-primary w-full text-sm">
                        Upload Day {day} Content
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
