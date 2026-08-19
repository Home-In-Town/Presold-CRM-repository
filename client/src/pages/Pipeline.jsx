import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, MapPin, Phone, ChevronRight } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const STAGES = [
  { key: 'CONNECT',       label: 'Connect',     color: 'border-gray-400',    activeBg: 'bg-gray-500/20',    activeBorder: 'border-gray-400',    pill: 'bg-gray-500/15 text-gray-300 border-gray-500/30'    },
  { key: 'REPLY',         label: 'Reply',        color: 'border-blue-400',    activeBg: 'bg-blue-500/20',    activeBorder: 'border-blue-400',    pill: 'bg-blue-500/15 text-blue-300 border-blue-500/30'    },
  { key: 'INTEREST',      label: 'Interest',     color: 'border-cyan-400',    activeBg: 'bg-cyan-500/20',    activeBorder: 'border-cyan-400',    pill: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'    },
  { key: 'TRUST',         label: 'Trust',        color: 'border-purple-400',  activeBg: 'bg-purple-500/20',  activeBorder: 'border-purple-400',  pill: 'bg-purple-500/15 text-purple-300 border-purple-500/30'  },
  { key: 'TRIAL',         label: 'Trial',        color: 'border-amber-400',   activeBg: 'bg-amber-500/20',   activeBorder: 'border-amber-400',   pill: 'bg-amber-500/15 text-amber-300 border-amber-500/30'   },
  { key: 'DEMO_BOOKED',   label: 'Demo Booked',  color: 'border-orange-400',  activeBg: 'bg-orange-500/20',  activeBorder: 'border-orange-400',  pill: 'bg-orange-500/15 text-orange-300 border-orange-500/30'  },
  { key: 'DEMO_ATTENDED', label: 'Demo Done',    color: 'border-green-400',   activeBg: 'bg-green-500/20',   activeBorder: 'border-green-400',   pill: 'bg-green-500/15 text-green-300 border-green-500/30'   },
  { key: 'PROPOSAL_SENT', label: 'Proposal',     color: 'border-indigo-400',  activeBg: 'bg-indigo-500/20',  activeBorder: 'border-indigo-400',  pill: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'  },
  { key: 'NEGOTIATION',   label: 'Negotiation',  color: 'border-pink-400',    activeBg: 'bg-pink-500/20',    activeBorder: 'border-pink-400',    pill: 'bg-pink-500/15 text-pink-300 border-pink-500/30'    },
  { key: 'WON',           label: 'Won',          color: 'border-emerald-400', activeBg: 'bg-emerald-500/20', activeBorder: 'border-emerald-400', pill: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  { key: 'LOST',          label: 'Lost',         color: 'border-red-400',     activeBg: 'bg-red-500/20',     activeBorder: 'border-red-400',     pill: 'bg-red-500/15 text-red-300 border-red-500/30'     },
];

const TEMP_ICON  = { HOT: '🔥', WARM: '☀️', COLD: '❄️' };
const TEMP_COLOR = {
  HOT:  'bg-red-500/15 text-red-400 border-red-500/30',
  WARM: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  COLD: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

export default function Pipeline() {
  const [pipeline, setPipeline]       = useState({});
  const [loading, setLoading]         = useState(true);
  const [activeStage, setActiveStage] = useState('CONNECT');
  const [draggedLead, setDraggedLead] = useState(null);
  const [dragTarget, setDragTarget]   = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadPipeline(); }, []);

  const loadPipeline = async () => {
    try {
      const res = await api.get('/pipeline');
      setPipeline(res.data);
    } catch { toast.error('Failed to load pipeline'); }
    setLoading(false);
  };

  const moveLead = async (leadId, newStage) => {
    try {
      const res = await api.put(`/pipeline/move/${leadId}`, { stage: newStage });
      if (res.data.xpGain) toast.success(`+${res.data.xpGain} XP — ${newStage === 'WON' ? 'Deal won! 🎉' : 'Stage updated!'}`);
      loadPipeline();
    } catch { toast.error('Move failed'); }
  };

  const handleDragStart = (e, lead) => { setDraggedLead(lead); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver  = (e, key)  => { e.preventDefault(); setDragTarget(key); };
  const handleDragLeave = ()        => setDragTarget(null);
  const handleDrop      = (e, key)  => {
    e.preventDefault();
    if (draggedLead && draggedLead.stage !== key) { moveLead(draggedLead.id, key); setActiveStage(key); }
    setDraggedLead(null); setDragTarget(null);
  };

  const totalLeads = Object.values(pipeline).reduce((s, a) => s + (a?.length || 0), 0);
  const activeLeads = pipeline[activeStage] || [];
  const activeStageObj = STAGES.find(s => s.key === activeStage);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Pipeline</h1>
          <p className="text-xs text-gray-500">Click a stage to view leads · drag cards to move · {totalLeads} total</p>
        </div>
      </div>

      {/* Stage selector — all 11 pills in one row */}
      <div className="glass-card p-3">
        <div className="flex flex-wrap gap-2">
          {STAGES.map(stage => {
            const count   = pipeline[stage.key]?.length || 0;
            const isActive = activeStage === stage.key;
            const isDrop   = dragTarget === stage.key;
            return (
              <button
                key={stage.key}
                type="button"
                onClick={() => setActiveStage(stage.key)}
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.key)}
                className={`
                  relative flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold
                  transition-all duration-150 select-none
                  ${isActive
                    ? `${stage.activeBg} ${stage.activeBorder} text-white scale-105 shadow-lg`
                    : `bg-dark-700/50 border-white/8 text-gray-400 hover:text-white hover:border-white/20`
                  }
                  ${isDrop && !isActive ? 'border-white/40 bg-white/10 scale-105' : ''}
                `}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <span className={`w-1.5 h-1.5 rounded-full ${stage.color.replace('border-', 'bg-')}`} />
                )}
                <span>{stage.label}</span>
                {count > 0 && (
                  <span className={`
                    text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center
                    ${isActive ? 'bg-white/20 text-white' : 'bg-dark-600 text-gray-400'}
                  `}>
                    {count}
                  </span>
                )}
                {/* Drop target glow */}
                {isDrop && (
                  <span className="absolute inset-0 rounded-xl ring-2 ring-white/30 pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active stage lead cards */}
      <div className="glass-card p-5">
        {/* Stage header */}
        <div className={`flex items-center justify-between mb-5 pb-4 border-b border-white/5`}>
          <div className="flex items-center gap-3">
            <div className={`w-1 h-8 rounded-full ${activeStageObj?.color.replace('border-', 'bg-')}`} />
            <div>
              <h2 className="text-base font-bold text-white">{activeStageObj?.label}</h2>
              <p className="text-[11px] text-gray-500">{activeLeads.length} lead{activeLeads.length !== 1 ? 's' : ''} in this stage</p>
            </div>
          </div>
          {/* Quick stage nav arrows */}
          <div className="flex items-center gap-1">
            {STAGES.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setActiveStage(s.key)}
                title={s.label}
                className={`w-2 h-2 rounded-full transition-all ${
                  s.key === activeStage ? `${s.color.replace('border-', 'bg-')} scale-125` : 'bg-dark-600 hover:bg-dark-500'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Lead cards grid */}
        <AnimatePresence mode="wait">
          {activeLeads.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-dark-700 flex items-center justify-center mb-3">
                <span className="text-2xl">📭</span>
              </div>
              <p className="text-sm font-medium text-gray-400">No leads in {activeStageObj?.label}</p>
              <p className="text-xs text-gray-600 mt-1">Drag a lead here or move one from another stage</p>
            </motion.div>
          ) : (
            <motion.div
              key={activeStage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
            >
              {activeLeads.map(lead => (
                <motion.div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead)}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className={`
                    relative bg-dark-700/60 border border-white/8 rounded-xl p-3.5
                    cursor-grab active:cursor-grabbing hover:border-white/15
                    hover:bg-dark-700 hover:shadow-lg transition-all group
                  `}
                >
                  {/* Temperature badge */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="w-8 h-8 rounded-xl bg-brand-600/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-brand-400">{lead.fullName?.[0]}</span>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${TEMP_COLOR[lead.temperature]}`}>
                      {TEMP_ICON[lead.temperature]} {lead.temperature}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-white leading-snug mb-1.5 truncate">
                    {lead.fullName}
                  </p>

                  {lead.company && (
                    <p className="text-[10px] text-gray-500 flex items-center gap-1 truncate mb-1">
                      <Building2 size={9} className="flex-shrink-0" />{lead.company}
                    </p>
                  )}
                  {lead.location && (
                    <p className="text-[10px] text-gray-500 flex items-center gap-1 truncate mb-1">
                      <MapPin size={9} className="flex-shrink-0" />{lead.location}
                    </p>
                  )}
                  {lead.budget && (
                    <p className="text-[10px] text-brand-400 font-semibold mt-1.5">₹{lead.budget}</p>
                  )}

                  {/* View arrow on hover */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={12} className="text-gray-400" />
                  </div>

                  {/* Stage move quick buttons (shown on hover) */}
                  <div className="mt-2.5 pt-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[9px] text-gray-600 mb-1.5 uppercase tracking-wide">Move to</p>
                    <div className="flex flex-wrap gap-1">
                      {STAGES.filter(s => s.key !== activeStage).slice(0, 3).map(s => (
                        <button
                          key={s.key}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveLead(lead.id, s.key); }}
                          className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${s.pill} hover:opacity-80 transition-opacity`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
