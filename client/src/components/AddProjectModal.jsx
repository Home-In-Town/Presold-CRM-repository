import { useState, useRef, useEffect } from 'react';
import { X, Upload, MapPin, Plus, Trash2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Camera } from '@capacitor/camera';
import { CameraResultType, CameraSource } from '@capacitor/camera';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AddProjectModal({ isOpen, onClose, onSuccess, editMode = false, projectId = null }) {
  const [loading, setLoading] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);

  // Form data with all fields in one place
  const [formData, setFormData] = useState({
    // Basic Info
    projectName: '',
    category: 'RESIDENTIAL',
    propertyType: '',
    projectStatus: 'UNDER_CONSTRUCTION',
    
    // Location
    city: '',
    locationArea: '',
    address: '',
    googleMapLink: '',
    latitude: null,
    longitude: null,
    
    // RERA & Pricing
    reraApproved: false,
    reraNumber: '',
    startingPrice: '',
    pricePerSqFt: '',
    totalPriceRange: '',
    paymentPlan: '',
    bankLoanAvailable: true,
    
    // Specifications
    configurations: [],
    carpetAreaRange: '',
    totalFloors: '',
    facingOptions: '',
    gatedCommunity: true,
    
    // Amenities & Description
    amenities: [],
    description: '',
    usp: '',
  });

  // Media files
  const [coverImage, setCoverImage] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [layoutPlan, setLayoutPlan] = useState(null);
  const [layoutPlanPreview, setLayoutPlanPreview] = useState(null);
  const [brochure, setBrochure] = useState(null);

  // Refs for file inputs
  const coverImageRef = useRef(null);
  const galleryRef = useRef(null);
  const videoRef = useRef(null);
  const layoutRef = useRef(null);
  const brochureRef = useRef(null);

  const CATEGORIES = ['RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE'];
  const PROJECT_STATUS = ['PRE_LAUNCH', 'UNDER_CONSTRUCTION', 'READY_TO_MOVE', 'COMPLETED'];
  const PROPERTY_TYPES = ['Apartment', 'Villa', 'Plot', 'Office Space', 'Retail Space', 'Warehouse', 'Co-working Space'];
  const COMMON_AMENITIES = [
    'Swimming Pool', 'Gym', 'Clubhouse', 'Park', 'Children Play Area',
    'Security 24x7', 'Power Backup', 'Lift', 'Parking', 'Water Supply',
    'Maintenance Staff', 'Intercom', 'Rainwater Harvesting', 'Sewage Treatment',
    'Fire Safety', 'CCTV', 'Visitor Parking', 'Landscaped Garden', 'Jogging Track',
    'Sports Facility', 'Community Hall', 'Indoor Games', 'Wifi', 'Shopping Center'
  ];
  const COMMON_CONFIGS = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK', 'Studio', 'Penthouse'];

  // Load project data if in edit mode
  useEffect(() => {
    if (editMode && projectId) {
      loadProjectData();
    }
  }, [editMode, projectId]);

  const loadProjectData = async () => {
    setLoadingProject(true);
    try {
      const res = await api.get(`/projects/${projectId}`);
      const project = res.data.project;
      
      // Populate form data
      setFormData({
        projectName: project.projectName || '',
        category: project.category || 'RESIDENTIAL',
        propertyType: project.propertyType || '',
        projectStatus: project.projectStatus || 'UNDER_CONSTRUCTION',
        city: project.city || '',
        locationArea: project.locationArea || '',
        address: project.address || '',
        googleMapLink: project.googleMapLink || '',
        latitude: project.latitude,
        longitude: project.longitude,
        reraApproved: project.reraApproved || false,
        reraNumber: project.reraNumber || '',
        startingPrice: project.startingPrice || '',
        pricePerSqFt: project.pricePerSqFt || '',
        totalPriceRange: project.totalPriceRange || '',
        paymentPlan: project.paymentPlan || '',
        bankLoanAvailable: project.bankLoanAvailable !== false,
        configurations: project.configurations ? JSON.parse(project.configurations) : [],
        carpetAreaRange: project.carpetAreaRange || '',
        totalFloors: project.totalFloors || '',
        facingOptions: project.facingOptions || '',
        gatedCommunity: project.gatedCommunity !== false,
        amenities: project.amenities ? JSON.parse(project.amenities) : [],
        description: project.description || '',
        usp: project.usp || '',
      });

      // Set image previews
      if (project.coverImageUrl) {
        setCoverImagePreview(project.coverImageUrl);
      }
      if (project.layoutPlanUrl) {
        setLayoutPlanPreview(project.layoutPlanUrl);
      }

      toast.success('Project loaded for editing');
    } catch (err) {
      console.error('Load project error:', err);
      toast.error('Failed to load project data');
    } finally {
      setLoadingProject(false);
    }
  };

  // Calculate completion percentage
  const calculateCompletion = () => {
    const fields = [
      // Essential fields (20% each)
      formData.projectName,
      formData.category,
      formData.propertyType,
      formData.city,
      formData.locationArea,
      
      // Important fields (10% each)
      formData.projectStatus,
      formData.startingPrice || formData.pricePerSqFt,
      formData.configurations.length > 0,
      coverImage || coverImagePreview,
      
      // Optional fields (5% each)
      formData.description,
      formData.reraNumber,
      formData.amenities.length > 0,
      formData.carpetAreaRange,
      formData.googleMapLink,
      galleryImages.length > 0,
      layoutPlan || layoutPlanPreview,
      brochure,
      videos.length > 0,
    ];

    const weights = [20, 20, 20, 20, 20, 10, 10, 10, 10, 5, 5, 5, 5, 5, 5, 5, 5, 5];
    let total = 0;
    
    fields.forEach((field, index) => {
      if (field) total += weights[index] || 0;
    });

    return Math.min(100, Math.round(total));
  };

  const completion = calculateCompletion();

  // Update form field
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Toggle array item (for configurations and amenities)
  const toggleArrayItem = (field, item) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  // Capture location
  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    toast.loading('Getting location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateField('latitude', position.coords.latitude);
        updateField('longitude', position.coords.longitude);
        toast.dismiss();
        toast.success('Location captured!');
      },
      (error) => {
        toast.dismiss();
        toast.error('Failed to get location');
      }
    );
  };

  // Handle cover image
  const handleCoverImage = async (source) => {
    try {
      const image = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        quality: 80,
      });
      
      // Convert DataUrl to File
      const blob = await fetch(image.dataUrl).then(r => r.blob());
      const file = new File([blob], `cover_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      setCoverImage(file);
      setCoverImagePreview(image.dataUrl);
      toast.success('Cover image selected');
    } catch (err) {
      console.error('Cover image error:', err);
    }
  };

  // Handle gallery images
  const handleGalleryImages = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    const newImages = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36)
    }));

    setGalleryImages(prev => [...prev, ...newImages]);
    toast.success(`${imageFiles.length} image(s) added`);
  };

  const removeGalleryImage = (id) => {
    setGalleryImages(prev => prev.filter(img => img.id !== id));
  };

  // Handle videos
  const handleVideos = (e) => {
    const files = Array.from(e.target.files);
    const videoFiles = files.filter(f => f.type.startsWith('video/'));
    
    const newVideos = videoFiles.map(file => ({
      file,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      id: Math.random().toString(36)
    }));

    setVideos(prev => [...prev, ...newVideos]);
    toast.success(`${videoFiles.length} video(s) added`);
  };

  const removeVideo = (id) => {
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  // Handle layout plan
  const handleLayoutPlan = async (source) => {
    try {
      const image = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        quality: 80,
      });
      
      const blob = await fetch(image.dataUrl).then(r => r.blob());
      const file = new File([blob], `layout_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      setLayoutPlan(file);
      setLayoutPlanPreview(image.dataUrl);
      toast.success('Layout plan selected');
    } catch (err) {
      console.error('Layout plan error:', err);
    }
  };

  // Handle brochure
  const handleBrochure = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setBrochure(file);
    toast.success('Brochure selected');
  };

  // Submit form
  const handleSubmit = async () => {
    // Validation
    if (!formData.projectName.trim()) {
      toast.error('Project name is required');
      return;
    }
    if (!formData.city.trim()) {
      toast.error('City is required');
      return;
    }
    if (!formData.locationArea.trim()) {
      toast.error('Location area is required');
      return;
    }

    if (!editMode && !coverImage) {
      toast.error('Cover image is required');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      
      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (Array.isArray(formData[key])) {
          data.append(key, JSON.stringify(formData[key]));
        } else if (formData[key] !== null && formData[key] !== undefined) {
          data.append(key, formData[key]);
        }
      });

      // Append files
      if (coverImage) data.append('coverImage', coverImage);
      if (layoutPlan) data.append('layoutPlan', layoutPlan);
      if (brochure) data.append('brochure', brochure);
      
      galleryImages.forEach((img, index) => {
        data.append('galleryImages', img.file);
      });
      
      videos.forEach((vid, index) => {
        data.append('videos', vid.file);
      });

      if (editMode) {
        await api.put(`/projects/${projectId}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Project updated successfully! 🎉');
      } else {
        await api.post('/projects', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Project uploaded successfully! 🎉');
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Submit error:', err);
      toast.error(err.response?.data?.error || `Failed to ${editMode ? 'update' : 'upload'} project`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-dark-800 rounded-2xl w-full max-w-4xl border border-dark-700 shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header with Completion Bar */}
        <div className="p-6 border-b border-dark-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">{editMode ? 'Edit Project' : 'Upload New Project'}</h2>
              <p className="text-sm text-gray-400 mt-1">Fill in the details below</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg bg-dark-700 hover:bg-dark-600 flex items-center justify-center transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Completion Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Completion</span>
              <span className={`font-bold ${completion === 100 ? 'text-green-400' : 'text-brand-400'}`}>
                {completion}%
              </span>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completion}%` }}
                className={`h-full ${completion === 100 ? 'bg-green-500' : 'bg-brand-500'}`}
              />
            </div>
            {completion === 100 && (
              <div className="flex items-center gap-2 text-green-400 text-xs">
                <CheckCircle size={14} />
                <span>All essential fields completed!</span>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loadingProject ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-400">Loading project data...</p>
            </div>
          ) : (
            <>
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-dark-700 pb-2">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Project Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.projectName}
                      onChange={(e) => updateField('projectName', e.target.value)}
                      placeholder="Enter project name"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Category <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => updateField('category', e.target.value)}
                      className="input-field"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Property Type <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.propertyType}
                      onChange={(e) => updateField('propertyType', e.target.value)}
                      className="input-field"
                    >
                      <option value="">Select type</option>
                      {PROPERTY_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Project Status</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {PROJECT_STATUS.map(status => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => updateField('projectStatus', status)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            formData.projectStatus === status
                              ? 'bg-brand-500 text-white'
                              : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                          }`}
                        >
                          {status.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-dark-700 pb-2">Location</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      City <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="e.g., Mumbai, Delhi"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Location/Area <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.locationArea}
                      onChange={(e) => updateField('locationArea', e.target.value)}
                      placeholder="e.g., Andheri West, Connaught Place"
                      className="input-field"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Full Address</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => updateField('address', e.target.value)}
                      placeholder="Complete address"
                      rows={2}
                      className="input-field"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Google Maps Link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.googleMapLink}
                        onChange={(e) => updateField('googleMapLink', e.target.value)}
                        placeholder="Paste Google Maps link"
                        className="input-field flex-1"
                      />
                      <button
                        type="button"
                        onClick={handleCaptureLocation}
                        className="btn-secondary flex items-center gap-2 whitespace-nowrap"
                      >
                        <MapPin size={16} />
                        Capture
                      </button>
                    </div>
                    {(formData.latitude && formData.longitude) && (
                      <p className="text-xs text-green-400 mt-1">
                        ✓ Location captured: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* RERA & Pricing */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-dark-700 pb-2">RERA & Pricing</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="reraApproved"
                      checked={formData.reraApproved}
                      onChange={(e) => updateField('reraApproved', e.target.checked)}
                      className="w-5 h-5 rounded border-gray-600 text-brand-500 focus:ring-brand-500"
                    />
                    <label htmlFor="reraApproved" className="text-sm font-medium text-gray-300 cursor-pointer">
                      RERA Approved
                    </label>
                  </div>

                  {formData.reraApproved && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">RERA Number</label>
                      <input
                        type="text"
                        value={formData.reraNumber}
                        onChange={(e) => updateField('reraNumber', e.target.value)}
                        placeholder="Enter RERA registration number"
                        className="input-field"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Starting Price</label>
                    <input
                      type="text"
                      value={formData.startingPrice}
                      onChange={(e) => updateField('startingPrice', e.target.value)}
                      placeholder="e.g., 45 Lakhs or 4500000"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Price per Sq.Ft</label>
                    <input
                      type="text"
                      value={formData.pricePerSqFt}
                      onChange={(e) => updateField('pricePerSqFt', e.target.value)}
                      placeholder="e.g., ₹5000/sq.ft"
                      className="input-field"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Total Price Range</label>
                    <input
                      type="text"
                      value={formData.totalPriceRange}
                      onChange={(e) => updateField('totalPriceRange', e.target.value)}
                      placeholder="e.g., 45 Lakhs - 1.2 Crores"
                      className="input-field"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Payment Plan</label>
                    <input
                      type="text"
                      value={formData.paymentPlan}
                      onChange={(e) => updateField('paymentPlan', e.target.value)}
                      placeholder="e.g., 20-80, 10-90, etc."
                      className="input-field"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="bankLoan"
                      checked={formData.bankLoanAvailable}
                      onChange={(e) => updateField('bankLoanAvailable', e.target.checked)}
                      className="w-5 h-5 rounded border-gray-600 text-brand-500 focus:ring-brand-500"
                    />
                    <label htmlFor="bankLoan" className="text-sm font-medium text-gray-300 cursor-pointer">
                      Bank Loan Available
                    </label>
                  </div>
                </div>
              </div>

              {/* Specifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-dark-700 pb-2">Specifications</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Configurations</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {COMMON_CONFIGS.map(config => (
                      <button
                        key={config}
                        type="button"
                        onClick={() => toggleArrayItem('configurations', config)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          formData.configurations.includes(config)
                            ? 'bg-brand-500 text-white'
                            : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                        }`}
                      >
                        {config}
                      </button>
                    ))}
                  </div>
                  {formData.configurations.length > 0 && (
                    <p className="text-xs text-green-400">Selected: {formData.configurations.join(', ')}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Carpet Area Range</label>
                    <input
                      type="text"
                      value={formData.carpetAreaRange}
                      onChange={(e) => updateField('carpetAreaRange', e.target.value)}
                      placeholder="e.g., 650 - 1200 sq.ft"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Total Floors</label>
                    <input
                      type="text"
                      value={formData.totalFloors}
                      onChange={(e) => updateField('totalFloors', e.target.value)}
                      placeholder="e.g., G+14"
                      className="input-field"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Facing Options</label>
                    <input
                      type="text"
                      value={formData.facingOptions}
                      onChange={(e) => updateField('facingOptions', e.target.value)}
                      placeholder="e.g., North, South, East, West"
                      className="input-field"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="gatedCommunity"
                      checked={formData.gatedCommunity}
                      onChange={(e) => updateField('gatedCommunity', e.target.checked)}
                      className="w-5 h-5 rounded border-gray-600 text-brand-500 focus:ring-brand-500"
                    />
                    <label htmlFor="gatedCommunity" className="text-sm font-medium text-gray-300 cursor-pointer">
                      Gated Community
                    </label>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-dark-700 pb-2">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {COMMON_AMENITIES.map(amenity => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleArrayItem('amenities', amenity)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        formData.amenities.includes(amenity)
                          ? 'bg-purple-500 text-white'
                          : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                      }`}
                    >
                      {amenity}
                    </button>
                  ))}
                </div>
                {formData.amenities.length > 0 && (
                  <p className="text-xs text-purple-400">
                    {formData.amenities.length} amenities selected
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-dark-700 pb-2">Description</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Project Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Detailed project description..."
                    rows={4}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Unique Selling Points (USP)</label>
                  <textarea
                    value={formData.usp}
                    onChange={(e) => updateField('usp', e.target.value)}
                    placeholder="What makes this project special?"
                    rows={3}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Media Uploads */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-dark-700 pb-2">Media & Files</h3>
                
                {/* Cover Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cover Image <span className="text-red-400">*</span>
                  </label>
                  {coverImagePreview ? (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden group">
                      <img src={coverImagePreview} alt="Cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleCoverImage('gallery')}
                          className="btn-primary px-4 py-2"
                        >
                          Change
                        </button>
                        {!editMode && (
                          <button
                            onClick={() => { setCoverImage(null); setCoverImagePreview(null); }}
                            className="btn-danger px-4 py-2"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleCoverImage('camera')}
                        className="btn-secondary flex items-center justify-center gap-2 py-8"
                      >
                        <Upload size={20} />
                        Take Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCoverImage('gallery')}
                        className="btn-secondary flex items-center justify-center gap-2 py-8"
                      >
                        <Upload size={20} />
                        Choose from Gallery
                      </button>
                    </div>
                  )}
                </div>

                {/* Gallery Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Gallery Images (Multiple)
                  </label>
                  <input
                    ref={galleryRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleGalleryImages}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => galleryRef.current?.click()}
                    className="btn-secondary w-full flex items-center justify-center gap-2 py-4"
                  >
                    <Plus size={20} />
                    Add Gallery Images
                  </button>
                  {galleryImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {galleryImages.map(img => (
                        <div key={img.id} className="relative group">
                          <img src={img.preview} alt="" className="w-full h-24 object-cover rounded-lg" />
                          <button
                            onClick={() => removeGalleryImage(img.id)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={12} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Videos */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Videos (Multiple)
                  </label>
                  <input
                    ref={videoRef}
                    type="file"
                    multiple
                    accept="video/*"
                    onChange={handleVideos}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => videoRef.current?.click()}
                    className="btn-secondary w-full flex items-center justify-center gap-2 py-4"
                  >
                    <Plus size={20} />
                    Add Videos
                  </button>
                  {videos.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {videos.map(video => (
                        <div key={video.id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                          <div>
                            <p className="text-sm text-white">{video.name}</p>
                            <p className="text-xs text-gray-400">{video.size}</p>
                          </div>
                          <button
                            onClick={() => removeVideo(video.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Layout Plan */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Layout/Floor Plan</label>
                  {layoutPlanPreview ? (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden group">
                      <img src={layoutPlanPreview} alt="Layout" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleLayoutPlan('gallery')}
                          className="btn-primary px-4 py-2"
                        >
                          Change
                        </button>
                        {!editMode && (
                          <button
                            onClick={() => { setLayoutPlan(null); setLayoutPlanPreview(null); }}
                            className="btn-danger px-4 py-2"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleLayoutPlan('camera')}
                        className="btn-secondary flex items-center justify-center gap-2 py-8"
                      >
                        <Upload size={20} />
                        Take Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLayoutPlan('gallery')}
                        className="btn-secondary flex items-center justify-center gap-2 py-8"
                      >
                        <Upload size={20} />
                        Choose from Gallery
                      </button>
                    </div>
                  )}
                </div>

                {/* Brochure */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Brochure (PDF)</label>
                  <input
                    ref={brochureRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleBrochure}
                    className="hidden"
                  />
                  {brochure ? (
                    <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                      <div>
                        <p className="text-sm text-white">{brochure.name}</p>
                        <p className="text-xs text-gray-400">{(brochure.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                      <button
                        onClick={() => setBrochure(null)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => brochureRef.current?.click()}
                      className="btn-secondary w-full flex items-center justify-center gap-2 py-4"
                    >
                      <Upload size={20} />
                      Upload Brochure PDF
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-dark-700 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || loadingProject || completion < 60}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Uploading...' : editMode ? 'Update Project' : 'Upload Project'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
