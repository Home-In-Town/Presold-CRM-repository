import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, Building2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const STAGES = [
  { key: 'CONNECT', label: 'Connect', color: 'border-gray-500' },
  { key: 'REPLY', label: 'Reply', color: 'border-blue-500' },
  { key: 'INTEREST', label: 'Interest', color: 'border-cyan-500' },
  { key: 'TRUST', label: 'Trust', color: 'border-purple-500' },
  { key: 'TRIAL', label: 'Trial', color: 'border-amber-500' },
  { key: 'DEMO_BOOKED', label: 'Demo Booked', color: 'border-orange-500' },
  { key: 'DEMO_ATTENDED', label: 'Demo Done', color: 'border-green-500' },
  { key: 'PROPOSAL_SENT', label: 'Proposal', color: 'border-indigo-500' },
  { key: 'NEGOTIATION', label: 'Negotiation', color: 'border-pink-500' },
  { key: 'WON', label: 'Won', color: 'border-emerald-500' },
  { key: 'LOST', label: 'Lost', color: 'border-red-500' }
];

const tempIcons = { HOT: '🔥', WARM: '☀️', COLD: '❄️' };

export default function Pipeline() {
  const [pipeline, setPipeline] = useState({});
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState(null);
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
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (e, stage) => { e.preventDefault(); if (draggedLead && draggedLead.stage !== stage) moveLead(draggedLead.id, stage); setDraggedLead(null); };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Pipeline</h1>
          <p className="text-xs text-gray-500">Drag leads between stages to update</p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
        {STAGES.map(stage => (
          <div
            key={stage.key}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.key)}
            className={`flex-shrink-0 w-64 bg-dark-800/50 rounded-2xl border-t-2 ${stage.color} p-3`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-300">{stage.label}</h3>
              <span className="text-[10px] font-bold text-gray-500 bg-dark-600 px-2 py-0.5 rounded-md">
                {pipeline[stage.key]?.length || 0}
              </span>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {pipeline[stage.key]?.map(lead => (
                <motion.div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead)}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className="glass-card p-3 cursor-grab active:cursor-grabbing hover:border-white/10 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white truncate">{lead.fullName}</span>
                    <span className="text-xs">{tempIcons[lead.temperature]}</span>
                  </div>
                  {lead.company && <p className="text-[10px] text-gray-500 flex items-center gap-1"><Building2 size={9} />{lead.company}</p>}
                  {lead.budget && <p className="text-[10px] text-brand-400 mt-1">₹{lead.budget}</p>}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
