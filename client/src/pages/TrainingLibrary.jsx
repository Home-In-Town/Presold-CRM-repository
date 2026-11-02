import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Award, Calendar, Clock, CheckCircle, Lock, TrendingUp } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import TrainingPopup from '../components/TrainingPopup';

export default function TrainingLibrary() {
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [filter, setFilter] = useState('all'); // all, completed, pending
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      setLoading(true);
      const res = await api.get('/training/my-modules');
      setModules(res.data.modules || []);
    } catch (err) {
      toast.error('Failed to load training modules');
    } finally {
      setLoading(false);
    }
  };

  const startTraining = (module) => {
    // Check if already completed
    if (module.completion?.quizCompleted) {
      toast('You have already completed this training', { icon: '✅' });
      return;
    }
    
    // Check if scheduled for future
    const scheduledDate = new Date(module.scheduledDate);
    const now = new Date();
    if (scheduledDate > now) {
      toast.error('This training is not available yet');
      return;
    }

    setSelectedModule(module);
  };

  const filteredModules = modules.filter(module => {
    if (filter === 'completed') return module.completion?.quizCompleted;
    if (filter === 'pending') return !module.completion?.quizCompleted;
    return true;
  });

  // Calculate stats
  const totalModules = modules.length;
  const completedModules = modules.filter(m => m.completion?.quizCompleted).length;
  const averageScore = modules.filter(m => m.completion?.percentage !== null && m.completion?.percentage !== undefined)
    .reduce((sum, m) => sum + m.completion.percentage, 0) / completedModules || 0;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Training Library</h1>
        <p className="text-sm text-gray-400 mt-1">Browse and complete training modules</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center">
              <Play size={24} className="text-brand-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Trainings</p>
              <p className="text-2xl font-bold text-white">{totalModules}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle size={24} className="text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-white">{completedModules}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <TrendingUp size={24} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Average Score</p>
              <p className="text-2xl font-bold text-white">
                {completedModules > 0 ? Math.round(averageScore) : 0}%
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-brand-500 text-white'
              : 'bg-dark-800/50 text-gray-400 hover:bg-dark-700'
          }`}
        >
          All Trainings
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-brand-500 text-white'
              : 'bg-dark-800/50 text-gray-400 hover:bg-dark-700'
          }`}
        >
          Pending ({totalModules - completedModules})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'completed'
              ? 'bg-brand-500 text-white'
              : 'bg-dark-800/50 text-gray-400 hover:bg-dark-700'
          }`}
        >
          Completed ({completedModules})
        </button>
      </div>

      {/* Training Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Play size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">
            {filter === 'completed' 
              ? 'No completed trainings yet'
              : filter === 'pending'
              ? 'No pending trainings'
              : 'No training modules available'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModules.map((module) => (
            <TrainingCard
              key={module.id}
              module={module}
              onStart={() => startTraining(module)}
            />
          ))}
        </div>
      )}

      {/* Training Popup */}
      <AnimatePresence>
        {selectedModule && (
          <TrainingPopup
            module={selectedModule}
            onComplete={() => {
              setSelectedModule(null);
              loadModules(); // Refresh to update completion status
              toast.success('Training completed successfully!');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TrainingCard({ module, onStart }) {
  const isCompleted = module.completion?.quizCompleted;
  const scheduledDate = new Date(module.scheduledDate);
  const now = new Date();
  const isAvailable = scheduledDate <= now;
  const isLocked = !isAvailable;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-card p-6 relative overflow-hidden ${
        isLocked ? 'opacity-60' : ''
      }`}
    >
      {/* Completion Badge */}
      {isCompleted && (
        <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle size={20} className="text-green-400" />
        </div>
      )}

      {/* Lock Badge */}
      {isLocked && (
        <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center">
          <Lock size={20} className="text-gray-400" />
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2 pr-12">
          {module.topicName}
        </h3>
        {module.description && (
          <p className="text-sm text-gray-400 line-clamp-2">{module.description}</p>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Calendar size={16} className="text-brand-400" />
          {scheduledDate.toLocaleDateString()}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Clock size={16} className="text-brand-400" />
          {module.scheduledTime}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Award size={16} className="text-brand-400" />
          {module.questionCount} Questions
        </div>
      </div>

      {/* Score Display */}
      {isCompleted && module.completion && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-400 font-medium">Your Score</span>
            <div className="text-right">
              <p className="text-lg font-bold text-green-400">
                {module.completion.score}/{module.completion.totalQuestions}
              </p>
              <p className="text-xs text-gray-400">
                {Math.round(module.completion.percentage)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={onStart}
        disabled={isLocked}
        className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
          isLocked
            ? 'bg-gray-600/20 text-gray-500 cursor-not-allowed'
            : isCompleted
            ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30'
            : 'bg-brand-500 hover:bg-brand-600 text-white'
        }`}
      >
        {isLocked ? (
          <>
            <Lock size={18} />
            Available on {scheduledDate.toLocaleDateString()}
          </>
        ) : isCompleted ? (
          <>
            <CheckCircle size={18} />
            View Again
          </>
        ) : (
          <>
            <Play size={18} />
            Start Training
          </>
        )}
      </button>
    </motion.div>
  );
}
