import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const STAGES = [
  { key: 'CONNECT',        label: 'Connect',     color: 'border-gray-400',    bg: 'bg-gray-400',    text: 'text-gray-300' },
  { key: 'REPLY',          label: 'Reply',        color: 'border-blue-400',    bg: 'bg-blue-400',    text: 'text-blue-300' },
  { key: 'INTEREST',       label: 'Interest',     color: 'border-cyan-400',    bg: 'bg-cyan-400',    text: 'text-cyan-300' },
  { key: 'TRUST',          label: 'Trust',        color: 'border-purple-400',  bg: 'bg-purple-400',  text: 'text-purple-300' },
  { key: 'TRIAL',          label: 'Trial',        color: 'border-amber-400',   bg: 'bg-amber-400',   text: 'text-amber-300' },
  { key: 'DEMO_BOOKED',    label: 'Demo Booked',  color: 'border-orange-400',  bg: 'bg-orange-400',  text: 'text-orange-300' },
  { key: 'DEMO_ATTENDED',  label: 'Demo Done',    color: 'border-green-400',   bg: 'bg-green-400',   text: 'text-green-300' },
  { key: 'PROPOSAL_SENT',  label: 'Proposal',     color: 'border-indigo-400',  bg: 'bg-indigo-400',  text: 'text-indigo-300' },
  { key: 'NEGOTIATION',    label: 'Negotiation',  color: 'border-pink-400',    bg: 'bg-pink-400',    text: 'text-pink-300' },
  { key: 'WON',            label: 'Won',          color: 'border-emerald-400', bg: 'bg-emerald-400', text: 'text-emerald-300' },
  { key: 'LOST',           label: 'Lost',         color: 'border-red-400',     bg: 'bg-red-400',     text: 'text-red-300' },
];

const TEMP_ICON = { HOT: '🔥', WARM: '☀️', COLD: '❄️' };

export default function Pipeline() {
  const [pipeline, setPipeline] = useState({});
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [expanded, setExpanded] = useState({});
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
  const handleDragOver = (e, stageKey) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverStage(stageKey); };
  const handleDragLeave = () => setDragOverStage(null);
  const handleDrop = (e, stage) => {
    e.preventDefault();
    if (draggedLead && draggedLead.stage !== stage) moveLead(draggedLead.id, stage);
    setDraggedLead(null);
    setDragOverStage(null);
  };

  const toggleExpand = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const totalLeads = Object.values(pipeline).reduce((s, arr) => s + (arr?.length || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Pipeline</h1>
          <p className="text-xs text-gray-500">Drag leads between stages to update · {totalLeads} total leads</p>
        </div>
        {/* Stage summary pills */}
        <div className="hidden lg:flex items-center gap-1.5 flex-wrap justify-end max-w-lg">
          {STAGES.map(s => {
            const count = pipeline[s.key]?.length || 0;
            if (!count) return null;
            return (
              <span key={s.key} className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-dark-700 ${s.text}`}>
                {s.label}: {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* Pipeline grid — all 11 stages always visible */}
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(11, minmax(0, 1fr))' }}>
        {STAGES.map(stage => {
          const leads = pipeline[stage.key] || [];
          const count = leads.length;
          const isOver = dragOverStage === stage.key;
          const isExpanded = expanded[stage.key];
          // Show first 3 leads, rest collapsible
          const visible = isExpanded ? leads : leads.slice(0, 3);
          const hidden = leads.length - 3;

          return (
            <div
              key={stage.key}
              onDragOver={(e) => handleDragOver(e, stage.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.key)}
              className={`rounded-xl border-t-2 ${stage.color} transition-all duration-150 ${
                isOver ? 'bg-white/5 scale-[1.01]' : 'bg-dark-800/50'
              }`}
            >
              {/* Column header */}
              <div className="px-2 pt-2.5 pb-2 flex items-center justify-between">
                <span className={`text-[10px] font-bold uppercase tracking-wide truncate ${stage.text}`}>
                  {stage.label}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${count > 0 ? `${stage.text} bg-dark-600` : 'text-gray-600 bg-dark-700'}`}>
                  {count}
                </span>
              </div>

              {/* Drop zone + cards */}
              <div className={`px-1.5 pb-2 space-y-1.5 min-h-[3rem] rounded-b-xl transition-colors ${isOver ? 'bg-white/5' : ''}`}>
                {visible.map(lead => (
                  <motion.div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead)}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="bg-dark-700/80 border border-white/5 rounded-lg p-2 cursor-grab active:cursor-grabbing hover:border-white/15 hover:bg-dark-700 transition-all"
                  >
                    <div className="flex items-start justify-between gap-1 mb-0.5">
                      <span className="text-[11px] font-semibold text-white leading-tight truncate flex-1">
                        {lead.fullName}
                      </span>
                      <span className="text-[10px] flex-shrink-0">{TEMP_ICON[lead.temperature]}</span>
                    </div>
                    {lead.company && (
                      <p className="text-[9px] text-gray-500 flex items-center gap-0.5 truncate">
                        <Building2 size={8} className="flex-shrink-0" />{lead.company}
                      </p>
                    )}
                    {lead.budget && (
                      <p className="text-[9px] text-brand-400 font-medium mt-0.5">₹{lead.budget}</p>
                    )}
                  </motion.div>
                ))}

                {/* Show more / less toggle */}
                {leads.length > 3 && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(stage.key)}
                    className={`w-full flex items-center justify-center gap-1 py-1 rounded-lg text-[9px] font-semibold transition-colors ${stage.text} bg-dark-700/50 hover:bg-dark-600/50`}
                  >
                    {isExpanded ? (
                      <><ChevronUp size={10} /> Less</>
                    ) : (
                      <><ChevronDown size={10} /> +{hidden} more</>
                    )}
                  </button>
                )}

                {/* Empty drop target hint */}
                {count === 0 && (
                  <div className={`h-8 rounded-lg border border-dashed flex items-center justify-center text-[9px] transition-colors ${isOver ? 'border-white/20 text-white/40' : 'border-white/5 text-transparent'}`}>
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
