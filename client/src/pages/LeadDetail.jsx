import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Phone, Building2, MapPin, Upload,
  Check, MessageCircle, FileText, Image, Video, Send,
  ChevronDown, ChevronRight, Camera, Plus, Minus, X, Loader2
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getFileUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
  return `${base}${url}`;
};

function InfoRow({ label, value, children }) {
  if (!value && !children) return null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</span>
      {children || <span className="text-xs text-white font-medium">{value}</span>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [lead, setLead]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [note, setNote]         = useState('');

  // Pipeline stages (dynamic, admin-editable)
  const [stages, setStages]         = useState([]);
  const [addingStage, setAddingStage] = useState(false);
  const [newStageLabel, setNewStageLabel] = useState('');
  const [savingStage, setSavingStage]   = useState(false);

  // Journey (COMMON only, admin add/remove)
  const [journeySteps, setJourneySteps]   = useState([]);
  const [expandedStepId, setExpandedStepId] = useState(null);
  const [addingStep, setAddingStep]         = useState(false);
  const [newStepLabel, setNewStepLabel]     = useState('');
  const [savingStep, setSavingStep]         = useState(false);
  const [resettingJourney, setResettingJourney] = useState(false);

  useEffect(() => {
    loadLead();
    loadStages();
    loadJourney();
  }, [id]);

  // ── Loaders ──────────────────────────────────────────────────────────────
  const loadLead = async () => {
    try {
      const res = await api.get(`/leads/${id}`);
      setLead(res.data);
    } catch {
      toast.error('Lead not found');
      navigate('/leads');
    }
    setLoading(false);
  };

  const loadStages = async () => {
    try {
      const res = await api.get('/settings/pipeline-stages');
      setStages(Array.isArray(res.data) ? res.data : []);
    } catch {}
  };

  const loadJourney = async () => {
    try {
      const [stepsRes, progressRes] = await Promise.all([
        api.get('/journey/steps?category=COMMON'),
        api.get(`/journey/progress/${id}`)
      ]);
      const withProgress = stepsRes.data.map(step => {
        const prog = progressRes.data.find(p => p.stepId === step.id);
        return { ...step, completed: prog?.completed || false };
      });
      setJourneySteps(withProgress);
    } catch {}
  };

  // ── Stage actions ─────────────────────────────────────────────────────────
  const updateStage = async (stageKey) => {
    try {
      const res = await api.put(`/leads/${id}`, { stage: stageKey });
      setLead(res.data.lead);
      if (res.data.xpGain) toast.success(`+${res.data.xpGain} XP — Stage updated!`);
    } catch { toast.error('Update failed'); }
  };

  const addStage = async () => {
    const label = newStageLabel.trim();
    if (!label) return;
    setSavingStage(true);
    try {
      const res = await api.post('/settings/pipeline-stages', { label });
      setStages(res.data);
      setNewStageLabel('');
      setAddingStage(false);
      toast.success(`Stage "${label}" added`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add stage');
    }
    setSavingStage(false);
  };

  const removeStage = async (key) => {
    try {
      const res = await api.delete(`/settings/pipeline-stages/${key}`);
      setStages(res.data);
      toast.success('Stage removed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove stage');
    }
  };

  // ── Journey actions ───────────────────────────────────────────────────────
  const toggleStep = async (stepId) => {
    const step = journeySteps.find(s => s.id === stepId);
    if (!step) return;
    const prevStep = journeySteps.find(s => s.order === step.order - 1);
    if (step.order > 1 && !prevStep?.completed) {
      toast.error(`Complete "${prevStep?.label}" first`);
      return;
    }
    try {
      const res = await api.post('/journey/toggle', { leadId: id, stepId });
      setJourneySteps(prev => prev.map(s => s.id === stepId ? { ...s, completed: res.data.progress.completed } : s));
      if (res.data.xpGain) toast.success(`+${res.data.xpGain} XP ✅`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update step');
    }
  };

  const addStep = async () => {
    const label = newStepLabel.trim();
    if (!label) return;
    setSavingStep(true);
    try {
      await api.post('/journey/steps/add', { label, category: 'COMMON' });
      await loadJourney();
      setNewStepLabel('');
      setAddingStep(false);
      toast.success(`Step "${label}" added`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add step');
    }
    setSavingStep(false);
  };

  const removeStep = async (step) => {
    if (!confirm(`Remove step "${step.label}"? This will delete all progress for this step.`)) return;
    try {
      await api.delete(`/journey/steps/${step.id}`);
      await loadJourney();
      toast.success(`Step "${step.label}" removed`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove step');
    }
  };

  const resetJourneyDefaults = async () => {
    if (!confirm('Reset journey to the 3 default steps (Connect, Reply, Interest)? Extra steps and their progress will be deleted.')) return;
    setResettingJourney(true);
    try {
      await api.post('/journey/steps/reset-defaults');
      await loadJourney();
      toast.success('Journey reset to defaults');
    } catch { toast.error('Reset failed'); }
    setResettingJourney(false);
  };

  // ── Other actions ─────────────────────────────────────────────────────────
  const addNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      await api.post(`/leads/${id}/notes`, { content: note });
      setNote('');
      loadLead();
      toast.success('Note added');
    } catch { toast.error('Failed to add note'); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post(`/uploads/lead/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('File uploaded! 📎');
      loadLead();
    } catch { toast.error('Upload failed'); }
    e.target.value = '';
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!lead) return null;

  const completedCount = journeySteps.filter(s => s.completed).length;
  const progress = Math.round((completedCount / Math.max(journeySteps.length, 1)) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-3 pb-6">
      {/* Back */}
      <button onClick={() => navigate('/leads')} className="btn-ghost flex items-center gap-2 text-sm -ml-3">
        <ArrowLeft size={16} /> Back to Leads
      </button>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center flex-shrink-0">
              <span className="text-base font-bold text-brand-400">{lead.fullName[0]}</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white truncate">{lead.fullName}</h1>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 flex-wrap">
                {lead.company && <span className="flex items-center gap-1"><Building2 size={10} /> {lead.company}</span>}
                {lead.location && <span className="flex items-center gap-1"><MapPin size={10} /> {lead.location}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <a href={`tel:${lead.phone}`} className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5">
              <Phone size={13} /> Call
            </a>
            <a href={`https://wa.me/${lead.phone}`} target="_blank" rel="noreferrer" className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5">
              <MessageCircle size={13} /> WhatsApp
            </a>
          </div>
        </div>
      </motion.div>

      {/* ── Pipeline Stage ── */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Pipeline Stage</h3>
          {isAdmin && (
            <button
              onClick={() => setAddingStage(v => !v)}
              className="text-[11px] text-brand-300 hover:text-brand-200 flex items-center gap-1"
            >
              {addingStage ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Add stage</>}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {stages.map(s => (
            <div key={s.key} className="relative group">
              <button
                onClick={() => updateStage(s.key)}
                className={`text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all active:scale-95 pr-${isAdmin ? '7' : '3'}
                  ${lead.stage === s.key
                    ? 'bg-brand-600 text-white'
                    : 'bg-dark-600 text-gray-400 hover:bg-dark-500 hover:text-white'}`}
              >
                {s.label}
              </button>
              {isAdmin && (
                <button
                  onClick={() => removeStage(s.key)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full hidden group-hover:flex items-center justify-center text-white z-10"
                  title={`Remove ${s.label}`}
                >
                  <X size={9} />
                </button>
              )}
            </div>
          ))}
          {stages.length === 0 && <p className="text-xs text-gray-600">No stages configured.</p>}
        </div>

        {isAdmin && addingStage && (
          <div className="flex gap-2 mt-3">
            <input
              autoFocus
              type="text"
              value={newStageLabel}
              onChange={e => setNewStageLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStage(); } }}
              placeholder="Stage name (e.g. Follow-up)"
              className="input-field text-sm flex-1"
            />
            <button onClick={addStage} disabled={savingStage || !newStageLabel.trim()} className="btn-primary px-3 text-sm disabled:opacity-50">
              {savingStage ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
            </button>
          </div>
        )}
      </div>

      {/* ── Lead Journey ── */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">Lead Journey</h3>
            <span className="text-[11px] text-brand-400 font-medium">{completedCount}/{journeySteps.length} · {progress}%</span>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAddingStep(v => !v)}
                className="text-[11px] text-brand-300 hover:text-brand-200 flex items-center gap-1"
              >
                {addingStep ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Add</>}
              </button>
              {journeySteps.length > 3 && (
                <button
                  onClick={resetJourneyDefaults}
                  disabled={resettingJourney}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  {resettingJourney ? <Loader2 size={12} className="animate-spin" /> : null}
                  Reset
                </button>
              )}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-green-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {journeySteps.length === 0 && (
            <p className="text-xs text-gray-600 py-3 text-center">No steps yet.{isAdmin ? ' Click + to add one.' : ''}</p>
          )}
          {journeySteps.map((step, i) => {
            const prevStep = journeySteps.find(s => s.order === step.order - 1);
            const isLocked = step.order > 1 && !prevStep?.completed;
            const isExpanded = expandedStepId === step.id;

            return (
              <div key={step.id} className={`rounded-xl border transition-all ${
                step.completed ? 'border-green-500/15 bg-green-500/5' :
                isLocked ? 'border-white/5 bg-dark-700/40 opacity-60' :
                'border-white/8 bg-dark-600/30'
              }`}>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none"
                  onClick={() => !isLocked && setExpandedStepId(prev => prev === step.id ? null : step.id)}
                >
                  {/* Toggle circle */}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); if (!isLocked) toggleStep(step.id); }}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      step.completed ? 'bg-green-500 border-green-500' :
                      isLocked ? 'border-gray-700 bg-dark-800 cursor-not-allowed' :
                      'border-brand-400 bg-dark-700 hover:border-brand-300'
                    }`}
                  >
                    {step.completed
                      ? <Check size={11} className="text-white" strokeWidth={3} />
                      : isLocked
                      ? <span className="text-[9px]">🔒</span>
                      : null}
                  </button>
                  <span className="text-[10px] font-bold text-gray-600 w-4">{i + 1}</span>
                  <span className={`text-sm flex-1 font-medium ${
                    step.completed ? 'text-green-400 line-through opacity-70' :
                    isLocked ? 'text-gray-500' : 'text-gray-200'
                  }`}>{step.label}</span>
                  {!isLocked && (
                    <span className="text-gray-500">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); removeStep(step); }}
                      className="w-5 h-5 flex items-center justify-center rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      title={`Remove "${step.label}"`}
                    >
                      <Minus size={10} strokeWidth={3} />
                    </button>
                  )}
                  {isLocked && <span className="text-[9px] text-gray-500 uppercase">Locked</span>}
                </div>

                {/* Expanded: WhatsApp shortcut */}
                {isExpanded && !isLocked && (
                  <div className="border-t border-white/5 px-3 py-2.5 bg-dark-900/30 flex items-center justify-between gap-3">
                    <p className="text-[11px] text-gray-400">
                      {step.description || `Complete the "${step.label}" action for this lead.`}
                    </p>
                    {lead.phone && (
                      <a
                        href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '').replace(/^0+/, '91')}?text=${encodeURIComponent(`Hi ${lead.fullName}, `)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-shrink-0 btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                      >
                        <MessageCircle size={12} /> WhatsApp
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add step input */}
        {isAdmin && addingStep && (
          <div className="flex gap-2 mt-3">
            <input
              autoFocus
              type="text"
              value={newStepLabel}
              onChange={e => setNewStepLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStep(); } }}
              placeholder="Step name (e.g. Site visit)"
              className="input-field text-sm flex-1"
            />
            <button onClick={addStep} disabled={savingStep || !newStepLabel.trim()} className="btn-primary px-3 text-sm disabled:opacity-50">
              {savingStep ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
            </button>
          </div>
        )}
      </div>

      {/* ── Lead Details ── */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Lead Details</h3>
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
            lead.temperature === 'HOT' ? 'bg-red-500/20 text-red-400' :
            lead.temperature === 'WARM' ? 'bg-amber-500/20 text-amber-400' :
            'bg-blue-500/20 text-blue-400'
          }`}>
            {lead.temperature === 'HOT' ? '🔥' : lead.temperature === 'WARM' ? '☀️' : '❄️'} {lead.temperature}
          </span>
        </div>
        <InfoRow label="Phone" value={lead.phone} />
        <InfoRow label="Email" value={lead.email} />
        <InfoRow label="Company" value={lead.company} />
        <InfoRow label="Location" value={lead.location} />
        <InfoRow label="Budget" value={lead.budget} />
        <InfoRow label="Source" value={lead.source?.replace(/_/g, ' ')} />
        <InfoRow label="Priority" value={lead.priority} />
        <InfoRow label="Ads Running">
          <button
            onClick={async () => {
              try {
                await api.put(`/leads/${lead.id}`, { adsRunning: !lead.adsRunning });
                setLead({ ...lead, adsRunning: !lead.adsRunning });
              } catch { toast.error('Failed to update'); }
            }}
            className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
              lead.adsRunning ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {lead.adsRunning ? '● YES' : '○ NO'}
          </button>
        </InfoRow>
        <InfoRow label="Created" value={new Date(lead.createdAt).toLocaleDateString()} />
        {lead.assignedTo && (
          <div className="flex items-center gap-2 pt-2 mt-1">
            <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-brand-400">{lead.assignedTo.name?.[0]}</span>
            </div>
            <p className="text-[11px] text-white">{lead.assignedTo.name} <span className="text-gray-500">· Assigned</span></p>
          </div>
        )}
      </div>

      {/* ── Notes ── */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Notes</h3>
        <form onSubmit={addNote} className="flex gap-2 mb-3">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note..."
            className="input-field text-sm flex-1"
          />
          <button type="submit" className="btn-primary px-3"><Send size={14} /></button>
        </form>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {lead.notes?.map(n => (
            <div key={n.id} className="bg-dark-600/30 rounded-xl px-3 py-2.5">
              <p className="text-xs text-gray-300">{n.content}</p>
              <p className="text-[10px] text-gray-600 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
          ))}
          {!lead.notes?.length && <p className="text-xs text-gray-600 text-center py-2">No notes yet</p>}
        </div>
      </div>

      {/* ── Files ── */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Files</h3>
        {isAdmin && (
          <label className="flex items-center justify-center gap-2 border border-dashed border-white/10 rounded-xl p-4 cursor-pointer hover:border-brand-500/30 mb-3">
            <Upload size={16} className="text-gray-500" />
            <span className="text-xs text-gray-500">Upload file</span>
            <input type="file" className="hidden" onChange={handleFileUpload}
              accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx" />
          </label>
        )}
        {lead.files?.length > 0 && (
          <div className="space-y-2">
            {lead.files.map(f => {
              const url = getFileUrl(f.url);
              return (
                <div key={f.id} className="rounded-xl border border-white/8 bg-dark-700/40 overflow-hidden">
                  {f.type === 'IMAGE' && <img src={url} alt={f.originalName} className="w-full max-h-36 object-cover cursor-pointer" onClick={() => window.open(url, '_blank')} />}
                  {f.type === 'VIDEO' && <video src={url} controls className="w-full max-h-36 bg-black" />}
                  <div className="flex items-center gap-2 px-3 py-2">
                    {f.type === 'IMAGE' ? <Image size={12} className="text-pink-400 flex-shrink-0" /> :
                     f.type === 'VIDEO' ? <Video size={12} className="text-red-400 flex-shrink-0" /> :
                     <FileText size={12} className="text-blue-400 flex-shrink-0" />}
                    <span className="text-[10px] text-gray-400 truncate flex-1">{f.originalName}</span>
                    <a href={url} target="_blank" rel="noreferrer" download={f.originalName}
                      className="text-[9px] px-2 py-0.5 rounded bg-brand-500/15 text-brand-400 hover:bg-brand-500/25">
                      ↓
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!lead.files?.length && !isAdmin && (
          <p className="text-xs text-gray-600 text-center py-4">No files uploaded</p>
        )}
      </div>

      {/* ── Activity Timeline ── */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Activity</h3>
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {lead.activities?.map(a => (
            <div key={a.id} className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] text-gray-300">{a.title}</p>
                <p className="text-[10px] text-gray-600">{new Date(a.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {!lead.activities?.length && <p className="text-xs text-gray-600 text-center py-2">No activities yet</p>}
        </div>
      </div>
    </div>
  );
}
