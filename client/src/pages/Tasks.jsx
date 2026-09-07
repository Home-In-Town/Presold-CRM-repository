import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Trash2, Hand, Flag, Check,
  MapPin, Navigation, Image as ImageIcon, Loader2, Star, ListChecks
} from 'lucide-react';
import api, { resolveFileUrl } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const PRIORITY_STYLES = {
  HIGH: 'bg-red-500/10 text-red-300 border-red-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  LOW: 'bg-sky-500/10 text-sky-300 border-sky-500/20'
};

// Predefined task types an admin can assign to an opportunity.
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

// Haversine great-circle distance in kilometres.
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
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[p] || PRIORITY_STYLES.MEDIUM}`}>
      <Flag size={9} /> {p}
    </span>
  );
}

// One opportunity (project) card. The photo/name/priority/location show once;
// its tasks render as a horizontal, scrollable row of individually claimable chips.
function OpportunityCard({ opp, userPos, onClaim, claiming, initiated, canDelete, onDelete }) {
  const dist = useMemo(() => {
    if (!userPos || opp.latitude == null || opp.longitude == null) return null;
    return distanceKm(userPos.lat, userPos.lng, opp.latitude, opp.longitude);
  }, [userPos, opp.latitude, opp.longitude]);

  const tasks = opp.tasks || [];
  const allClaimed = tasks.length > 0 && tasks.every(t => !!t.userId);
  // Name of whoever claimed the project (first claimed task's owner).
  const claimant = tasks.find(t => t.user?.name)?.user?.name || null;

  const locationText = opp.address || null;

  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden">
      {/* Top: photo + project details (mirrors the mobile opportunity card) */}
      <div className="flex gap-3 p-3">
        {/* Photo with "Opportunity" ribbon */}
        <div className="relative w-24 h-24 rounded-xl bg-dark-700/60 flex-shrink-0 overflow-hidden flex items-center justify-center">
          {opp.photoUrl ? (
            <img src={resolveFileUrl(opp.photoUrl)} alt={opp.projectName} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={24} className="text-gray-600" />
          )}
          <span className="absolute top-1 left-0 bg-brand-600 text-white text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-r-md shadow">
            Opportunity
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-base font-bold text-white leading-tight break-words">{opp.projectName}</p>
            {canDelete && (
              <button onClick={() => onDelete(opp.id)} title="Delete project" className="p-1 rounded hover:bg-red-500/10 text-gray-600 hover:text-red-400 flex-shrink-0"><Trash2 size={14} /></button>
            )}
          </div>

          {/* Location line */}
          {locationText && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{locationText}</p>
          )}

          {/* Distance + view location */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5">
            {dist != null ? (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-300">
                <Navigation size={13} /> {formatDistance(dist)}
              </span>
            ) : null}
            {opp.locationLink && (
              <a
                href={opp.locationLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-brand-300 hover:text-brand-200"
              >
                <MapPin size={11} /> View location
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tag row: priority + task chips, horizontally scrollable */}
      <div className="px-3 pb-3">
        <div className="flex gap-2 overflow-x-auto custom-scroll pb-1 -mx-0.5 px-0.5">
          <span className="flex-shrink-0">
            <PriorityBadge priority={opp.priority} />
          </span>
          {tasks.map(t => (
            <span
              key={t.id}
              className="flex-shrink-0 rounded-full border border-white/10 bg-dark-700/50 px-3 py-0.5 text-[11px] text-gray-200 whitespace-nowrap"
            >
              {t.title}
            </span>
          ))}
        </div>
      </div>

      {/* Full-width claim button (claims all tasks in this project at once) */}
      {allClaimed ? (
        <div className="w-full bg-dark-700/60 text-gray-400 text-sm font-semibold py-3 flex items-center justify-center gap-2">
          <Check size={16} className="text-green-400" />
          Claimed{claimant ? ` by ${claimant}` : ''}
        </div>
      ) : (
        <button
          onClick={() => onClaim(opp.id)}
          disabled={claiming}
          className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-sm font-bold py-3 flex items-center justify-center gap-2 transition-colors"
        >
          {claiming ? <Loader2 size={16} className="animate-spin" /> : <Hand size={16} />}
          {claiming ? 'Claiming...' : (tasks.length > 1 ? 'Claim Tasks' : 'Claim Task')}
        </button>
      )}
    </motion.div>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Pool state
  const [tab, setTab] = useState('all'); // 'all' | 'priority' | 'nearby' | 'initiated'
  const [openPool, setOpenPool] = useState([]);
  const [initiatedPool, setInitiatedPool] = useState([]);
  const [claimingId, setClaimingId] = useState(null);

  // User geolocation
  const [userPos, setUserPos] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | locating | ready | denied | unsupported

  // Admin create-to-pool form
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ projectName: '', address: '', priority: 'MEDIUM', locationLink: '' });
  const [selectedTasks, setSelectedTasks] = useState([]); // predefined tasks chosen
  const [customTitle, setCustomTitle] = useState('');      // optional extra custom task
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadPool();
    requestLocation();
  }, []);

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

  // ---- Admin: create pooled opportunity ----
  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const toggleTaskOption = (opt) => {
    setSelectedTasks(prev =>
      prev.includes(opt) ? prev.filter(t => t !== opt) : [...prev, opt]
    );
  };

  const submitPoolTask = async (e) => {
    e.preventDefault();
    if (!form.projectName.trim()) { toast.error('Project / site name is required'); return; }

    const titles = [...selectedTasks];
    if (customTitle.trim()) titles.push(customTitle.trim());
    if (titles.length === 0) { toast.error('Pick at least one task or type a custom one'); return; }

    setSubmitting(true);
    try {
      const hadLink = !!form.locationLink.trim();

      // One request creates the project (opportunity) plus all of its tasks.
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
      setCustomTitle('');
      setPhotoFile(null);
      setPhotoPreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowCreate(false);

      const n = opp.tasks?.length || 0;
      toast.success(n === 1 ? 'Opportunity added to pool' : `Project added with ${n} tasks`);
      if (hadLink && (opp.latitude == null || opp.longitude == null)) {
        toast('Couldn\'t read coordinates from that maps link, so distance won\'t show. Tip: open the location in Google Maps and copy the full URL (it contains "@lat,lng").', { icon: '📍', duration: 7000 });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add opportunity');
    }
    setSubmitting(false);
  };

  // ---- Pool actions ----
  // Claim an entire project (opportunity) — all its tasks go to the user at once.
  const claimProject = async (oppId) => {
    setClaimingId(oppId);
    try {
      await api.post(`/tasks/pool/opportunity/${oppId}/claim`);
      await loadPool();
      toast.success('Project claimed 🙌');
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('Project was already claimed');
        await loadPool();
      } else {
        toast.error('Failed to claim project');
      }
    }
    setClaimingId(null);
  };

  const deleteOpportunity = async (oppId) => {
    try {
      await api.delete(`/tasks/pool/opportunity/${oppId}`);
      setOpenPool(openPool.filter(o => o.id !== oppId));
      setInitiatedPool(initiatedPool.filter(o => o.id !== oppId));
      toast.success('Project deleted');
    } catch { toast.error('Failed to delete'); }
  };

  // ---- Derived lists per tab ----
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
    // 'all' and 'priority' — priority-weighted, then newest.
    return [...open].sort((a, b) =>
      (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1)
    );
  }, [tab, openPool, initiatedPool, userPos]);

  const TABS = [
    { key: 'priority', label: 'Priority Tasks', icon: Star },
    { key: 'nearby', label: 'Nearby Tasks', icon: MapPin },
    { key: 'initiated', label: 'All Initiated', icon: ListChecks }
  ];

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Tasks</h1>
        {isAdmin && (
          <button onClick={() => setShowCreate(v => !v)} className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1.5">
            <Plus size={15} /> New Opportunity
          </button>
        )}
      </div>

      {/* Admin create form */}
      {isAdmin && showCreate && (
        <form onSubmit={submitPoolTask} className="glass-card p-4 space-y-3">
          <p className="text-sm font-semibold text-white">Add opportunity to team pool</p>
          <input
            type="text"
            value={form.projectName}
            onChange={e => setForm({ ...form, projectName: e.target.value })}
            placeholder="Project / site name *"
            className="input-field text-sm w-full"
            required
          />
          <input
            type="text"
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
            placeholder="Address / area (shown on card)"
            className="input-field text-sm w-full"
          />

          {/* Task types — select one or more for this project */}
          <div>
            <p className="text-[11px] font-medium text-gray-400 mb-1.5">
              Tasks <span className="text-gray-600">(select one or more)</span>
              {selectedTasks.length > 0 && <span className="text-brand-300"> · {selectedTasks.length} selected</span>}
            </p>
            <div className="max-h-36 overflow-y-auto rounded-xl border border-white/10 bg-dark-700/30 p-2 space-y-1 custom-scroll">
              {TASK_OPTIONS.map(opt => {
                const selected = selectedTasks.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleTaskOption(opt)}
                    className={`w-full flex items-center gap-2.5 text-left text-sm rounded-lg px-3 py-2 transition-colors ${
                      selected
                        ? 'bg-brand-600/20 text-brand-100 border border-brand-500/40'
                        : 'text-gray-300 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-[5px] flex-shrink-0 flex items-center justify-center border transition-colors ${
                      selected ? 'bg-brand-500 border-brand-500' : 'border-gray-500'
                    }`}>
                      {selected && <Check size={11} className="text-white" strokeWidth={3} />}
                    </span>
                    {opt}
                  </button>
                );
              })}

              {/* Optional custom task */}
              <div className="rounded-lg px-2 py-1.5">
                <input
                  type="text"
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="+ Add a custom task…"
                  className="w-full bg-transparent text-sm text-gray-200 placeholder-gray-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
              className="input-field text-sm sm:w-40"
            >
              <option value="HIGH">High priority</option>
              <option value="MEDIUM">Medium priority</option>
              <option value="LOW">Low priority</option>
            </select>
            <input
              type="url"
              value={form.locationLink}
              onChange={e => setForm({ ...form, locationLink: e.target.value })}
              placeholder="Paste Google Maps location link"
              className="input-field text-sm flex-1"
            />
          </div>

          {/* Photo picker */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-dark-700/40 px-3 py-2 text-xs text-gray-300 hover:bg-dark-700/70"
            >
              <ImageIcon size={14} /> {photoFile ? 'Change photo' : 'Add site photo'}
            </button>
            {photoPreview && (
              <img src={photoPreview} alt="preview" className="w-12 h-12 rounded-lg object-cover" />
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
          </div>

          <p className="text-[10px] text-gray-500 leading-relaxed">
            For distance to show, use a Maps <span className="text-gray-300">location pin</span> link
            (the address/place page, or "Share" &rarr; "Copy link"). Short links like maps.app.goo.gl work too.
            Plain search links without a pin won't have coordinates.
          </p>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={submitting} className="btn-primary px-4 text-sm flex items-center gap-1.5 disabled:opacity-60">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add to pool
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 text-sm text-gray-400 hover:text-gray-200">Cancel</button>
          </div>
        </form>
      )}

      {/* ---------------- Team Task Pool ---------------- */}
      <section className="space-y-3">
        {/* Tabs */}
        <div className="grid grid-cols-3 gap-2">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(active ? 'all' : t.key)}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-[11px] sm:text-xs font-semibold transition-colors ${
                  active
                    ? 'border-brand-500 bg-brand-600/15 text-brand-200'
                    : 'border-white/8 bg-dark-700/40 text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Location / context line */}
        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <span>
            {tab === 'initiated'
              ? `${initiatedPool.length} project${initiatedPool.length === 1 ? '' : 's'} in progress`
              : `${openPool.length} project${openPool.length === 1 ? '' : 's'} available to claim`}
          </span>
          {tab !== 'initiated' && (
            geoStatus === 'ready' ? (
              <span className="inline-flex items-center gap-1 text-green-400"><MapPin size={11} /> Location on</span>
            ) : geoStatus === 'locating' ? (
              <span className="inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Locating…</span>
            ) : (geoStatus === 'denied' || geoStatus === 'unsupported') ? (
              <button onClick={requestLocation} className="inline-flex items-center gap-1 text-brand-300 hover:text-brand-200">
                <MapPin size={11} /> Enable location
              </button>
            ) : null
          )}
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {displayed.length === 0 && (
            <p className="text-xs text-gray-600 py-6 text-center">
              {tab === 'initiated' ? 'No projects in progress yet.' : 'No opportunities available right now.'}
            </p>
          )}
          {displayed.map(opp => (
            <OpportunityCard
              key={opp.id}
              opp={opp}
              userPos={userPos}
              onClaim={claimProject}
              claiming={claimingId === opp.id}
              initiated={tab === 'initiated'}
              canDelete={isAdmin}
              onDelete={deleteOpportunity}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
