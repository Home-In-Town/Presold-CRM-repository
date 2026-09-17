import { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, Trash2, Hand, Flag, Check, MapPin, Navigation,
  Image as ImageIcon, Loader2, Star, ListChecks, Search, X,
  Phone, Mail, Building2, ChevronRight, ArrowLeft,
  ExternalLink, Users, Briefcase, UserCircle2, CheckCircle2
} from 'lucide-react';
import api, { resolveFileUrl } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PRIORITY_STYLES = {
  HIGH:   'bg-red-500/10 text-red-300 border-red-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  LOW:    'bg-sky-500/10 text-sky-300 border-sky-500/20',
};

const PRIORITY_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 };

// Keep in sync with server TASK_TEAMS constant
const TEAM_OPTIONS = [
  { value: 'ALL',           label: 'All Teams',    short: 'All',     color: 'bg-gray-500/15 text-gray-300 border-gray-500/25'    },
  { value: 'SALES_TEAM',   label: 'Sales Team',   short: 'Sales',   color: 'bg-brand-500/15 text-brand-300 border-brand-500/25'  },
  { value: 'B2B_SALES',    label: 'B2B Sales',    short: 'B2B',     color: 'bg-violet-500/15 text-violet-300 border-violet-500/25'},
  { value: 'CONTENT_TEAM', label: 'Content Team', short: 'Content', color: 'bg-pink-500/15 text-pink-300 border-pink-500/25'     },
  { value: 'DMA_TEAM',     label: 'DMA Team',     short: 'DMA',     color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'},
];
const TEAM_META = Object.fromEntries(TEAM_OPTIONS.map(t => [t.value, t]));

// Map a user's account role to a functional team, so we can show the team even
// when the admin hasn't explicitly set a `functionalTeam`.
const ROLE_TO_TEAM = {
  SALES_EXECUTIVE: 'SALES_TEAM',
  B2B_SALES:       'B2B_SALES',
  CONTENT_CREATION:'CONTENT_TEAM',
  DMA_WHITE_LABEL: 'DMA_TEAM',
};

function teamLabel(val) {
  return TEAM_META[val]?.label || val || 'Unknown';
}

// Resolve which team to display for a claimed task.
// Priority: explicit functionalTeam → derived from user role → task's team.
function resolveClaimerTeam(claimer, taskTeam) {
  const ft = claimer?.functionalTeam;
  if (ft && ft !== 'ALL' && TEAM_META[ft]) return TEAM_META[ft];

  const fromRole = ROLE_TO_TEAM[claimer?.role];
  if (fromRole && TEAM_META[fromRole]) return TEAM_META[fromRole];

  if (taskTeam && taskTeam !== 'ALL' && TEAM_META[taskTeam]) return TEAM_META[taskTeam];
  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371, toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function formatDistance(km) {
  if (km == null) return null;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

// Can this user claim a task with the given taskTeam?
function canClaimTask(userFunctionalTeam, userRole, taskTeam) {
  if (userRole === 'ADMIN') return true;
  const ft = userFunctionalTeam || 'ALL';
  if (ft === 'ALL') return true;
  return !taskTeam || taskTeam === 'ALL' || taskTeam === ft;
}

// ---------------------------------------------------------------------------
// Small shared UI
// ---------------------------------------------------------------------------
function PriorityBadge({ priority }) {
  const p = (priority || 'MEDIUM').toUpperCase();
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[p] || PRIORITY_STYLES.MEDIUM}`}>
      <Flag size={8} />{p}
    </span>
  );
}

function TeamBadge({ taskTeam, className = '' }) {
  const meta = TEAM_META[taskTeam];
  if (!meta || taskTeam === 'ALL') return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${meta.color} ${className}`}>
      <Users size={8} />{meta.short}
    </span>
  );
}

function TeamSelect({ value, onChange, className = '' }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`bg-dark-700/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500/40 ${className}`}>
      {TEAM_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
    </select>
  );
}

// Avatar circle
function Avatar({ user, size = 5 }) {
  const cls = `w-${size} h-${size} rounded-full object-cover flex-shrink-0`;
  if (user?.avatar) return <img src={resolveFileUrl(user.avatar)} alt={user.name} className={cls} />;
  return (
    <div className={`${cls} bg-brand-600/40 flex items-center justify-center text-[9px] font-bold text-brand-300`}>
      {(user?.name || '?')[0]}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Claimed Tasks View
// Shows all claimed tasks grouped by lead / opportunity.
// Each task shows: title, team badge, claimed-by with avatar + team name.
// ---------------------------------------------------------------------------
function ClaimedTasksView() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get('/tasks/pool/claimed/all')
      .then(r => { if (!cancelled) { setData(r.data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Group lead tasks by leadId
  const leadGroups = useMemo(() => {
    if (!data?.leadTasks) return [];
    const map = {};
    data.leadTasks.forEach(t => {
      const key = t.leadId;
      if (!map[key]) map[key] = { lead: t.lead, tasks: [] };
      map[key].tasks.push(t);
    });
    return Object.values(map);
  }, [data]);

  // Group opp tasks by opportunityId
  const oppGroups = useMemo(() => {
    if (!data?.oppTasks) return [];
    const map = {};
    data.oppTasks.forEach(t => {
      const key = t.opportunityId;
      if (!map[key]) map[key] = { opp: t.opportunity, tasks: [] };
      map[key].tasks.push(t);
    });
    return Object.values(map);
  }, [data]);

  const q = search.trim().toLowerCase();

  const filteredLeadGroups = useMemo(() => {
    if (!q) return leadGroups;
    return leadGroups.map(g => ({
      ...g,
      tasks: g.tasks.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.user?.name?.toLowerCase().includes(q) ||
        g.lead?.fullName?.toLowerCase().includes(q)
      )
    })).filter(g => g.tasks.length > 0);
  }, [leadGroups, q]);

  const filteredOppGroups = useMemo(() => {
    if (!q) return oppGroups;
    return oppGroups.map(g => ({
      ...g,
      tasks: g.tasks.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.user?.name?.toLowerCase().includes(q) ||
        g.opp?.projectName?.toLowerCase().includes(q)
      )
    })).filter(g => g.tasks.length > 0);
  }, [oppGroups, q]);

  const totalClaimed = (data?.leadTasks?.length || 0) + (data?.oppTasks?.length || 0);

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by task, lead or user…"
          className="w-full bg-dark-700/80 border border-white/10 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500/40" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            <X size={13} />
          </button>
        )}
      </div>

      {loading && (
        <p className="text-xs text-gray-500 py-6 text-center flex items-center justify-center gap-2">
          <Loader2 size={13} className="animate-spin" />Loading claimed tasks…
        </p>
      )}

      {!loading && totalClaimed === 0 && (
        <p className="text-xs text-gray-600 py-8 text-center">No tasks have been claimed yet.</p>
      )}

      {/* Lead groups */}
      {filteredLeadGroups.map(g => (
        <ClaimedGroup
          key={g.lead?.id}
          title={g.lead?.fullName || 'Lead'}
          subtitle={[g.lead?.company, g.lead?.location].filter(Boolean).join(' · ')}
          photoUrl={g.lead?.files?.[0]?.url ? resolveFileUrl(g.lead.files[0].url) : null}
          initial={g.lead?.fullName?.[0]}
          badge="Lead"
          badgeColor="bg-emerald-600"
          tasks={g.tasks}
        />
      ))}

      {/* Opportunity groups */}
      {filteredOppGroups.map(g => (
        <ClaimedGroup
          key={g.opp?.id}
          title={g.opp?.projectName || 'Opportunity'}
          subtitle={g.opp?.address}
          photoUrl={g.opp?.photoUrl ? resolveFileUrl(g.opp.photoUrl) : null}
          initial={g.opp?.projectName?.[0]}
          badge="Opp"
          badgeColor="bg-brand-600"
          tasks={g.tasks}
        />
      ))}
    </div>
  );
}

function ClaimedGroup({ title, subtitle, photoUrl, initial, badge, badgeColor, tasks }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="glass-card overflow-hidden w-full">
      {/* Header */}
      <button className="w-full flex items-center gap-2 p-2.5 text-left" onClick={() => setOpen(v => !v)}>
        <div className="relative w-10 h-10 rounded-lg bg-dark-700/60 flex-shrink-0 overflow-hidden flex items-center justify-center">
          {photoUrl
            ? <img src={photoUrl} alt={title} className="w-full h-full object-cover" />
            : <span className="text-sm font-bold text-brand-400/60">{initial}</span>}
          <span className={`absolute top-0.5 left-0 ${badgeColor} text-white text-[6px] font-bold uppercase tracking-wide px-1 py-0.5 rounded-r shadow leading-none`}>
            {badge}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">{title}</p>
          {subtitle && <p className="text-[11px] text-gray-400 truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-gray-500">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
          <ChevronRight size={13} className={`text-gray-600 transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {/* Task rows */}
      {open && (
        <div className="border-t border-white/8 divide-y divide-white/5">
          {tasks.map(t => {
            const claimer = t.user;
            // Resolve team: explicit functionalTeam → derived from role → task team
            const teamMt = resolveClaimerTeam(claimer, t.taskTeam);
            const teamTextColor = teamMt ? teamMt.color.split(' ').find(c => c.startsWith('text-')) : 'text-gray-500';
            return (
              <div key={t.id} className="flex items-center gap-2.5 px-3 py-2.5">
                {/* Task status dot */}
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.completed ? 'bg-green-400' : 'bg-amber-400'}`} />

                {/* Title + task team badge */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium leading-snug ${t.completed === true ? 'line-through text-gray-500' : 'text-white'}`}>
                    {t.title}
                  </p>
                  {t.taskTeam && t.taskTeam !== 'ALL' && (
                    <TeamBadge taskTeam={t.taskTeam} className="mt-0.5" />
                  )}
                </div>

                {/* Claimed by — user name + team name */}
                {claimer && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Avatar user={claimer} size={5} />
                    <div className="text-right leading-tight">
                      <p className="text-[10px] text-white font-medium leading-none">{claimer.name}</p>
                      <p className={`text-[9px] font-semibold leading-none mt-0.5 ${teamMt ? teamTextColor : 'text-gray-500'}`}>
                        {teamMt ? teamMt.label : 'All Teams'}
                      </p>
                    </div>
                    {t.completed && <Check size={11} className="text-green-400" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lead Detail Modal
// ---------------------------------------------------------------------------
function LeadDetailModal({ lead, onClose, isAdmin, currentUser, onAddTasks, onDeleteTask, onClaim, onClaimSelected, claiming }) {
  const [detail, setDetail]         = useState(null);
  const [loadingDetail, setLoading] = useState(true);
  const [adding, setAdding]         = useState(false);
  const [newTitle, setNewTitle]     = useState('');
  const [newTeam, setNewTeam]       = useState('ALL');
  const [savingAdd, setSavingAdd]   = useState(false);

  // Per-task selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [claimingSelected, setClaimingSelected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get(`/leads/${lead.id}`)
      .then(r => { if (!cancelled) { setDetail(r.data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lead.id]);

  // Reset selections whenever tasks change (e.g. after a claim)
  useEffect(() => { setSelectedIds(new Set()); }, [lead.tasks]);

  const tasks   = lead.tasks || [];
  const ft      = currentUser?.functionalTeam || 'ALL';

  // Tasks this user can still claim (unclaimed + matches their team)
  const claimableTasks = tasks.filter(t =>
    !t.userId && canClaimTask(ft, currentUser?.role, t.taskTeam)
  );
  const hasClaimable = claimableTasks.length > 0;
  const allSelected  = claimableTasks.length > 0 && claimableTasks.every(t => selectedIds.has(t.id));

  const toggleTask = (id) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelectedIds(allSelected
      ? new Set()
      : new Set(claimableTasks.map(t => t.id))
    );

  const handleClaimSelected = async () => {
    if (selectedIds.size === 0) return;
    setClaimingSelected(true);
    await onClaimSelected(lead.id, [...selectedIds]);
    setClaimingSelected(false);
    onClose();
  };

  const submitAdd = async () => {
    const val = newTitle.trim();
    if (!val) return;
    setSavingAdd(true);
    await onAddTasks(lead.id, [{ title: val, taskTeam: newTeam }]);
    setNewTitle(''); setNewTeam('ALL');
    setSavingAdd(false); setAdding(false);
  };

  const TEMP_COLOR = { HOT: 'text-red-400', WARM: 'text-amber-400', COLD: 'text-sky-400' };

  return (
    <AnimatePresence>
      <motion.div key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70" onClick={onClose} />
      <motion.div key="sheet"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-dark-800 rounded-t-2xl border-t border-white/8 shadow-2xl"
        style={{ maxHeight: '92dvh' }} onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-2.5 px-3 pb-2.5 flex-shrink-0 border-b border-white/8">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors flex-shrink-0">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{lead.fullName}</p>
            {(lead.company || lead.location) && (
              <p className="text-[11px] text-gray-400 truncate">{[lead.company, lead.location].filter(Boolean).join(' · ')}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <PriorityBadge priority={lead.priority} />
            {lead.temperature && (
              <span className={`text-[10px] font-bold ${TEMP_COLOR[lead.temperature] || 'text-gray-400'}`}>{lead.temperature}</span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 custom-scroll">

          {/* Contact grid */}
          <div className="p-3 grid grid-cols-2 gap-2">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-2 bg-dark-700/50 rounded-xl px-3 py-2.5 hover:bg-dark-700/80 transition-colors">
                <Phone size={13} className="text-green-400 flex-shrink-0" />
                <div className="min-w-0"><p className="text-[9px] text-gray-500 uppercase tracking-wide">Phone</p><p className="text-xs text-white font-medium truncate">{lead.phone}</p></div>
              </a>
            )}
            {(detail?.email || lead.email) && (
              <a href={`mailto:${detail?.email || lead.email}`} className="flex items-center gap-2 bg-dark-700/50 rounded-xl px-3 py-2.5 hover:bg-dark-700/80 transition-colors">
                <Mail size={13} className="text-blue-400 flex-shrink-0" />
                <div className="min-w-0"><p className="text-[9px] text-gray-500 uppercase tracking-wide">Email</p><p className="text-xs text-white font-medium truncate">{detail?.email || lead.email}</p></div>
              </a>
            )}
            {lead.company && (
              <div className="flex items-center gap-2 bg-dark-700/50 rounded-xl px-3 py-2.5">
                <Building2 size={13} className="text-brand-400 flex-shrink-0" />
                <div className="min-w-0"><p className="text-[9px] text-gray-500 uppercase tracking-wide">Company</p><p className="text-xs text-white font-medium truncate">{lead.company}</p></div>
              </div>
            )}
            {lead.stage && (
              <div className="flex items-center gap-2 bg-dark-700/50 rounded-xl px-3 py-2.5">
                <ChevronRight size={13} className="text-amber-400 flex-shrink-0" />
                <div className="min-w-0"><p className="text-[9px] text-gray-500 uppercase tracking-wide">Stage</p><p className="text-xs text-white font-medium truncate">{lead.stage.replace(/_/g, ' ')}</p></div>
              </div>
            )}
            {lead.budget && (
              <div className="flex items-center gap-2 bg-dark-700/50 rounded-xl px-3 py-2.5">
                <Briefcase size={13} className="text-emerald-400 flex-shrink-0" />
                <div className="min-w-0"><p className="text-[9px] text-gray-500 uppercase tracking-wide">Budget</p><p className="text-xs text-white font-medium truncate">{lead.budget}</p></div>
              </div>
            )}
            {lead.source && (
              <div className="flex items-center gap-2 bg-dark-700/50 rounded-xl px-3 py-2.5">
                <UserCircle2 size={13} className="text-violet-400 flex-shrink-0" />
                <div className="min-w-0"><p className="text-[9px] text-gray-500 uppercase tracking-wide">Source</p><p className="text-xs text-white font-medium truncate">{lead.source.replace(/_/g, ' ')}</p></div>
              </div>
            )}
          </div>

          {/* Assigned + map */}
          <div className="flex items-center justify-between gap-2 px-3 pb-3">
            {lead.assignedTo ? (
              <div className="flex items-center gap-1.5">
                <Avatar user={lead.assignedTo} size={5} />
                <span className="text-[11px] text-gray-400">Assigned to <span className="text-white">{lead.assignedTo.name}</span></span>
              </div>
            ) : <span className="text-[11px] text-gray-600">Unassigned</span>}
            {lead.locationLink && (
              <a href={lead.locationLink} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-brand-300 hover:text-brand-200">
                <MapPin size={11} />View map<ExternalLink size={10} />
              </a>
            )}
          </div>

          {/* Tasks section */}
          <div className="border-t border-white/8 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-white">
                Tasks
                {tasks.length > 0 && <span className="ml-1 text-gray-500 font-normal">({tasks.length})</span>}
              </p>
              <div className="flex items-center gap-3">
                {/* Select All toggle — only when there are claimable tasks */}
                {hasClaimable && (
                  <button onClick={toggleAll}
                    className="text-[11px] text-brand-300 hover:text-brand-200 font-medium">
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                )}
                {isAdmin && !adding && (
                  <button onClick={() => setAdding(true)}
                    className="inline-flex items-center gap-1 text-[11px] text-brand-300 hover:text-brand-200">
                    <Plus size={11} />Add task
                  </button>
                )}
              </div>
            </div>

            {/* Admin add-task */}
            {isAdmin && adding && (
              <div className="space-y-1.5 bg-dark-700/40 rounded-xl p-2.5">
                <div className="flex gap-1.5">
                  <input autoFocus type="text" value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitAdd(); } }}
                    placeholder="Task title…"
                    className="flex-1 min-w-0 bg-dark-800/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500/40" />
                  <button onClick={submitAdd} disabled={savingAdd || !newTitle.trim()}
                    className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex-shrink-0">
                    {savingAdd ? <Loader2 size={11} className="animate-spin" /> : 'Add'}
                  </button>
                  <button onClick={() => { setAdding(false); setNewTitle(''); setNewTeam('ALL'); }}
                    className="px-1 text-xs text-gray-400 flex-shrink-0">✕</button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500">Assign to team:</span>
                  <TeamSelect value={newTeam} onChange={setNewTeam} />
                </div>
              </div>
            )}

            {/* Task list — ALL tasks shown to ALL users, claimable ones have checkboxes */}
            {tasks.length === 0
              ? <p className="text-[11px] text-gray-600 py-1">No tasks yet{isAdmin ? '. Add one above.' : '.'}</p>
              : (
                <div className="space-y-1.5">
                  {tasks.map(t => {
                    const claimer = t.user;
                    const claimerTeamMeta = resolveClaimerTeam(claimer, t.taskTeam);
                    const isMyClaim  = t.userId === currentUser?.id;
                    const iCanClaim  = !t.userId && canClaimTask(ft, currentUser?.role, t.taskTeam);
                    const isChecked  = selectedIds.has(t.id);

                    return (
                      <div key={t.id}
                        onClick={() => iCanClaim && toggleTask(t.id)}
                        className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 transition-colors ${
                          iCanClaim ? 'cursor-pointer' : ''
                        } ${
                          isChecked
                            ? 'bg-brand-600/20 border border-brand-500/40'
                            : isMyClaim
                            ? 'bg-brand-600/10 border border-brand-500/20'
                            : 'bg-dark-700/40 border border-transparent'
                        }`}>

                        {/* Checkbox for claimable tasks */}
                        {iCanClaim ? (
                          <div className={`w-4 h-4 rounded-md flex-shrink-0 mt-0.5 flex items-center justify-center border-2 transition-colors ${
                            isChecked ? 'bg-brand-500 border-brand-500' : 'border-gray-500 bg-transparent'
                          }`}>
                            {isChecked && <Check size={10} className="text-white" strokeWidth={3} />}
                          </div>
                        ) : (
                          /* Status dot for non-claimable tasks */
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 ${
                            t.completed ? 'bg-green-400' : t.userId ? 'bg-brand-400' : 'bg-gray-600'
                          }`} />
                        )}

                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium leading-snug ${t.completed === true ? 'line-through text-gray-500' : 'text-white'}`}>
                            {t.title}
                          </p>
                          <div className="flex items-center flex-wrap gap-1.5 mt-1">
                            <TeamBadge taskTeam={t.taskTeam} />
                            {claimer ? (
                              <span className="inline-flex items-center gap-1 text-[10px]">
                                <Avatar user={claimer} size={4} />
                                <span className="text-gray-400">
                                  {t.completed ? '✓ Done by' : 'By'}{' '}
                                  <span className="text-white font-medium">{claimer.name}</span>
                                </span>
                                {claimerTeamMeta && (
                                  <span className={`font-semibold ${claimerTeamMeta.color.split(' ').find(c => c.startsWith('text-'))}`}>
                                    · {claimerTeamMeta.label}
                                  </span>
                                )}
                                {isMyClaim && <span className="text-brand-400 font-semibold">(You)</span>}
                              </span>
                            ) : iCanClaim ? (
                              <span className="text-[10px] text-amber-400/80 font-medium">
                                {isChecked ? 'Selected to claim' : 'Tap to select'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-600">Unclaimed</span>
                            )}
                          </div>
                        </div>

                        {isAdmin && (
                          <button
                            onClick={e => { e.stopPropagation(); onDeleteTask(lead.id, t.id); }}
                            className="p-0.5 text-gray-600 hover:text-red-400 flex-shrink-0 mt-0.5">
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>

          {/* Loading shimmer */}
          {loadingDetail && (
            <div className="border-t border-white/8 p-3 flex items-center gap-2 text-xs text-gray-500">
              <Loader2 size={12} className="animate-spin" />Loading details…
            </div>
          )}

          {/* Recent notes */}
          {!loadingDetail && detail?.notes?.length > 0 && (
            <div className="border-t border-white/8 p-3 space-y-2">
              <p className="text-xs font-semibold text-white">Recent Notes</p>
              {detail.notes.slice(0, 3).map(n => (
                <div key={n.id} className="bg-dark-700/40 rounded-xl px-3 py-2">
                  <p className="text-[11px] text-gray-200 leading-relaxed">{n.content}</p>
                  <p className="text-[10px] text-gray-600 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}

          {/* File thumbnails */}
          {!loadingDetail && detail?.files?.length > 0 && (
            <div className="border-t border-white/8 p-3 space-y-2">
              <p className="text-xs font-semibold text-white">Files</p>
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scroll">
                {detail.files.slice(0, 8).map((f, i) => (
                  <div key={f.id || i} className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-dark-700/60">
                    {f.mimeType?.startsWith('image/')
                      ? <img src={resolveFileUrl(f.url)} alt={f.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={20} className="text-gray-600" /></div>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="h-4" />
        </div>

        {/* Footer — Claim button */}
        {hasClaimable ? (
          <div className="flex-shrink-0 border-t border-white/8">
            {/* Selection summary bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-dark-700/40">
              <span className="text-[11px] text-gray-400">
                {selectedIds.size > 0
                  ? `${selectedIds.size} of ${claimableTasks.length} task${claimableTasks.length > 1 ? 's' : ''} selected`
                  : `${claimableTasks.length} task${claimableTasks.length > 1 ? 's' : ''} available — tap to select`
                }
              </span>
              {selectedIds.size > 0 && (
                <button onClick={() => setSelectedIds(new Set())}
                  className="text-[11px] text-gray-500 hover:text-gray-300">
                  Clear
                </button>
              )}
            </div>
            {/* Claim selected button */}
            <button
              onClick={handleClaimSelected}
              disabled={selectedIds.size === 0 || claimingSelected}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold py-3.5 flex items-center justify-center gap-2 transition-colors">
              {claimingSelected ? <Loader2 size={14} className="animate-spin" /> : <Hand size={14} />}
              {claimingSelected
                ? 'Claiming…'
                : selectedIds.size > 0
                ? `Claim ${selectedIds.size} Selected Task${selectedIds.size > 1 ? 's' : ''}`
                : 'Select tasks above to claim'
              }
            </button>
          </div>
        ) : tasks.length > 0 ? (
          <div className="flex-shrink-0 w-full bg-dark-700/60 text-gray-400 text-[11px] font-semibold py-3 flex items-center justify-center gap-1.5 border-t border-white/8">
            <CheckCircle2 size={13} className="text-green-400" />
            All tasks claimed
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Opportunity card
// ---------------------------------------------------------------------------
function OpportunityCard({ opp, userPos, currentUser, onClaim, claiming, canDelete, onDelete }) {
  const dist = useMemo(() => {
    if (!userPos || opp.latitude == null || opp.longitude == null) return null;
    return distanceKm(userPos.lat, userPos.lng, opp.latitude, opp.longitude);
  }, [userPos, opp.latitude, opp.longitude]);

  const tasks = opp.tasks || [];
  const ft    = currentUser?.functionalTeam || 'ALL';

  // Tasks this user can claim
  const claimable = tasks.filter(t => !t.userId && canClaimTask(ft, currentUser?.role, t.taskTeam));
  const allClaimed = tasks.length > 0 && tasks.every(t => !!t.userId);

  return (
    <div className="glass-card overflow-hidden w-full">
      <div className="flex gap-2 p-2.5">
        <div className="relative w-12 h-12 rounded-lg bg-dark-700/60 flex-shrink-0 overflow-hidden flex items-center justify-center">
          {opp.photoUrl
            ? <img src={resolveFileUrl(opp.photoUrl)} alt={opp.projectName} className="w-full h-full object-cover" />
            : <ImageIcon size={16} className="text-gray-600" />}
          <span className={`absolute top-0.5 left-0 text-white text-[6px] font-bold uppercase tracking-wide px-1 py-0.5 rounded-r shadow leading-none ${opp.type === 'lead' ? 'bg-emerald-600' : 'bg-brand-600'}`}>
            {opp.type === 'lead' ? 'Lead' : 'Opp'}
          </span>
        </div>
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
                <Navigation size={10} />{formatDistance(dist)}
              </span>
            )}
            {opp.locationLink && (
              <a href={opp.locationLink} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-[10px] text-brand-300 hover:text-brand-200">
                <MapPin size={10} />View
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Task chips — coloured by team, claimed tasks show claimer */}
      {tasks.length > 0 && (
        <div className="px-2.5 pb-2 space-y-1">
          {tasks.map(t => {
            const meta    = TEAM_META[t.taskTeam] || TEAM_META['ALL'];
            const hasTeam = t.taskTeam && t.taskTeam !== 'ALL';
            const claimer = t.user;
            const claimerTeamMeta = resolveClaimerTeam(claimer, t.taskTeam);
            return (
              <div key={t.id} className="flex items-center gap-1.5 flex-wrap">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] whitespace-nowrap ${hasTeam ? meta.color : 'bg-dark-700/50 border-white/10 text-gray-200'}`}>
                  {hasTeam && <Users size={8} className="flex-shrink-0" />}
                  {t.title}
                </span>
                {claimer && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                    <Avatar user={claimer} size={4} />
                    <span>{claimer.name}</span>
                    {claimerTeamMeta && (
                      <span className={`font-semibold ${claimerTeamMeta.color.split(' ').find(c => c.startsWith('text-'))}`}>
                        · {claimerTeamMeta.label}
                      </span>
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {allClaimed ? (
        <div className="w-full bg-dark-700/60 text-gray-400 text-[11px] font-semibold py-2 flex items-center justify-center gap-1.5">
          <Check size={12} className="text-green-400" />All tasks claimed
        </div>
      ) : claimable.length > 0 ? (
        <button onClick={() => onClaim(opp)} disabled={claiming}
          className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-xs font-bold py-2.5 flex items-center justify-center gap-1.5 transition-colors">
          {claiming ? <Loader2 size={13} className="animate-spin" /> : <Hand size={13} />}
          {claiming ? 'Claiming…' : `Claim My Task${claimable.length > 1 ? 's' : ''} (${claimable.length})`}
        </button>
      ) : (
        <div className="w-full bg-dark-700/40 text-gray-600 text-[11px] py-2 flex items-center justify-center gap-1.5">
          No tasks for your team
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lead card — compact row, tap opens detail modal
// ---------------------------------------------------------------------------
function LeadCard({ lead, userPos, currentUser, onOpenDetail }) {
  const dist = useMemo(() => {
    if (!userPos || lead.latitude == null || lead.longitude == null) return null;
    return distanceKm(userPos.lat, userPos.lng, lead.latitude, lead.longitude);
  }, [userPos, lead.latitude, lead.longitude]);

  const tasks    = lead.tasks || [];
  const photoUrl = lead.files?.[0]?.url ? resolveFileUrl(lead.files[0].url) : null;
  const ft       = currentUser?.functionalTeam || 'ALL';

  const claimableTasks = tasks.filter(t => !t.userId && canClaimTask(ft, currentUser?.role, t.taskTeam));
  const allClaimed     = tasks.length > 0 && tasks.every(t => !!t.userId);

  return (
    <div className="glass-card overflow-hidden w-full cursor-pointer active:scale-[0.99] transition-transform"
      onClick={() => onOpenDetail(lead)}>
      <div className="flex gap-2 p-2.5">
        <div className="relative w-12 h-12 rounded-lg bg-dark-700/60 flex-shrink-0 overflow-hidden flex items-center justify-center">
          {photoUrl
            ? <img src={photoUrl} alt={lead.fullName} className="w-full h-full object-cover" />
            : <span className="text-base font-bold text-brand-400/60">{lead.fullName[0]}</span>}
          <span className="absolute top-0.5 left-0 bg-emerald-600 text-white text-[6px] font-bold uppercase tracking-wide px-1 py-0.5 rounded-r shadow leading-none">Lead</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1">
            <p className="text-xs font-bold text-white leading-snug break-words flex-1 min-w-0">{lead.fullName}</p>
            <ChevronRight size={14} className="text-gray-600 flex-shrink-0 mt-0.5" />
          </div>
          {(lead.company || lead.location) && (
            <p className="text-[11px] text-gray-400 truncate mt-0.5">{[lead.company, lead.location].filter(Boolean).join(' · ')}</p>
          )}
          <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1 mt-1">
            <PriorityBadge priority={lead.priority} />
            {dist != null && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-300">
                <Navigation size={10} />{formatDistance(dist)}
              </span>
            )}
            {lead.locationLink && (
              <a href={lead.locationLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-0.5 text-[10px] text-brand-300 hover:text-brand-200">
                <MapPin size={10} />View
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Task chips — all tasks shown, coloured by team, claimed ones show claimer */}
      {tasks.length > 0 && (
        <div className="px-2.5 pb-2 space-y-1" onClick={e => e.stopPropagation()}>
          {tasks.map(t => {
            const meta    = TEAM_META[t.taskTeam] || TEAM_META['ALL'];
            const hasTeam = t.taskTeam && t.taskTeam !== 'ALL';
            const claimer = t.user;
            const claimerTeamMeta = resolveClaimerTeam(claimer, t.taskTeam);
            return (
              <div key={t.id} className="flex items-center gap-1.5 flex-wrap">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] whitespace-nowrap ${hasTeam ? meta.color : 'bg-dark-700/50 border-white/10 text-gray-200'}`}>
                  {hasTeam && <Users size={8} className="flex-shrink-0" />}
                  {t.title}
                </span>
                {claimer ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                    <Avatar user={claimer} size={4} />
                    <span>{claimer.name}</span>
                    {claimerTeamMeta && (
                      <span className={`font-semibold ${claimerTeamMeta.color.split(' ').find(c => c.startsWith('text-'))}`}>
                        · {claimerTeamMeta.label}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-500/60">Unclaimed</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {allClaimed ? (
        <div className="w-full bg-dark-700/60 text-gray-400 text-[11px] font-semibold py-1.5 flex items-center justify-center gap-1.5">
          <Check size={11} className="text-green-400" />All tasks claimed
        </div>
      ) : claimableTasks.length > 0 ? (
        <div className="w-full bg-brand-600/10 text-brand-300 text-[11px] font-semibold py-1.5 flex items-center justify-center gap-1.5">
          <Hand size={11} />{claimableTasks.length} task{claimableTasks.length > 1 ? 's' : ''} available for your team · tap to claim
        </div>
      ) : tasks.length > 0 ? (
        <div className="w-full bg-dark-700/40 text-gray-600 text-[11px] py-1.5 flex items-center justify-center">
          Tap to view
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Tasks page
// ---------------------------------------------------------------------------
export default function Tasks() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'ADMIN';

  const [tab, setTab]                     = useState('all');
  const [openPool, setOpenPool]           = useState([]);
  const [initiatedPool, setInitiatedPool] = useState([]);
  const [claimingId, setClaimingId]       = useState(null);

  const [leads, setLeads]               = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadSearch, setLeadSearch]     = useState('');
  const [detailLead, setDetailLead]     = useState(null);

  const [userPos, setUserPos]   = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle');

  // Admin create-opportunity form
  const [showCreate, setShowCreate]     = useState(false);
  const [form, setForm]                 = useState({ projectName: '', address: '', priority: 'MEDIUM', locationLink: '' });
  const [taskRows, setTaskRows]         = useState([{ title: '', taskTeam: 'ALL' }]);
  const [photoFile, setPhotoFile]       = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const fileInputRef                    = useRef(null);

  useEffect(() => { loadPool(); loadLeads(); requestLocation(); }, []);
  useEffect(() => { if (tab === 'all') loadLeads(); }, [tab]);

  // ── Data loaders ──────────────────────────────────────────────────────────
  const loadLeads = async () => {
    setLeadsLoading(true);
    try {
      const res = await api.get('/tasks/leads');
      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch { toast.error('Failed to load leads'); }
    setLeadsLoading(false);
  };

  const loadPool = async () => {
    try {
      const [open, initiated] = await Promise.all([
        api.get('/tasks/pool/open'),
        api.get('/tasks/pool/initiated'),
      ]);
      setOpenPool(open.data);
      setInitiatedPool(initiated.data);
    } catch {}
  };

  const requestLocation = () => {
    if (!('geolocation' in navigator)) { setGeoStatus('unsupported'); return; }
    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      pos => { setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoStatus('ready'); },
      () => setGeoStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // ── Lead helpers ──────────────────────────────────────────────────────────
  const resortLeads = list =>
    [...list].sort((a, b) => {
      const aHas = (a.tasks?.length || 0) > 0, bHas = (b.tasks?.length || 0) > 0;
      if (aHas !== bHas) return aHas ? -1 : 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const addLeadTasks = async (leadId, entries) => {
    const normalised = entries.map(e => typeof e === 'string' ? { title: e, taskTeam: 'ALL' } : e);
    try {
      const res = await api.post(`/tasks/lead/${leadId}`, { titles: normalised });
      setLeads(prev => resortLeads(prev.map(l => l.id === leadId ? { ...l, tasks: res.data.tasks } : l)));
      setDetailLead(prev => prev?.id === leadId ? { ...prev, tasks: res.data.tasks } : prev);
      toast.success('Task added');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to add task'); }
  };

  const claimLead = async (leadId) => {
    setClaimingId(leadId);
    try {
      const res = await api.post(`/tasks/lead/${leadId}/claim`);
      setLeads(prev => resortLeads(prev.map(l => l.id === leadId ? { ...l, tasks: res.data.tasks } : l)));
      setDetailLead(prev => prev?.id === leadId ? { ...prev, tasks: res.data.tasks } : prev);
      loadPool();
      toast.success('Tasks claimed 🙌');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to claim';
      if (err.response?.status === 409) { toast.error(msg); loadLeads(); }
      else toast.error(msg);
    }
    setClaimingId(null);
  };

  // Claim only the specific task IDs the user selected in the modal
  const claimLeadSelected = async (leadId, taskIds) => {
    try {
      const res = await api.post(`/tasks/lead/${leadId}/claim-selected`, { taskIds });
      setLeads(prev => resortLeads(prev.map(l => l.id === leadId ? { ...l, tasks: res.data.tasks } : l)));
      setDetailLead(prev => prev?.id === leadId ? { ...prev, tasks: res.data.tasks } : prev);
      loadPool();
      toast.success(`${res.data.claimed} task${res.data.claimed > 1 ? 's' : ''} claimed 🙌`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to claim selected tasks';
      toast.error(msg);
    }
  };

  const deleteLeadTask = async (leadId, taskId) => {
    const remove = arr => arr.filter(t => t.id !== taskId);
    setLeads(prev => resortLeads(prev.map(l => l.id !== leadId ? l : { ...l, tasks: remove(l.tasks) })));
    setDetailLead(prev => prev?.id === leadId ? { ...prev, tasks: remove(prev.tasks) } : prev);
    try { await api.delete(`/tasks/lead-task/${taskId}`); }
    catch { toast.error('Failed to delete task'); loadLeads(); }
  };

  // ── Pool actions ──────────────────────────────────────────────────────────
  const claimProject = async (card) => {
    setClaimingId(card.id);
    const url = card.type === 'lead'
      ? `/tasks/lead/${card.id}/claim`
      : `/tasks/pool/opportunity/${card.id}/claim`;
    try {
      await api.post(url);
      await Promise.all([loadPool(), loadLeads()]);
      toast.success('Tasks claimed 🙌');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to claim';
      if (err.response?.status === 409) { toast.error(msg); await loadPool(); }
      else toast.error(msg);
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
      setOpenPool(prev => prev.filter(o => o.id !== card.id));
      setInitiatedPool(prev => prev.filter(o => o.id !== card.id));
      loadLeads();
    } catch { toast.error('Failed to delete'); }
  };

  // ── Admin create-opportunity ───────────────────────────────────────────────
  const onPhotoChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };
  const updateTaskRow = (idx, field, val) =>
    setTaskRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  const addTaskRow    = () => setTaskRows(prev => [...prev, { title: '', taskTeam: 'ALL' }]);
  const removeTaskRow = idx => setTaskRows(prev => prev.filter((_, i) => i !== idx));

  const submitPoolTask = async e => {
    e.preventDefault();
    if (!form.projectName.trim()) { toast.error('Project / site name is required'); return; }
    const validRows = taskRows.filter(r => r.title.trim());
    if (validRows.length === 0) { toast.error('Add at least one task'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('projectName', form.projectName.trim());
      if (form.address.trim()) fd.append('address', form.address.trim());
      fd.append('titles',    JSON.stringify(validRows.map(r => r.title.trim())));
      fd.append('taskTeams', JSON.stringify(validRows.map(r => r.taskTeam)));
      fd.append('priority',  form.priority);
      if (form.locationLink.trim()) fd.append('locationLink', form.locationLink.trim());
      if (photoFile) fd.append('photo', photoFile);
      const res = await api.post('/tasks/pool', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setOpenPool(prev => [res.data, ...prev]);
      setForm({ projectName: '', address: '', priority: 'MEDIUM', locationLink: '' });
      setTaskRows([{ title: '', taskTeam: 'ALL' }]);
      setPhotoFile(null); setPhotoPreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowCreate(false);
      toast.success(`Project added with ${res.data.tasks?.length || 0} task(s)`);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to add opportunity'); }
    setSubmitting(false);
  };

  // ── Derived lists ─────────────────────────────────────────────────────────
  const withDist = list => list.map(o => ({
    ...o,
    _dist: (userPos && o.latitude != null && o.longitude != null)
      ? distanceKm(userPos.lat, userPos.lng, o.latitude, o.longitude) : null
  }));

  const displayed = useMemo(() => {
    if (tab === 'initiated') return initiatedPool;
    const open = withDist(openPool);
    if (tab === 'nearby') return [...open].sort((a, b) => {
      if (a._dist == null) return 1; if (b._dist == null) return -1;
      return a._dist - b._dist;
    });
    return [...open].sort((a, b) => (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1));
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
    const distOf = l => (userPos && l.latitude != null && l.longitude != null)
      ? distanceKm(userPos.lat, userPos.lng, l.latitude, l.longitude) : Infinity;
    const hasTasks = l => (l.tasks?.length || 0) > 0;
    return [...filtered].sort((a, b) => {
      const ha = hasTasks(a), hb = hasTasks(b);
      if (ha !== hb) return ha ? -1 : 1;
      if (userPos) return distOf(a) - distOf(b);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [leads, userPos, leadSearch]);

  const TABS = [
    { key: 'priority',  label: 'Priority',  icon: Star },
    { key: 'nearby',    label: 'Nearby',    icon: MapPin },
    { key: 'initiated', label: 'Initiated', icon: ListChecks },
    { key: 'claimed',   label: 'Claimed',   icon: CheckCircle2 },
  ];
  const showLeads   = tab === 'all';
  const showClaimed = tab === 'claimed';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-2xl mx-auto space-y-3 pb-10">

      {/* Lead detail modal */}
      {detailLead && (
        <LeadDetailModal
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          isAdmin={isAdmin}
          currentUser={user}
          onAddTasks={addLeadTasks}
          onDeleteTask={deleteLeadTask}
          onClaim={claimLead}
          onClaimSelected={claimLeadSelected}
          claiming={claimingId === detailLead.id}
        />
      )}

      {/* Page heading */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-white">Tasks</h1>
        {isAdmin && (
          <button onClick={() => setShowCreate(v => !v)}
            className="flex-shrink-0 flex items-center gap-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-colors">
            <Plus size={13} />New Opportunity
          </button>
        )}
      </div>

      {/* Admin create-opportunity form */}
      {isAdmin && showCreate && (
        <form onSubmit={submitPoolTask} className="glass-card p-3 space-y-2.5">
          <p className="text-xs font-semibold text-white">Add opportunity to team pool</p>
          <input type="text" value={form.projectName} onChange={e => setForm({ ...form, projectName: e.target.value })}
            placeholder="Project / site name *" required
            className="w-full bg-dark-700/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500/40" />
          <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
            placeholder="Address / area"
            className="w-full bg-dark-700/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500/40" />
          {/* Per-task rows */}
          <div className="space-y-1.5">
            <p className="text-[11px] text-gray-400 font-medium">Tasks <span className="text-gray-600">(assign a team to each)</span></p>
            {taskRows.map((row, idx) => (
              <div key={idx} className="flex gap-1.5 items-center">
                <input type="text" value={row.title} onChange={e => updateTaskRow(idx, 'title', e.target.value)}
                  placeholder={`Task ${idx + 1}…`}
                  className="flex-1 min-w-0 bg-dark-700/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500/40" />
                <TeamSelect value={row.taskTeam} onChange={val => updateTaskRow(idx, 'taskTeam', val)} className="flex-shrink-0" />
                {taskRows.length > 1 && (
                  <button type="button" onClick={() => removeTaskRow(idx)} className="p-1 text-gray-600 hover:text-red-400 flex-shrink-0">
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addTaskRow}
              className="inline-flex items-center gap-1 text-[11px] text-brand-300 hover:text-brand-200">
              <Plus size={11} />Add another task
            </button>
          </div>
          <div className="flex gap-2">
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
              className="flex-1 bg-dark-700/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500/40">
              <option value="HIGH">High priority</option>
              <option value="MEDIUM">Medium priority</option>
              <option value="LOW">Low priority</option>
            </select>
          </div>
          <input type="url" value={form.locationLink} onChange={e => setForm({ ...form, locationLink: e.target.value })}
            placeholder="Google Maps link (optional)"
            className="w-full bg-dark-700/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500/40" />
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-dark-700/40 px-2.5 py-1.5 text-[11px] text-gray-300 hover:bg-dark-700/70">
              <ImageIcon size={12} />{photoFile ? 'Change photo' : 'Add photo'}
            </button>
            {photoPreview && <img src={photoPreview} alt="preview" className="w-10 h-10 rounded-lg object-cover" />}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
          </div>
          <div className="flex gap-2 pt-0.5">
            <button type="submit" disabled={submitting}
              className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-xs font-semibold px-3 py-2 rounded-xl">
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}Add to pool
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="px-3 text-xs text-gray-400 hover:text-gray-200">Cancel</button>
          </div>
        </form>
      )}

      {/* Pool section */}
      <section className="space-y-2.5 w-full min-w-0">

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 custom-scroll">
          {TABS.map(t => {
            const Icon   = t.icon;
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(active ? 'all' : t.key)}
                className={`flex-shrink-0 inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'border-brand-500 bg-brand-600/15 text-brand-200'
                    : 'border-white/8 bg-dark-700/40 text-gray-400 hover:text-gray-200'
                }`}>
                <Icon size={12} />{t.label}
              </button>
            );
          })}
        </div>

        {/* Context / location line */}
        {!showClaimed && (
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            <span>
              {showLeads
                ? `${leads.length} lead${leads.length === 1 ? '' : 's'}`
                : tab === 'initiated' ? `${initiatedPool.length} in progress`
                : `${openPool.length} available`}
            </span>
            {tab !== 'initiated' && (
              geoStatus === 'ready'
                ? <span className="inline-flex items-center gap-0.5 text-green-400"><MapPin size={10} />On</span>
                : geoStatus === 'locating'
                ? <span className="inline-flex items-center gap-0.5"><Loader2 size={10} className="animate-spin" />Locating…</span>
                : (geoStatus === 'denied' || geoStatus === 'unsupported')
                ? <button onClick={requestLocation} className="inline-flex items-center gap-0.5 text-brand-300 hover:text-brand-200"><MapPin size={10} />Enable location</button>
                : null
            )}
          </div>
        )}

        {/* ── Claimed tasks view ── */}
        {showClaimed && <ClaimedTasksView />}

        {/* ── Leads view ── */}
        {showLeads && (
          <div className="space-y-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input type="text" value={leadSearch} onChange={e => setLeadSearch(e.target.value)}
                placeholder="Search leads…"
                className="w-full bg-dark-700/80 border border-white/10 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500/40" />
              {leadSearch && (
                <button onClick={() => setLeadSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  <X size={13} />
                </button>
              )}
            </div>
            {leadsLoading && displayedLeads.length === 0 && (
              <p className="text-xs text-gray-500 py-6 text-center flex items-center justify-center gap-2">
                <Loader2 size={13} className="animate-spin" />Loading leads…
              </p>
            )}
            {!leadsLoading && displayedLeads.length === 0 && (
              <p className="text-xs text-gray-600 py-6 text-center">
                {leadSearch ? `No leads match "${leadSearch}".` : 'No leads yet.'}
              </p>
            )}
            {displayedLeads.map(lead => (
              <LeadCard key={lead.id} lead={lead} userPos={userPos} currentUser={user} onOpenDetail={setDetailLead} />
            ))}
          </div>
        )}

        {/* ── Pool views (priority / nearby / initiated) ── */}
        {!showLeads && !showClaimed && (
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
                currentUser={user}
                onClaim={claimProject}
                claiming={claimingId === opp.id}
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
