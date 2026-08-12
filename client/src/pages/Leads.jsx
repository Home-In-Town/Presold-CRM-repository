import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Filter, Phone, Mail, Building2, MapPin,
  MoreHorizontal, Trash2, Edit, Eye, X, ChevronDown
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const STAGES = ['CONNECT','REPLY','INTEREST','TRUST','TRIAL','DEMO_BOOKED','DEMO_ATTENDED','PROPOSAL_SENT','NEGOTIATION','WON','LOST'];
const SOURCES = ['INSTAGRAM_DM','FACEBOOK_GROUP','WHATSAPP_GROUP','REFERRAL','COLD_CALL','WEBSITE','AD_RESPONSE','EVENT','LINKEDIN'];
const LEAD_TYPES = ['BUILDER','AGENT','DEVELOPER','BROKER','INDIVIDUAL'];
const TEMPS = ['HOT','WARM','COLD'];
const PRIORITIES = ['HIGH','MEDIUM','LOW'];

const stageColors = {
  CONNECT: 'bg-gray-500/20 text-gray-400', REPLY: 'bg-blue-500/20 text-blue-400',
  INTEREST: 'bg-cyan-500/20 text-cyan-400', TRUST: 'bg-purple-500/20 text-purple-400',
  TRIAL: 'bg-amber-500/20 text-amber-400', DEMO_BOOKED: 'bg-orange-500/20 text-orange-400',
  DEMO_ATTENDED: 'bg-green-500/20 text-green-400', PROPOSAL_SENT: 'bg-indigo-500/20 text-indigo-400',
  NEGOTIATION: 'bg-pink-500/20 text-pink-400', WON: 'bg-emerald-500/20 text-emerald-400',
  LOST: 'bg-red-500/20 text-red-400'
};

const tempIcons = { HOT: '🔥', WARM: '☀️', COLD: '❄️' };

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [assigningId, setAssigningId] = useState(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isQualifier = user?.role === 'QUALIFIER';
  const canManage = isAdmin || isQualifier;

  useEffect(() => { loadLeads(); if (canManage) loadAssignableUsers(); }, [search, stageFilter, urlFilter]);

  const loadAssignableUsers = async () => {
    try {
      const res = await api.get('/leads/assignable-users');
      setAssignableUsers(res.data);
    } catch {}
  };

  const loadLeads = async () => {
    try {
      const params = { page: 1, limit: 50 };
      if (search) params.search = search;
      if (stageFilter) params.stage = stageFilter;
      // URL filter from dashboard cards
      if (urlFilter === 'today') params.period = 'today';
      if (urlFilter === 'week') params.period = 'week';
      if (urlFilter === 'won') params.stage = 'WON';
      const res = await api.get('/leads', { params });
      setLeads(res.data.leads);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load leads');
    }
    setLoading(false);
  };

  const deleteLead = async (id) => {
    if (!window.confirm('Delete this lead?')) return;
    try {
      await api.delete(`/leads/${id}`);
      setLeads(leads.filter(l => l.id !== id));
      toast.success('Lead deleted');
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const assignLead = async (leadId, assignedToId) => {
    try {
      const res = await api.put(`/leads/${leadId}/assign`, { assignedToId });
      setLeads(leads.map(l => l.id === leadId ? { ...l, assignedTo: res.data.assignedTo, assignedToId } : l));
      setAssigningId(null);
      toast.success(`Lead assigned to ${res.data.assignedTo?.name}`);
    } catch {
      toast.error('Assign failed');
    }
  };

  const qualifyLead = async (leadId, status) => {
    try {
      await api.put(`/leads/${leadId}/qualify`, { qualified: status });
      setLeads(leads.map(l => l.id === leadId ? { ...l, qualified: status } : l));
      toast.success(`Lead marked as ${status}`);
    } catch {
      toast.error('Failed to update');
    }
  };

  return (
    <div className="space-y-4">
      {/* Active Filter Badge */}
      {urlFilter && (
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30 font-medium">
            Showing: {urlFilter === 'today' ? "Today's Leads" : urlFilter === 'week' ? 'Weekly Leads' : urlFilter === 'won' ? 'Deals Won' : urlFilter}
          </span>
          <button onClick={() => setSearchParams({})} className="text-[10px] text-gray-500 hover:text-white transition-colors">Clear filter</button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Leads</h1>
          <p className="text-xs text-gray-500">{pagination.total} total leads in pipeline</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add Lead
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search leads..." className="input-field pl-9 py-2.5 text-sm"
          />
        </div>
        <select
          value={stageFilter} onChange={e => setStageFilter(e.target.value)}
          className="input-field w-auto py-2.5 text-sm pr-8"
        >
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* Leads Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Name</th>
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Contact</th>
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Type</th>
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Stage</th>
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Temp</th>
                <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Source</th>
                {canManage && <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Qualified</th>}
                {canManage && <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Added By</th>}
                {canManage && <th className="text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Assign To</th>}
                <th className="text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="table-row animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 bg-dark-500 rounded w-32" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-dark-500 rounded w-24" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-dark-500 rounded w-20" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><div className="h-4 bg-dark-500 rounded w-10" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 bg-dark-500 rounded w-16" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-dark-500 rounded w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500 text-sm">No leads found. Add your first lead!</td></tr>
              ) : (
                leads.map(lead => (
                  <tr key={lead.id} className="table-row cursor-pointer group" onClick={() => navigate(`/leads/${lead.id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-600/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-brand-400">{lead.fullName[0]}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-brand-400 transition-colors">{lead.fullName}</p>
                          {lead.company && <p className="text-[10px] text-gray-500">{lead.company}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-gray-400">{lead.phone}</p>
                      {lead.email && <p className="text-[10px] text-gray-500">{lead.email}</p>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-dark-700 text-gray-300">
                        {lead.leadType?.replace('_', ' ') || 'INDIVIDUAL'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-md ${stageColors[lead.stage] || 'bg-gray-500/20 text-gray-400'}`}>
                        {lead.stage.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm">{tempIcons[lead.temperature]}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-[10px] text-gray-500">{lead.source?.replace('_', ' ')}</span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 hidden sm:table-cell" onClick={e => e.stopPropagation()}>
                        <select
                          value={lead.qualified || 'PENDING'}
                          onChange={e => qualifyLead(lead.id, e.target.value)}
                          className={`text-[10px] font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${
                            lead.qualified === 'QUALIFIED' ? 'bg-green-500/20 text-green-400' :
                            lead.qualified === 'UNQUALIFIED' ? 'bg-red-500/20 text-red-400' :
                            'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="QUALIFIED">QUALIFIED</option>
                          <option value="UNQUALIFIED">UNQUALIFIED</option>
                        </select>
                      </td>
                    )}
                    {canManage && (
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-[10px] text-gray-400">{lead.createdByName || lead.assignedTo?.name || '—'}</span>
                      </td>
                    )}
                    {canManage && (
                      <td className="px-4 py-3 hidden md:table-cell" onClick={e => e.stopPropagation()}>
                        {assigningId === lead.id ? (
                          <select
                            autoFocus
                            className="input-field text-[11px] py-1 px-2 w-32"
                            defaultValue={lead.assignedToId || ''}
                            onChange={e => { if (e.target.value) assignLead(lead.id, e.target.value); else setAssigningId(null); }}
                            onBlur={() => setAssigningId(null)}
                          >
                            <option value="">-- Select --</option>
                            {assignableUsers.map(u => (
                              <option key={u.id} value={u.id}>{u.name} ({u.role.replace('_', ' ')})</option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => setAssigningId(lead.id)}
                            className="text-[10px] px-2 py-1 rounded-md bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors"
                          >
                            {lead.assignedTo?.name || 'Unassigned'}
                          </button>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <a href={`tel:${lead.phone}`} className="p-1.5 rounded-lg hover:bg-green-500/10 text-gray-500 hover:text-green-400 transition-colors">
                          <Phone size={13} />
                        </a>
                        <button onClick={() => deleteLead(lead.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lead Modal */}
      <AnimatePresence>
        {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} onAdded={() => { setShowAddModal(false); loadLeads(); }} />}
      </AnimatePresence>
    </div>
  );
}

function AddLeadModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', company: '', location: '', budget: '', source: 'INSTAGRAM_DM', leadType: 'INDIVIDUAL', temperature: 'WARM', priority: 'MEDIUM', adsRunning: false, notes: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.phone) { toast.error('Name and phone required'); return; }
    setLoading(true);
    try {
      await api.post('/leads', form);
      toast.success('+5 XP — Lead added! 🎯');
      onAdded();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add lead');
    }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Add New Lead</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5"><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Full Name *" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="input-field text-sm" required />
            <input type="tel" placeholder="Phone *" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input-field text-sm" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field text-sm" />
            <input type="text" placeholder="Company" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="input-field text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="input-field text-sm" />
            <input type="text" placeholder="Budget" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} className="input-field text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.leadType} onChange={e => setForm({ ...form, leadType: e.target.value })} className="input-field text-sm">
              {LEAD_TYPES.map(type => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}
            </select>
            <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="input-field text-sm">
              {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <select value={form.temperature} onChange={e => setForm({ ...form, temperature: e.target.value })} className="input-field text-sm">
              {TEMPS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="input-field text-sm">
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-dark-700/50 border border-white/5 cursor-pointer hover:border-brand-500/20 transition-colors">
            <input
              type="checkbox"
              checked={form.adsRunning}
              onChange={e => setForm({ ...form, adsRunning: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 bg-dark-800 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-300">Ads Running</span>
            <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${form.adsRunning ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-500'}`}>
              {form.adsRunning ? 'YES' : 'NO'}
            </span>
          </label>
          <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-field text-sm resize-none h-20" />
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1 text-sm">{loading ? 'Adding...' : 'Add Lead (+5 XP)'}</button>
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
