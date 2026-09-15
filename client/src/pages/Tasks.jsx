import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Trash2, Hand, Flag, Check,
  MapPin, Navigation, Image as ImageIcon, Loader2, Star, ListChecks, Search, X
} from 'lucide-react';
import api, { resolveFileUrl } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const PRIORITY_STYLES = {
  HIGH: 'bg-red-500/10 text-red-300 border-red-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  LOW: 'bg-sky-500/10 text-sky-300 border-sky-500/20'
};

const TASK_OPTIONS = [
  'Site visit',
  'Property demo call',
  'Shoot reel / video',
  'Photo shoot',
  'Collect documents',
  'Client meeting',
  'Follow-up visit',
  'Handover / possession',
  'Survey / inspection',
  'Deliver brochure / proposal'
];

const PRIORITY_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 };

function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = d => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km) {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function PriorityBadge({ priority }) {
  const p = (priority || 'MEDIUM').toUpperCase();
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[p] || PRIORITY_STYLES.MEDIUM}`}>
      <Flag size={8} /> {p}
    </span>
  );
}

// Opportunity card — compact mobile-first
function OpportunityCard({ opp, userPos, onClaim, claiming, canDelete, onDelete }) {
  const dist = useMemo(() => {
    if (!userPos || opp.latitude == null || opp.longitude == null) return null;
    return distanceKm(userPos.lat, userPos.lng, opp.latitude, opp.longitude);
  }, [userPos, opp.latitude, opp.longitude]);

  const tasks = opp.tasks || [];
  const allClaimed = tasks.length > 0 && tasks.every(t => !!t.userId);
  const claimant = tasks.find(t => t.user?.name)?.user?.name || null;

  return (
    <div className="glass-card overflow-hidden w-full">
      {/* Header row */}
      <div className="flex gap-2 p-2.5">
        {/* Thumbnail */}
        <div className="relative w-12 h-12 rounded-lg bg-dark-700/60 flex-shrink-0 overflow-hidden flex items-center justify-center">
          {opp.photoUrl
            ? <img src={resolveFileUrl(opp.photoUrl)} alt={opp.projectName} className="w-full h-full object-cover" />
            : <ImageIcon size={16} className="text-gray-600" />}
          <span className={`absolute top-0.5 left-0 text-white text-[6px] font-bold uppercase tracking-wide px-1 py-0.5 rounded-r shadow leading-none ${opp.type === 'lead' ? 'bg-emerald-600' : 'bg-brand-600'}`}>
            {opp.type === 'lead' ? 'Lead' : 'Opp'}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1">
            <p className="text-xs font-bold text-white leading-snug break-words flex-1 min-w-0">{opp.projectName}</p>
            {canDelete && (
              <button onClick={() => onDelete(opp)} className="p-0.5 flex-shrink-0 text-gray-600 hover:text-red-400 mt-0.5">
                <Trash2 size={12} />
              </button>
            )}
          </div>
          {opp.address && <p className="text-[11px] text-gray-400 truncate mt-0.5">{opp.address}</p>}
          <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1 mt-1">
            <PriorityBadge priority={opp.priority} />
            {dist != null && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-brand-300">
                <Navigation size={10} /> {formatDistance(dist)}
              </span>
            )}
            {opp.locationLink && (
              <a href={opp.locationLink} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-[10px] text-brand-300 hover:text-brand-200">
                <MapPin size={10} /> View
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Task chips — scrollable */}
      {tasks.length > 0 && (
        <div className="px-2.5 pb-2 overflow-x-auto custom-scroll">
          <div className="flex gap-1 w-max">
            {tasks.map(t => (
              <span key={t.id}
                className="flex-shrink-0 rounded-full border border-white/10 bg-dark-700/50 px-2 py-0.5 text-[10px] text-gray-200 whitespace-nowrap">
                {t.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {allClaimed ? (
        <div className="w-full bg-dark-700/60 text-gray-400 text-[11px] font-semibold py-2 flex items-center justify-center gap-1.5">
          <Check size={12} className="text-green-400" />
          Claimed{claimant ? ` by ${claimant}` : ''}
        </div>
      ) : (
        <button onClick={() => onClaim(opp)} disabled={claiming}
          className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-xs font-bold py-2.5 flex items-center justify-center gap-1.5 transition-colors">
          {claiming ? <Loader2 size={13} className="animate-spin" /> : <Hand size={13} />}
          {claiming ? 'Claiming…' : tasks.length > 1 ? 'Claim Tasks' : 'Claim Task'}
        </button>
      )}
    </div>
  );
}

// Lead card — compact mobile-first
function LeadCard({ lead, userPos, isAdmin, onAddTasks, onDeleteTask, onClaim, claiming }) {
  const [adding, setAdding] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [savingAdd, setSavingAdd] = useState(false);

  const dist = useMemo(() => {
    if (!userPos || lead.latitude == null || lead.longitude == null) return null;
    return distanceKm(userPos.lat, userPos.lng, lead.latitude, lead.longitude);
  }, [userPos, lead.latitude, lead.longitude]);

  const tasks = lead.tasks || [];
  const claimable = tasks.some(t => !t.userId);
  const allClaimed = tasks.length > 0 && tasks.every(t => !!t.userId);
  const claimant = tasks.find(t => t.user?.name)?.user?.name || null;
  const photoUrl = lead.files?.[0]?.url ? resolveFileUrl(lead.files[0].url) : null;

  const submitAdd = async () => {
    const val = newTask.trim();
    if (!val) return;
    setSavingAdd(true);
    await onAddTasks(lead.id, [val]);
    setNewTask('');
    setSavingAdd(false);
    setAdding(false);
  };

  return (
    <div className="glass-card overflow-hidden w-full">
      {/* Header row */}
      <div className="flex gap-2 p-2.5">
        {/* Avatar */}
        <div className="relative w-12 h-12 rounded-lg bg-dark-700/60 flex-shrink-0 overflow-hidden flex items-center justify-center">
          {photoUrl
            ? <img src={photoUrl} alt={lead.fullName} className="w-full h-full object-cover" />
            : <span className="text-base font-bold text-brand-400/60">{lead.fullName[0]}</span>}
          <span className="absolute top-0.5 left-0 bg-emerald-600 text-white text-[6px] font-bold uppercase tracking-wide px-1 py-0.5 rounded-r shadow leading-none">
            Lead
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white leading-snug break-words">{lead.fullName}</p>
          {(lead.company || lead.location) && (
            <p className="text-[11px] text-gray-400 truncate mt-0.5">
              {[lead.company, lead.location].filter(Boolean).join(' · ')}
            </p>
          )}
          <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1 mt-1">
            <PriorityBadge priority={lead.priority} />
            {dist != null && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-300">
                <Navigation size={10} /> {formatDistance(dist)}
              </span>
            )}
            {lead.locationLink && (
              <a href={lead.locationLink} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-[10px] text-brand-300 hover:text-brand-200">
                <MapPin size={10} /> View
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Task chips + admin controls */}
      <div className="px-2.5 pb-2">
        {tasks.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tasks.map(t => (
              <span key={t.id}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-dark-700/50 px-2 py-0.5 text-[10px] text-gray-200">
                {t.title}
                {isAdmin && (
                  <button onClick={() => onDeleteTask(lead.id, t.id)} className="text-gray-500 hover:text-red-400 flex-shrink-0">
                    <Trash2 size={9} />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}

        {isAdmin && (
          adding ? (
            <div className="flex gap-1.5">
              <input
                autoFocus
                type="text"
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitAdd(); } }}
                placeholder="Task name…"
                className="flex-1 min-w-0 bg-dark-700/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
              />
              <button onClick={submitAdd} disabled={savingAdd || !newTask.trim()}
                className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg flex-shrink-0">
                {savingAdd ? <Loader2 size={11} className="animate-spin" /> : 'Add'}
              </button>
              <button onClick={() => { setAdding(false); setNewTask(''); }}
                className="px-1.5 text-xs text-gray-400 flex-shrink-0">✕</button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 text-[11px] text-brand-300 hover:text-brand-200">
              <Plus size={11} /> Add task
            </button>
          )
        )}
      </div>

      {/* Footer */}
      {tasks.length > 0 && (
        allClaimed ? (
          <div className="w-full bg-dark-700/60 text-gray-400 text-[11px] font-semibold py-2 flex items-center justify-center gap-1.5">
            <Check size={12} className="text-green-400" />
            Claimed{claimant ? ` by ${claimant}` : ''}
          </div>
        ) : (
          <button onClick={() => onClaim(lead.id)} disabled={claiming || !claimable}
            className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-xs font-bold py-2.5 flex items-center justify-center gap-1.5 transition-colors">
            {claiming ? <Loader2 size={13} className="animate-spin" /> : <Hand size={13} />}
            {claiming ? 'Claiming…' : tasks.length > 1 ? 'Claim Tasks' : 'Claim Task'}
          </button>
        )
      )}
    </div>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [tab, setTab] = useState('all');
  const [openPool, setOpenPool] = useState([]);
  const [initiatedPool, setInitiatedPool] = useState([]);
  const [claimingId, setClaimingId] = useState(null);

  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');

  const [userPos, setUserPos] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ projectName: '', address: '', priority: 'MEDIUM', locationLink: '' });
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [customTasks, setCustomTasks] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadPool();
    loadLeads();
    requestLocation();
  }, []);

  useEffect(() => {
    if (tab === 'all') loadLeads();
  }, [tab]);

  const loadLeads = async () => {
    setLeadsLoading(true);
    try {
      const res = await api.get('/tasks/leads');
      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load leads');
    }
    setLeadsLoading(false);
  };

  const resortLeads = (list) => {
    const withState = list.map(l => ({ ...l, hasTasks: (l.tasks?.length || 0) > 0 }));
    return withState.sort((a, b) => {
      if (a.hasTasks !== b.hasTasks) return a.hasTasks ? -1 : 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  };

  const addLeadTasks = async (leadId, titles) => {
    try {
      const res = await api.post(`/tasks/lead/${leadId}`, { titles });
      setLeads(prev => resortLeads(prev.map(l => l.id === leadId ? { ...l, tasks: res.data.tasks } : l)));
      toast.success('Task added to lead');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add task');
    }
  };

  const claimLead = async (leadId) => {
    setClaimingId(leadId);
    try {
      const res = await api.post(`/tasks/lead/${leadId}/claim`);
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, tasks: res.data.tasks } : l));
      loadPool();
      toast.success('Lead claimed 🙌');
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('Lead already claimed');
        loadLeads();
      } else {
        toast.error('Failed to claim lead');
      }
    }
    setClaimingId(null);
  };

  const deleteLeadTask = async (leadId, taskId) => {
    setLeads(prev => resortLeads(prev.map(l =>
      l.id !== leadId ? l : { ...l, tasks: l.tasks.filter(t => t.id !== taskId) }
    )));
    try {
      await api.delete(`/tasks/lead-task/${taskId}`);
    } catch {
      toast.error('Failed to delete task');
      loadLeads();
    }
  };

  const requestLocation = () => {
    if (!('geolocation' in navigator)) { setGeoStatus('unsupported'); return; }
    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('ready');
      },
      () => setGeoStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const loadPool = async () => {
    try {
      const [open, initiated] = await Promise.all([
        api.get('/tasks/pool/open'),
        api.get('/tasks/pool/initiated')
      ]);
      setOpenPool(open.data);
      setInitiatedPool(initiated.data);
    } catch {}
  };

  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const toggleTaskOption = (opt) =>
    setSelectedTasks(prev => prev.includes(opt) ? prev.filter(t => t !== opt) : [...prev, opt]);

  const addCustomTask = () => {
    const val = customInput.trim();
    if (!val) return;
    setCustomTasks(prev => prev.includes(val) ? prev : [...prev, val]);
    setCustomInput('');
  };

  const removeCustomTask = (val) => setCustomTasks(prev => prev.filter(t => t !== val));

  const submitPoolTask = async (e) => {
    e.preventDefault();
    if (!form.projectName.trim()) { toast.error('Project / site name is required'); return; }
    const titles = [...selectedTasks, ...customTasks];
    if (customInput.trim() && !titles.includes(customInput.trim())) titles.push(customInput.trim());
    if (titles.length === 0) { toast.error('Pick at least one task or type a custom one'); return; }

    setSubmitting(true);
    try {
      const hadLink = !!form.locationLink.trim();
      const fd = new FormData();
      fd.append('projectName', form.projectName.trim());
      if (form.address.trim()) fd.append('address', form.address.trim());
      fd.append('titles', JSON.stringify(titles));
      fd.append('priority', form.priority);
      if (form.locationLink.trim()) fd.append('locationLink', form.locationLink.trim());
      if (photoFile) fd.append('photo', photoFile);

      const res = await api.post('/tasks/pool', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const opp = res.data;

      setOpenPool([opp, ...openPool]);
      setForm({ projectName: '', address: '', priority: 'MEDIUM', locationLink: '' });
      setSelectedTasks([]);
      setCustomTasks([]);
      setCustomInput('');
      setPhotoFile(null);
      setPhotoPreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowCreate(false);

      const n = opp.tasks?.length || 0;
      toast.success(n === 1 ? 'Opportunity added to pool' : `Project added with ${n} tasks`);
      if (hadLink && (opp.latitude == null || opp.longitude == null)) {
        toast('Couldn\'t read coordinates from that link — distance won\'t show.', { icon: '📍', duration: 6000 });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add opportunity');
    }
    setSubmitting(false);
  };

  const claimProject = async (card) => {
    setClaimingId(card.id);
    const url = card.type === 'lead'
      ? `/tasks/lead/${card.id}/claim`
      : `/tasks/pool/opportunity/${card.id}/claim`;
    try {
      await api.post(url);
      await Promise.all([loadPool(), loadLeads()]);
      toast.success(card.type === 'lead' ? 'Lead claimed 🙌' : 'Project claimed 🙌');
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('Already claimed');
        await loadPool();
      } else {
        toast.error('Failed to claim');
      }
    }
    setClaimingId(null);
  };

  const deleteCard = async (card) => {
    try {
      if (card.type === 'lead') {
        await Promise.all((card.tasks || []).map(t => api.delete(`/tasks/lead-task/${t.id}`)));
        toast.success('Lead tasks removed');
      } else {
        await api.delete(`/tasks/pool/opportunity/${card.id}`);
        toast.success('Project deleted');
      }
      setOpenPool(openPool.filter(o => o.id !== card.id));
      setInitiatedPool(initiatedPool.filter(o => o.id !== card.id));
      loadLeads();
    } catch { toast.error('Failed to delete'); }
  };

  const withDistance = (list) => list.map(o => {
    const d = (userPos && o.latitude != null && o.longitude != null)
      ? distanceKm(userPos.lat, userPos.lng, o.latitude, o.longitude)
      : null;
    return { ...o, _dist: d };
  });

  const displayed = useMemo(() => {
    if (tab === 'initiated') return initiatedPool;
    const open = withDistance(openPool);
    if (tab === 'nearby') {
      return [...open].sort((a, b) => {
        if (a._dist == null) return 1;
        if (b._dist == null) return -1;
        return a._dist - b._dist;
      });
    }
    return [...open].sort((a, b) =>
      (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1)
    );
  }, [tab, openPool, initiatedPool, userPos]);

  const displayedLeads = useMemo(() => {
    const q = leadSearch.trim().toLowerCase();
    const filtered = q
      ? leads.filter(l => {
          const hay = [l.fullName, l.company, l.location, l.phone, ...(l.tasks || []).map(t => t.title)]
            .filter(Boolean).join(' ').toLowerCase();
          return hay.includes(q);
        })
      : leads;
    const hasTasks = l => (l.tasks?.length || 0) > 0;
    const distOf = l => (userPos && l.latitude != null && l.longitude != null)
      ? distanceKm(userPos.lat, userPos.lng, l.latitude, l.longitude) : Infinity;
    return [...filtered].sort((a, b) => {
      const ha = hasTasks(a), hb = hasTasks(b);
      if (ha !== hb) return ha ? -1 : 1;
      if (userPos) return distOf(a) - distOf(b);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [leads, userPos, leadSearch]);

  const TABS = [
    { key: 'priority', label: 'Priority', icon: Star },
    { key: 'nearby', label: 'Nearby', icon: MapPin },
    { key: 'initiated', label: 'Initiated', icon: ListChecks }
  ];
  const showLeads = tab === 'all';

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3 pb-10">

      {/* Page heading */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-white">Tasks</h1>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(v => !v)}
            className="flex-shrink-0 flex items-center gap-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-colors"
          >
            <Plus size={13} /> New Opportunity
          </button>
        )}
      </div>

      {/* Admin create form */}
      {isAdmin && showCreate && (
        <form onSubmit={submitPoolTask} className="glass-card p-3 space-y-2.5">
          <p className="text-xs font-semibold text-white">Add opportunity to team pool</p>

          <input
            type="text"
            value={form.projectName}
            onChange={e => setForm({ ...form, projectName: e.target.value })}
            placeholder="Project / site name *"
            className="w-full bg-dark-700/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
            required
          />
          <input
            type="text"
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
            placeholder="Address / area"
            className="w-full bg-dark-700/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
          />

          {/* Task options */}
          <div>
            <p className="text-[10px] font-medium text-gray-400 mb-1">
              Tasks (select one or more)
              {(selectedTasks.length + customTasks.length) > 0 && (
                <span className="text-brand-300"> · {selectedTasks.length + customTasks.length} selected</span>
              )}
            </p>
            <div className="max-h-32 overflow-y-auto rounded-xl border border-white/10 bg-dark-700/30 p-1.5 space-y-0.5 custom-scroll">
              {TASK_OPTIONS.map(opt => {
                const selected = selectedTasks.includes(opt);
                return (
                  <button key={opt} type="button" onClick={() => toggleTaskOption(opt)}
                    className={`w-full flex items-center gap-2 text-left text-xs rounded-lg px-2.5 py-1.5 transition-colors ${
                      selected ? 'bg-brand-600/20 text-brand-100 border border-brand-500/40' : 'text-gray-300 hover:bg-white/5 border border-transparent'
                    }`}>
                    <span className={`w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                      selected ? 'bg-brand-500 border-brand-500' : 'border-gray-500'
                    }`}>
                      {selected && <Check size={9} className="text-white" strokeWidth={3} />}
                    </span>
                    {opt}
                  </button>
                );
              })}
              {customTasks.map(ct => (
                <div key={ct} className="w-full flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5 bg-brand-600/20 text-brand-100 border border-brand-500/40">
                  <span className="w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center bg-brand-500 border border-brand-500">
                    <Check size={9} className="text-white" strokeWidth={3} />
                  </span>
                  <span className="flex-1 min-w-0 truncate">{ct}</span>
                  <button type="button" onClick={() => removeCustomTask(ct)}
                    className="text-gray-400 hover:text-red-300 flex-shrink-0"><Trash2 size={10} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 mt-1.5">
              <input
                type="text"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTask(); } }}
                placeholder="Custom task…"
                className="flex-1 min-w-0 bg-dark-700/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
              />
              <button type="button" onClick={addCustomTask} disabled={!customInput.trim()}
                className="flex-shrink-0 flex items-center gap-1 bg-dark-600 hover:bg-dark-500 border border-white/5 text-gray-300 text-xs font-medium px-2.5 py-1.5 rounded-xl disabled:opacity-50">
                <Plus size={12} /> Add
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
              className="flex-1 min-w-0 bg-dark-700/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500/40">
              <option value="HIGH">High priority</option>
              <option value="MEDIUM">Medium priority</option>
              <option value="LOW">Low priority</option>
            </select>
          </div>

          <input
            type="url"
            value={form.locationLink}
            onChange={e => setForm({ ...form, locationLink: e.target.value })}
            placeholder="Google Maps link (optional)"
            className="w-full bg-dark-700/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
          />

          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-dark-700/40 px-2.5 py-1.5 text-[11px] text-gray-300 hover:bg-dark-700/70">
              <ImageIcon size={12} /> {photoFile ? 'Change photo' : 'Add photo'}
            </button>
            {photoPreview && (
              <img src={photoPreview} alt="preview" className="w-10 h-10 rounded-lg object-cover" />
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
          </div>

          <div className="flex gap-2 pt-0.5">
            <button type="submit" disabled={submitting}
              className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-xs font-semibold px-3 py-2 rounded-xl">
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add to pool
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="px-3 text-xs text-gray-400 hover:text-gray-200">Cancel</button>
          </div>
        </form>
      )}

      {/* Task pool section */}
      <section className="space-y-2.5 w-full min-w-0">

        {/* Tabs — flex row, scrollable, no wrapping */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 custom-scroll">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(active ? 'all' : t.key)}
                className={`flex-shrink-0 inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'border-brand-500 bg-brand-600/15 text-brand-200'
                    : 'border-white/8 bg-dark-700/40 text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon size={12} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Context line */}
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span>
            {showLeads
              ? `${leads.length} lead${leads.length === 1 ? '' : 's'}`
              : tab === 'initiated'
              ? `${initiatedPool.length} in progress`
              : `${openPool.length} available`}
          </span>
          {tab !== 'initiated' && (
            geoStatus === 'ready' ? (
              <span className="inline-flex items-center gap-0.5 text-green-400"><MapPin size={10} /> On</span>
            ) : geoStatus === 'locating' ? (
              <span className="inline-flex items-center gap-0.5"><Loader2 size={10} className="animate-spin" /> Locating…</span>
            ) : (geoStatus === 'denied' || geoStatus === 'unsupported') ? (
              <button onClick={requestLocation} className="inline-flex items-center gap-0.5 text-brand-300 hover:text-brand-200">
                <MapPin size={10} /> Enable location
              </button>
            ) : null
          )}
        </div>

        {/* Cards */}
        {showLeads ? (
          <div className="space-y-2">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input
                type="text"
                value={leadSearch}
                onChange={e => setLeadSearch(e.target.value)}
                placeholder="Search leads…"
                className="w-full bg-dark-700/80 border border-white/10 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
              />
              {leadSearch && (
                <button onClick={() => setLeadSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  <X size={13} />
                </button>
              )}
            </div>

            {leadsLoading && displayedLeads.length === 0 && (
              <p className="text-xs text-gray-500 py-6 text-center flex items-center justify-center gap-2">
                <Loader2 size={13} className="animate-spin" /> Loading leads…
              </p>
            )}
            {!leadsLoading && displayedLeads.length === 0 && (
              <p className="text-xs text-gray-600 py-6 text-center">
                {leadSearch ? `No leads match "${leadSearch}".` : 'No leads yet. Add one from the Leads page.'}
              </p>
            )}
            {displayedLeads.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                userPos={userPos}
                isAdmin={isAdmin}
                onAddTasks={addLeadTasks}
                onDeleteTask={deleteLeadTask}
                onClaim={claimLead}
                claiming={claimingId === lead.id}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.length === 0 && (
              <p className="text-xs text-gray-600 py-6 text-center">
                {tab === 'initiated' ? 'No projects in progress yet.' : 'No opportunities available right now.'}
              </p>
            )}
            {displayed.map(opp => (
              <OpportunityCard
                key={`${opp.type || 'opp'}-${opp.id}`}
                opp={opp}
                userPos={userPos}
                onClaim={claimProject}
                claiming={claimingId === opp.id}
                initiated={tab === 'initiated'}
                canDelete={isAdmin}
                onDelete={deleteCard}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
