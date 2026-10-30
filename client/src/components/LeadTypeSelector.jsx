import { motion } from 'framer-motion';
import { X, Users, FileText } from 'lucide-react';

export default function LeadTypeSelector({ onSelect, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-dark-800 rounded-2xl w-full max-w-md border border-dark-700 shadow-2xl p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Select Lead Type</h2>
            <p className="text-sm text-gray-400 mt-1">Choose which type of lead to add</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-dark-700 hover:bg-dark-600 flex items-center justify-center transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Lead Type Options */}
        <div className="space-y-3">
          {/* Sales Lead */}
          <button
            onClick={() => onSelect('SALES')}
            className="w-full p-5 rounded-xl bg-gradient-to-br from-brand-500/10 to-brand-600/5 border-2 border-brand-500/20 hover:border-brand-500/40 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-brand-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users size={24} className="text-brand-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-bold text-white text-lg mb-1">Sales Lead</div>
                <div className="text-sm text-gray-400">
                  Full CRM pipeline with stages, meetings, demos, and complete lead management
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-brand-500/20 text-brand-300">
                    Pipeline Tracking
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-brand-500/20 text-brand-300">
                    Call Recording
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-brand-500/20 text-brand-300">
                    Meetings
                  </span>
                </div>
              </div>
            </div>
          </button>

          {/* Research Data Lead */}
          <button
            onClick={() => onSelect('RESEARCH_DATA')}
            className="w-full p-5 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-2 border-purple-500/20 hover:border-purple-500/40 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText size={24} className="text-purple-400" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-bold text-white text-lg mb-1">Research Data Lead</div>
                <div className="text-sm text-gray-400">
                  Quick data collection with MCQ-style form for basic lead information
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300">
                    Quick Entry
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300">
                    Media Upload
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300">
                    Simple Form
                  </span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-300">
            💡 <strong>Sales Lead:</strong> For full CRM workflow<br />
            💡 <strong>Research Data:</strong> For quick data collection
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
