import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2, MapPin, DollarSign, Home, Calendar, User, ArrowLeft,
  CheckCircle, XCircle, FileText, Image as ImageIcon, Download,
  ExternalLink, Edit, Trash2
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

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

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      const response = await api.get(`/projects/${id}`);
      setProject(response.data.project);
      setSelectedImage(response.data.project.coverImageUrl);
    } catch (error) {
      toast.error('Failed to load project');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;

    try {
      await api.delete(`/projects/${id}`);
      toast.success('Project deleted successfully');
      navigate('/projects');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Building2 className="animate-pulse mx-auto text-brand-500 mb-3" size={48} />
          <p className="text-sm text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const galleryImages = project.galleryImageUrls ? JSON.parse(project.galleryImageUrls) : [];
  const configurations = project.configurations ? JSON.parse(project.configurations) : [];
  const facingOptions = project.facingOptions ? JSON.parse(project.facingOptions) : [];
  const amenities = project.amenities ? JSON.parse(project.amenities) : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div {...fadeUp} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/projects')}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{project.projectName}</h1>
            <p className="text-sm text-gray-500 mt-1">{project.projectType || 'Property Project'}</p>
          </div>
        </div>

        {(user?.role === 'ADMIN' || project.uploadedById === user?.id) && user?.role !== 'ADMIN' && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/projects/${id}/edit`)}
              className="btn-secondary flex items-center gap-2"
            >
              <Edit size={16} />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        )}
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Images */}
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="lg:col-span-2 space-y-4">
          {/* Main Image */}
          <div className="glass-card p-4">
            <div className="relative h-96 rounded-xl overflow-hidden">
              <img
                src={selectedImage || project.coverImageUrl || '/placeholder-project.jpg'}
                alt={project.projectName}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className={`text-xs px-3 py-1.5 rounded-full border font-semibold ${getCategoryColor(project.category)}`}>
                  {project.category.replace('_', ' ')}
                </span>
                <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${getStatusColor(project.projectStatus)}`}>
                  {project.projectStatus.replace(/_/g, ' ')}
                </span>
              </div>
              {project.reraApproved && (
                <div className="absolute top-4 right-4 bg-green-500 text-white text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1">
                  <CheckCircle size={14} />
                  RERA Approved
                </div>
              )}
            </div>

            {/* Gallery Thumbnails */}
            {galleryImages.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-white mb-3">Gallery</h3>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  <button
                    onClick={() => setSelectedImage(project.coverImageUrl)}
                    className={`relative h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === project.coverImageUrl ? 'border-brand-500' : 'border-transparent'
                    }`}
                  >
                    <img src={project.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                  </button>
                  {galleryImages.map((imgUrl, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(imgUrl)}
                      className={`relative h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImage === imgUrl ? 'border-brand-500' : 'border-transparent'
                      }`}
                    >
                      <img src={imgUrl} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description & Details */}
          <div className="glass-card p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Building2 size={18} className="text-brand-400" />
                Project Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Property Type</p>
                  <p className="text-sm text-white font-medium">{project.propertyType.replace('_', ' ')}</p>
                </div>

                {project.carpetAreaRange && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Carpet Area</p>
                    <p className="text-sm text-white font-medium">{project.carpetAreaRange}</p>
                  </div>
                )}

                {project.floorRange && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Floors</p>
                    <p className="text-sm text-white font-medium">{project.floorRange}</p>
                  </div>
                )}

                {project.gatedCommunity && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Community</p>
                    <p className="text-sm text-green-400 font-medium flex items-center gap-1">
                      <CheckCircle size={14} />
                      Gated Community
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Configurations */}
            {configurations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Configurations</h4>
                <div className="flex flex-wrap gap-2">
                  {configurations.map(config => (
                    <span key={config} className="text-xs bg-brand-500/20 text-brand-400 px-3 py-1.5 rounded-lg border border-brand-500/30">
                      {config}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Facing Options */}
            {facingOptions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Facing Options</h4>
                <div className="flex flex-wrap gap-2">
                  {facingOptions.map(facing => (
                    <span key={facing} className="text-xs bg-dark-600 text-gray-300 px-3 py-1.5 rounded-lg">
                      {facing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Amenities</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {amenities.map(amenity => (
                    <div key={amenity} className="flex items-center gap-2 text-xs text-gray-300">
                      <CheckCircle size={14} className="text-green-400" />
                      {amenity}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Plan */}
            {project.paymentPlan && (
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">Payment Plan</h4>
                <p className="text-sm text-gray-300 whitespace-pre-line">{project.paymentPlan}</p>
              </div>
            )}
          </div>

          {/* Documents */}
          {(project.layoutImageUrl || project.brochureUrl) && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText size={18} className="text-brand-400" />
                Documents
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.layoutImageUrl && (
                  <a
                    href={project.layoutImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                  >
                    <ImageIcon className="text-blue-400" size={24} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Layout Plan</p>
                      <p className="text-xs text-gray-500">View floor layout</p>
                    </div>
                    <ExternalLink size={16} className="text-gray-500" />
                  </a>
                )}
                {project.brochureUrl && (
                  <a
                    href={project.brochureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                  >
                    <Download className="text-red-400" size={24} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Brochure</p>
                      <p className="text-xs text-gray-500">Download PDF</p>
                    </div>
                    <ExternalLink size={16} className="text-gray-500" />
                  </a>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Right Column - Info */}
        <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="space-y-4">
          {/* Pricing */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign size={18} className="text-green-400" />
              Pricing
            </h3>
            <div className="space-y-4">
              {project.startingPrice && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Starting Price</p>
                  <p className="text-xl font-bold text-white">{formatPriceInLakhs(project.startingPrice)}</p>
                </div>
              )}
              {project.pricePerSqFt && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Price per Sq.Ft</p>
                  <p className="text-lg font-semibold text-white">{formatPriceInLakhs(project.pricePerSqFt)}</p>
                </div>
              )}
              {project.totalPriceRange && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total Price Range</p>
                  <p className="text-sm text-white">{formatPriceInLakhs(project.totalPriceRange)}</p>
                </div>
              )}
              {project.bankLoanAvailable && (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle size={16} />
                  Bank Loan Available
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-brand-400" />
              Location
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Area</p>
                <p className="text-sm text-white">{project.locationArea}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">City</p>
                <p className="text-sm text-white">{project.city}</p>
              </div>
              {project.googleMapLink && (
                <a
                  href={project.googleMapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300"
                >
                  <ExternalLink size={14} />
                  View on Google Maps
                </a>
              )}
              {project.latitude && project.longitude && (
                <p className="text-xs text-gray-600 font-mono">
                  {project.latitude.toFixed(6)}, {project.longitude.toFixed(6)}
                </p>
              )}
            </div>
          </div>

          {/* RERA Details */}
          {project.reraApproved && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText size={18} className="text-green-400" />
                RERA Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle size={16} />
                  RERA Approved
                </div>
                {project.reraNumber && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">RERA Number</p>
                    <p className="text-sm text-white font-mono">{project.reraNumber}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Uploader Info */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User size={18} className="text-purple-400" />
              Upload Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Uploaded On</p>
                <p className="text-sm text-white flex items-center gap-2">
                  <Calendar size={14} />
                  {new Date(project.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                <p className="text-sm text-white flex items-center gap-2">
                  <Calendar size={14} />
                  {new Date(project.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
