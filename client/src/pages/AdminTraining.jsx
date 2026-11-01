import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, Users, Award, Calendar, Clock, Trash2, X, Upload, Check } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AdminTraining() {
  const [modules, setModules] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      const res = await api.get('/training/modules');
      setModules(res.data.modules || []);
    } catch (err) {
      toast.error('Failed to load training modules');
    }
  };

  const viewStats = async (module) => {
    try {
      const res = await api.get(`/training/modules/${module.id}/stats`);
      setStats({ module, ...res.data.stats });
    } catch (err) {
      toast.error('Failed to load statistics');
    }
  };

  const deleteModule = async (moduleId) => {
    if (!confirm('Are you sure you want to delete this training module? This cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/training/modules/${moduleId}`);
      toast.success('Training module deleted');
      loadModules();
    } catch (err) {
      toast.error('Failed to delete module');
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Training Modules</h1>
          <p className="text-sm text-gray-400 mt-1">Schedule training videos with quizzes</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Create Training
        </button>
      </div>

      {/* Modules List */}
      <div className="grid gap-4">
        {modules.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Play size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No training modules yet</p>
            <p className="text-sm text-gray-500 mt-2">Create your first training module to get started</p>
          </div>
        ) : (
          modules.map(module => (
            <ModuleCard
              key={module.id}
              module={module}
              onViewStats={() => viewStats(module)}
              onDelete={() => deleteModule(module.id)}
            />
          ))
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateTrainingModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              loadModules();
            }}
          />
        )}
      </AnimatePresence>

      {/* Stats Modal */}
      <AnimatePresence>
        {stats && (
          <StatsModal
            stats={stats}
            onClose={() => setStats(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ModuleCard({ module, onViewStats, onDelete }) {
  const completionRate = module.completions.length > 0
    ? (module.completions.filter(c => c.quizCompleted).length / module.completions.length) * 100
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">{module.topicName}</h3>
          {module.description && (
            <p className="text-sm text-gray-400 mb-4">{module.description}</p>
          )}
          
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <Calendar size={16} className="text-brand-400" />
              {new Date(module.scheduledDate).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Clock size={16} className="text-brand-400" />
              {module.scheduledTime}
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Award size={16} className="text-brand-400" />
              {module.questions.length} Questions
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Users size={16} className="text-brand-400" />
              {module.completions.filter(c => c.quizCompleted).length} Completed
            </div>
          </div>

          {/* Progress Bar */}
          {module.completions.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Completion Rate</span>
                <span>{Math.round(completionRate)}%</span>
              </div>
              <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-500 transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onViewStats}
            className="p-2 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 transition-colors"
            title="View Statistics"
          >
            <Users size={18} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
            title="Delete Module"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function CreateTrainingModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    topicName: '',
    description: '',
    scheduledDate: '',
    scheduledTime: '09:00 AM',
    video: null
  });
  const [questions, setQuestions] = useState([
    { questionText: '', options: ['', '', '', ''], correctAnswer: 0 }
  ]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const addQuestion = () => {
    setQuestions([...questions, { questionText: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const updateOption = (qIndex, optIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = value;
    setQuestions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.topicName || !formData.scheduledDate || !formData.video) {
      toast.error('Please fill all required fields');
      return;
    }

    const invalidQuestions = questions.filter(q => 
      !q.questionText || q.options.some(opt => !opt)
    );

    if (invalidQuestions.length > 0) {
      toast.error('Please complete all questions and options');
      return;
    }

    try {
      setUploading(true);
      
      const formDataToSend = new FormData();
      formDataToSend.append('topicName', formData.topicName);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('scheduledDate', formData.scheduledDate);
      formDataToSend.append('scheduledTime', formData.scheduledTime);
      formDataToSend.append('video', formData.video);
      formDataToSend.append('questions', JSON.stringify(questions));

      await api.post('/training/modules', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      toast.success('Training module created successfully!');
      onSuccess();
    } catch (err) {
      console.error('Create training error:', err);
      toast.error(err.response?.data?.error || 'Failed to create training module');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Create Training Module</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Topic Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Topic Name *
            </label>
            <input
              type="text"
              value={formData.topicName}
              onChange={(e) => setFormData({ ...formData, topicName: e.target.value })}
              className="input w-full"
              placeholder="e.g., Sales Techniques 101"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input w-full"
              rows={3}
              placeholder="Brief description of the training..."
            />
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date *
              </label>
              <input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Time *
              </label>
              <select
                value={formData.scheduledTime}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                className="input w-full"
                required
              >
                {generateTimeSlots().map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Video Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Training Video * (Max 500MB)
            </label>
            <div className="relative">
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setFormData({ ...formData, video: e.target.files[0] })}
                className="hidden"
                id="video-upload"
                required
              />
              <label
                htmlFor="video-upload"
                className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-gray-600 hover:border-brand-500 rounded-lg cursor-pointer transition-colors"
              >
                <Upload size={24} className="text-brand-400" />
                <span className="text-gray-300">
                  {formData.video ? formData.video.name : 'Choose video file'}
                </span>
              </label>
            </div>
          </div>

          {/* Questions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-gray-300">
                Quiz Questions *
              </label>
              <button
                type="button"
                onClick={addQuestion}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <Plus size={16} />
                Add Question
              </button>
            </div>

            <div className="space-y-6">
              {questions.map((question, qIndex) => (
                <div key={qIndex} className="p-4 bg-dark-800/50 rounded-lg border border-white/5">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="text-sm font-medium text-white">Question {qIndex + 1}</h4>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={question.questionText}
                    onChange={(e) => updateQuestion(qIndex, 'questionText', e.target.value)}
                    className="input w-full mb-4"
                    placeholder="Enter question..."
                    required
                  />

                  <div className="space-y-2">
                    {question.options.map((option, optIndex) => (
                      <div key={optIndex} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${qIndex}`}
                          checked={question.correctAnswer === optIndex}
                          onChange={() => updateQuestion(qIndex, 'correctAnswer', optIndex)}
                          className="w-4 h-4 text-brand-500"
                        />
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                          className="input flex-1"
                          placeholder={`Option ${optIndex + 1}`}
                          required
                        />
                        {question.correctAnswer === optIndex && (
                          <Check size={16} className="text-green-400" />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Select the correct answer by clicking the radio button
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div>
              <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-500 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={uploading}
            >
              {uploading ? 'Creating...' : 'Create Training'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function StatsModal({ stats, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">{stats.module.topicName}</h2>
            <p className="text-sm text-gray-400 mt-1">Training Statistics</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4">
            <p className="text-sm text-gray-400">Total Users</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.totalUsers}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-sm text-gray-400">Completed</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{stats.completed}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-sm text-gray-400">Pending</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.pending}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-sm text-gray-400">Avg Score</p>
            <p className="text-2xl font-bold text-brand-400 mt-1">
              {Math.round(stats.averageScore)}%
            </p>
          </div>
        </div>

        {/* Individual Scores */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Individual Results</h3>
          <div className="space-y-2">
            {stats.completions.map((completion) => (
              <div
                key={completion.userId}
                className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg"
              >
                <div>
                  <p className="text-white font-medium">{completion.userName}</p>
                  <p className="text-xs text-gray-400">{completion.userEmail}</p>
                </div>
                <div className="text-right">
                  {completion.quizCompleted ? (
                    <>
                      <p className="text-lg font-bold text-green-400">
                        {completion.score}/{completion.totalQuestions}
                      </p>
                      <p className="text-xs text-gray-400">
                        {Math.round(completion.percentage)}% • {new Date(completion.completedAt).toLocaleDateString()}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-yellow-400">
                      {completion.videoWatched ? 'Video Watched' : 'Pending'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Helper: Generate 12-hour time slots
function generateTimeSlots() {
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const period = hour < 12 ? 'AM' : 'PM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const time = `${displayHour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} ${period}`;
      slots.push(time);
    }
  }
  return slots;
}
