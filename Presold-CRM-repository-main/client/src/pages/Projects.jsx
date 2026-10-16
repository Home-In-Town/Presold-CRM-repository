import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Search, Filter, MapPin, DollarSign, Plus,
  Calendar, User, Eye, Edit, Trash2, RefreshCw, Home
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

const CATEGORIES = ['RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE'];
const PROJECT_STATUS = ['PRE_LAUNCH', 'UNDER_CONSTRUCTION', 'READY_TO_MOVE', 'COMPLETED'];

// Helper function to format price in Indian Rupees with lakhs
const formatPriceInLakhs = (price) => {
  if (!price) return null;
  
  // Extract numbers from string (handles "45", "45 lakhs", "4500000", etc.)
  const numStr = price.toString().replace(/[^0-9.]/g, '');
  const num = parseFloat(numStr);
  
  if (isNaN(num)) return price; // Return original if not a number
  
  // If number is already in lakhs (< 1000), assume it's lakhs
  if (num < 1000) {
    return `₹ ${num} Lakh${num !== 1 ? 's' : ''}`;
  }
  
  // If number is large (> 100000), convert to lakhs
  const lakhs = (num / 100000).toFixed(2);
  return `₹ ${lakhs} Lakh${lakhs !== '1.00' ? 's' : ''}`;
};

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCity, setFilterCity] = useState('');

  useEffect(() => {
    loadProjects();
  }, [filterCategory, filterStatus, searchQuery]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.append('category', filterCategory);
      if (filterStatus) params.append('projectStatus', filterStatus);
      if (filterCity) params.append('city', filterCity);
      if (searchQuery) params.append('search', searchQuery);

      const response = await api.get(`/projects?${params}`);
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error('Load projects error:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;

    try {
      await api.delete(`/projects/${projectId}`);
      toast.success('Project deleted successfully');
      loadProjects();
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'RESIDENTIAL':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'COMMERCIAL':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'MIXED_USE':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PRE_LAUNCH':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'UNDER_CONSTRUCTION':
        return 'bg-orange-500/20 text-orange-400';
      case 'READY_TO_MOVE':
        return 'bg-green-500/20 text-green-400';
      case 'COMPLETED':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="text-brand-400" size={28} />
            Projects Database
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {user?.role === 'ADMIN' 
              ? 'View all projects uploaded by users'
              : 'Browse and manage your uploaded projects'}
          </p>
        </div>
        {user?.role !== 'ADMIN' && (
          <button
            onClick={() => navigate('/projects/upload')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Upload Project
          </button>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="glass-card p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input-field"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field"
            >
              <option value="">All Status</option>
              {PROJECT_STATUS.map(status => (
                <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-400">
            {projects.length} project{projects.length !== 1 ? 's' : ''} found
          </p>
          <button
            onClick={loadProjects}
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-48 bg-dark-700 rounded-lg mb-4" />
              <div className="h-4 bg-dark-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-dark-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <motion.div {...fadeUp} className="glass-card p-12 text-center">
          <Building2 className="mx-auto text-gray-600 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-white mb-2">No Projects Found</h3>
          <p className="text-sm text-gray-500 mb-6">
            {searchQuery || filterCategory || filterStatus
              ? 'Try adjusting your filters'
              : 'Start by uploading your first project'}
          </p>
          {user?.role !== 'ADMIN' && (
            <button
              onClick={() => navigate('/projects/upload')}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              <Plus size={16} />
              Upload Project
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card overflow-hidden hover:ring-2 hover:ring-brand-500/30 transition-all cursor-pointer group"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              {/* Cover Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={project.coverImageUrl || '/placeholder-project.jpg'}
                  alt={project.projectName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className={`text-[10px] px-2 py-1 rounded-full border font-semibold ${getCategoryColor(project.category)}`}>
                    {project.category.replace('_', ' ')}
                  </span>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${getStatusColor(project.projectStatus)}`}>
                    {project.projectStatus.replace(/_/g, ' ')}
                  </span>
                </div>
                {project.reraApproved && (
                  <div className="absolute top-3 right-3 bg-green-500/90 text-white text-[9px] px-2 py-1 rounded-full font-bold">
                    RERA
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-brand-400 transition-colors line-clamp-1">
                  {project.projectName}
                </h3>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin size={14} className="text-brand-400" />
                    <span className="line-clamp-1">{project.locationArea}, {project.city}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Home size={14} className="text-purple-400" />
                    <span>{project.propertyType.replace('_', ' ')}</span>
                  </div>

                  {project.startingPrice && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="font-medium text-white">
                        {formatPriceInLakhs(project.startingPrice) || project.startingPrice}
                      </span>
                    </div>
                  )}
                </div>

                {/* Configurations */}
                {project.configurations && JSON.parse(project.configurations).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {JSON.parse(project.configurations).slice(0, 3).map(config => (
                      <span
                        key={config}
                        className="text-[10px] bg-dark-600 text-gray-400 px-2 py-1 rounded"
                      >
                        {config}
                      </span>
                    ))}
                    {JSON.parse(project.configurations).length > 3 && (
                      <span className="text-[10px] bg-dark-600 text-gray-400 px-2 py-1 rounded">
                        +{JSON.parse(project.configurations).length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center">
                      <User size={12} className="text-brand-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Uploaded</p>
                      <p className="text-xs text-white font-medium">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar size={12} />
                    {new Date(project.createdAt).toLocaleTimeString()}
                  </div>
                </div>

                {/* Actions */}
                {(user?.role === 'ADMIN' || project.uploadedById === user?.id) && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/projects/${project.id}`);
                      }}
                      className="flex-1 bg-dark-600 text-gray-300 px-3 py-2 rounded-lg hover:bg-dark-500 text-xs flex items-center justify-center gap-1"
                    >
                      <Eye size={14} />
                      View
                    </button>
                    {user?.role !== 'ADMIN' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${project.id}/edit`);
                          }}
                          className="flex-1 bg-brand-500/20 text-brand-400 px-3 py-2 rounded-lg hover:bg-brand-500/30 text-xs flex items-center justify-center gap-1"
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(project.id);
                          }}
                          className="bg-red-500/20 text-red-400 px-3 py-2 rounded-lg hover:bg-red-500/30 text-xs"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
