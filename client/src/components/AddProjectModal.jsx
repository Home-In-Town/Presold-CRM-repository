import { useState, useRef } from 'react';
import { X, Upload, MapPin, FileText, Image, Video, File } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AddProjectModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // Multi-step form (1-4)

  // Form data
  const [formData, setFormData] = useState({
    // Basic Info
    projectName: '',
    type: '',
    category: 'RESIDENTIAL',
    propertyType: '',
    
    // Location
    city: '',
    area: '',
    address: '',
    googleMapLink: '',
    latitude: null,
    longitude: null,
    
    // RERA & Status
    reraApproved: 'NO',
    reraNumber: '',
    projectStatus: 'UNDER_CONSTRUCTION',
    
    // Pricing
    startingPrice: '',
    pricePerSqFt: '',
    totalPriceRange: '',
    paymentPlan: '',
    bankLoanAvailable: 'YES',
    
    // Specifications
    bhkOptions: '',
    carpetAreaRange: '',
    floorRange: '',
    facingOptions: '',
    gatedCommunity: 'YES',
    
    // Amenities
    amenities: '',
  });

  // Files
  const [coverImage, setCoverImage] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState(null);
  const [multipleImages, setMultipleImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [layoutImage, setLayoutImage] = useState(null);
  const [layoutImagePreview, setLayoutImagePreview] = useState(null);
  const [brochure, setBrochure] = useState(null);

  // Category options
  const CATEGORIES = [
    { value: 'RESIDENTIAL', label: 'Residential' },
    { value: 'COMMERCIAL', label: 'Commercial' },
    { value: 'MIXED_USE', label: 'Mixed Use' }
  ];

  const PROJECT_STATUS = [
    { value: 'PRE_LAUNCH', label: 'Pre-Launch' },
    { value: 'UNDER_CONSTRUCTION', label: 'Under Construction' },
    { value: 'READY_TO_MOVE', label: 'Ready to Move' },
    { value: 'COMPLETED', label: 'Completed' }
  ];

  // Capture location
  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    toast.loading('Getting location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        toast.dismiss();
        toast.success('Location captured!');
      },
      (error) => {
        toast.dismiss();
        toast.error('Failed to get location: ' + error.message);
      }
    );
  };

  // Handle file uploads
  const handleCoverImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setCoverImage(file);
    setCoverImagePreview(URL.createObjectURL(file));
  };

  const handleMultipleImagesUpload = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast.error('Some files were not images and were skipped');
    }

    const newImages = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36)
    }));

    setMultipleImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (id) => {
    setMultipleImages(prev => prev.filter(img => img.id !== id));
  };

  const handleVideosUpload = (e) => {
    const files = Array.from(e.target.files);
    const videoFiles = files.filter(f => f.type.startsWith('video/'));
    
    if (videoFiles.length !== files.length) {
      toast.error('Some files were not videos and were skipped');
    }

    const newVideos = videoFiles.map(file => ({
      file,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      id: Math.random().toString(36)
    }));

    setVideos(prev => [...prev, ...newVideos]);
  };

  const removeVideo = (id) => {
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  const handleLayoutImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setLayoutImage(file);
    setLayoutImagePreview(URL.createObjectURL(file));
  };

  const handleBrochureUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.includes('pdf') && !file.type.startsWith('image/')) {
      toast.error('Please upload a PDF or image file');
      return;
    }

    setBrochure(file);
  };

  // Submit form
  const validateStep = (currentStep) => {
    switch(currentStep) {
      case 1:
        // Basic Info validation
        if (!formData.projectName.trim()) {
          toast.error('Project name is required');
          return false;
        }
        if (!formData.category) {
          toast.error('Category is required');
          return false;
        }
        if (!formData.propertyType.trim()) {
          toast.error('Property type is required');
          return false;
        }
        if (!formData.projectStatus) {
          toast.error('Project status is required');
          return false;
        }
        return true;

      case 2:
        // Location & RERA validation
        if (!formData.city.trim()) {
          toast.error('City is required');
          return false;
        }
        if (!formData.area.trim()) {
          toast.error('Area is required');
          return false;
        }
        return true;

      case 3:
        // Pricing validation - at least starting price
        if (!formData.startingPrice.trim()) {
          toast.error('Starting price is required');
          return false;
        }
        return true;

      case 4:
        // Files validation
        if (!coverImage) {
          toast.error('Cover image is compulsory!');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleSubmit = async () => {
    // Final validation before submit
    if (!validateStep(4)) {
      return;
    }

    setLoading(true);
    try {
      const submitData = new FormData();
      
      // Append all text fields
      submitData.append('projectName', formData.projectName);
      submitData.append('projectType', formData.type || 'RESIDENTIAL');
      submitData.append('category', formData.category);
      submitData.append('propertyType', formData.propertyType);
      submitData.append('city', formData.city);
      submitData.append('locationArea', formData.area);
      submitData.append('locationAddress', formData.address || '');
      submitData.append('projectStatus', formData.projectStatus);
      
      if (formData.googleMapLink) submitData.append('googleMapLink', formData.googleMapLink);
      if (formData.latitude) submitData.append('latitude', formData.latitude);
      if (formData.longitude) submitData.append('longitude', formData.longitude);
      
      submitData.append('reraApproved', formData.reraApproved === 'YES');
      if (formData.reraNumber) submitData.append('reraNumber', formData.reraNumber);
      
      if (formData.startingPrice) submitData.append('startingPrice', formData.startingPrice);
      if (formData.pricePerSqFt) submitData.append('pricePerSqFt', formData.pricePerSqFt);
      if (formData.totalPriceRange) submitData.append('totalPriceRange', formData.totalPriceRange);
      if (formData.paymentPlan) submitData.append('paymentPlan', formData.paymentPlan);
      submitData.append('bankLoanAvailable', formData.bankLoanAvailable === 'YES');
      
      // Specifications
      if (formData.bhkOptions) submitData.append('bhkOptions', JSON.stringify(formData.bhkOptions.split(',').map(s => s.trim())));
      if (formData.carpetAreaRange) submitData.append('carpetAreaRange', formData.carpetAreaRange);
      if (formData.floorRange) submitData.append('floorRange', formData.floorRange);
      if (formData.facingOptions) submitData.append('facingOptions', JSON.stringify(formData.facingOptions.split(',').map(s => s.trim())));
      submitData.append('gatedCommunity', formData.gatedCommunity === 'YES');
      if (formData.amenities) submitData.append('amenities', JSON.stringify(formData.amenities.split(',').map(s => s.trim())));

      // Append cover image (required)
      submitData.append('coverImage', coverImage);

      // Append gallery images
      multipleImages.forEach((img) => {
        submitData.append('galleryImages', img.file);
      });

      // Append videos
      videos.forEach((video) => {
        submitData.append('videos', video.file);
      });

      // Append layout image
      if (layoutImage) {
        submitData.append('layoutImage', layoutImage);
      }

      // Append brochure
      if (brochure) {
        submitData.append('brochure', brochure);
      }

      await api.post('/projects', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Project uploaded successfully!');
      onSuccess();
    } catch (err) {
      console.error('Failed to add project:', err);
      toast.error(err.response?.data?.error || 'Failed to add project');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-dark-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 className="text-xl font-bold text-white">Add New Project</h2>
              <p className="text-sm text-gray-400">Step {step} of 4</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Step 1: Basic Information */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Project Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Project Name * (Required)
                    </label>
                    <input
                      type="text"
                      value={formData.projectName}
                      onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                      placeholder="Enter project name"
                      className="input w-full"
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Type
                    </label>
                    <input
                      type="text"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      placeholder="e.g., Luxury Apartments"
                      className="input w-full"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="input w-full"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Property Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Property Type
                    </label>
                    <input
                      type="text"
                      value={formData.propertyType}
                      onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                      placeholder="e.g., Apartment, Villa, Plot"
                      className="input w-full"
                    />
                  </div>

                  {/* Project Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Project Status *
                    </label>
                    <select
                      value={formData.projectStatus}
                      onChange={(e) => setFormData({ ...formData, projectStatus: e.target.value })}
                      className="input w-full"
                    >
                      {PROJECT_STATUS.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Location & RERA */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      City * (Required)
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Enter city"
                      className="input w-full"
                    />
                  </div>

                  {/* Area */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Area
                    </label>
                    <input
                      type="text"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      placeholder="Enter area/locality"
                      className="input w-full"
                    />
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Address
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Enter complete address"
                      rows={3}
                      className="input w-full"
                    />
                  </div>

                  {/* Capture Location */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Location Coordinates
                    </label>
                    <button
                      onClick={handleCaptureLocation}
                      className="btn-secondary w-full flex items-center justify-center gap-2"
                    >
                      <MapPin size={18} />
                      <span>
                        {formData.latitude && formData.longitude
                          ? `Location Captured (${formData.latitude.toFixed(6)}, ${formData.longitude.toFixed(6)})`
                          : 'Capture Current Location'}
                      </span>
                    </button>
                  </div>

                  {/* Google Map Link */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Google Map Link
                    </label>
                    <input
                      type="url"
                      value={formData.googleMapLink}
                      onChange={(e) => setFormData({ ...formData, googleMapLink: e.target.value })}
                      placeholder="https://maps.google.com/..."
                      className="input w-full"
                    />
                  </div>

                  {/* RERA Approved */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      RERA Approved *
                    </label>
                    <select
                      value={formData.reraApproved}
                      onChange={(e) => setFormData({ ...formData, reraApproved: e.target.value })}
                      className="input w-full"
                    >
                      <option value="YES">Yes</option>
                      <option value="NO">No</option>
                    </select>
                  </div>

                  {/* RERA Number */}
                  {formData.reraApproved === 'YES' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        RERA Number
                      </label>
                      <input
                        type="text"
                        value={formData.reraNumber}
                        onChange={(e) => setFormData({ ...formData, reraNumber: e.target.value })}
                        placeholder="Enter RERA number"
                        className="input w-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Pricing & Specifications */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Starting Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Starting Price (₹ Lakhs) * (Required)
                    </label>
                    <input
                      type="number"
                      value={formData.startingPrice}
                      onChange={(e) => setFormData({ ...formData, startingPrice: e.target.value })}
                      placeholder="e.g., 45"
                      step="0.01"
                      className="input w-full"
                    />
                  </div>

                  {/* Price Per Sq.Ft */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Price per Sq.Ft (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.pricePerSqFt}
                      onChange={(e) => setFormData({ ...formData, pricePerSqFt: e.target.value })}
                      placeholder="e.g., 5500"
                      className="input w-full"
                    />
                  </div>

                  {/* Total Price Range */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Total Price Range
                    </label>
                    <input
                      type="text"
                      value={formData.totalPriceRange}
                      onChange={(e) => setFormData({ ...formData, totalPriceRange: e.target.value })}
                      placeholder="e.g., ₹ 45 Lakhs - ₹ 1.2 Crores"
                      className="input w-full"
                    />
                  </div>

                  {/* Payment Plan */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Payment Plan
                    </label>
                    <textarea
                      value={formData.paymentPlan}
                      onChange={(e) => setFormData({ ...formData, paymentPlan: e.target.value })}
                      placeholder="e.g., 20% on booking, 80% on possession"
                      rows={2}
                      className="input w-full"
                    />
                  </div>

                  {/* Bank Loan Available */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Bank Loan Available *
                    </label>
                    <select
                      value={formData.bankLoanAvailable}
                      onChange={(e) => setFormData({ ...formData, bankLoanAvailable: e.target.value })}
                      className="input w-full"
                    >
                      <option value="YES">Yes</option>
                      <option value="NO">No</option>
                    </select>
                  </div>

                  {/* BHK Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      BHK Options
                    </label>
                    <input
                      type="text"
                      value={formData.bhkOptions}
                      onChange={(e) => setFormData({ ...formData, bhkOptions: e.target.value })}
                      placeholder="e.g., 2 BHK, 3 BHK, 4 BHK"
                      className="input w-full"
                    />
                  </div>

                  {/* Carpet Area Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Carpet Area Range
                    </label>
                    <input
                      type="text"
                      value={formData.carpetAreaRange}
                      onChange={(e) => setFormData({ ...formData, carpetAreaRange: e.target.value })}
                      placeholder="e.g., 650 - 1200 sq.ft"
                      className="input w-full"
                    />
                  </div>

                  {/* Floor Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Floor Range
                    </label>
                    <input
                      type="text"
                      value={formData.floorRange}
                      onChange={(e) => setFormData({ ...formData, floorRange: e.target.value })}
                      placeholder="e.g., Ground to 15th Floor"
                      className="input w-full"
                    />
                  </div>

                  {/* Facing Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Facing Options
                    </label>
                    <input
                      type="text"
                      value={formData.facingOptions}
                      onChange={(e) => setFormData({ ...formData, facingOptions: e.target.value })}
                      placeholder="e.g., North, East, West"
                      className="input w-full"
                    />
                  </div>

                  {/* Gated Community */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Gated Community
                    </label>
                    <select
                      value={formData.gatedCommunity}
                      onChange={(e) => setFormData({ ...formData, gatedCommunity: e.target.value })}
                      className="input w-full"
                    >
                      <option value="YES">Yes</option>
                      <option value="NO">No</option>
                    </select>
                  </div>

                  {/* Amenities */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Amenities
                    </label>
                    <textarea
                      value={formData.amenities}
                      onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                      placeholder="Swimming Pool, Gym, Club House, Garden, Kids Play Area, etc."
                      rows={3}
                      className="input w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Images & Documents */}
            {step === 4 && (
              <div className="space-y-6">
                {/* Cover Image (Compulsory) */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cover Image * (Compulsory)
                  </label>
                  {coverImagePreview ? (
                    <div className="relative w-full h-40 bg-dark-900 rounded-lg overflow-hidden">
                      <img src={coverImagePreview} alt="Cover" className="w-full h-full object-cover" />
                      <button
                        onClick={() => {
                          setCoverImage(null);
                          setCoverImagePreview(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg hover:bg-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/20 rounded-lg hover:border-brand-500 transition-colors cursor-pointer bg-dark-900">
                      <Upload className="text-gray-500 mb-2" size={28} />
                      <span className="text-sm text-gray-400">Click to upload cover image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Multiple Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Multiple Images (Gallery)
                  </label>
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-white/20 rounded-lg hover:border-brand-500 transition-colors cursor-pointer bg-dark-900">
                    <Image className="text-gray-500 mb-2" size={24} />
                    <span className="text-sm text-gray-400">Click to upload multiple images</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleMultipleImagesUpload}
                      className="hidden"
                    />
                  </label>
                  {multipleImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      {multipleImages.map(img => (
                        <div key={img.id} className="relative aspect-square bg-dark-900 rounded-lg overflow-hidden">
                          <img src={img.preview} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeImage(img.id)}
                            className="absolute top-1 right-1 p-1 bg-red-500 rounded-md hover:bg-red-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Videos */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Videos
                  </label>
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-white/20 rounded-lg hover:border-brand-500 transition-colors cursor-pointer bg-dark-900">
                    <Video className="text-gray-500 mb-2" size={24} />
                    <span className="text-sm text-gray-400">Click to upload videos</span>
                    <input
                      type="file"
                      accept="video/*"
                      multiple
                      onChange={handleVideosUpload}
                      className="hidden"
                    />
                  </label>
                  {videos.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {videos.map(video => (
                        <div key={video.id} className="flex items-center justify-between p-3 bg-dark-900 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Video size={20} className="text-brand-400" />
                            <div>
                              <p className="text-sm text-white">{video.name}</p>
                              <p className="text-xs text-gray-500">{video.size}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeVideo(video.id)}
                            className="p-1 bg-red-500 rounded-md hover:bg-red-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Layout Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Layout/Floor Plan Image
                  </label>
                  {layoutImagePreview ? (
                    <div className="relative w-full h-32 bg-dark-900 rounded-lg overflow-hidden">
                      <img src={layoutImagePreview} alt="Layout" className="w-full h-full object-contain" />
                      <button
                        onClick={() => {
                          setLayoutImage(null);
                          setLayoutImagePreview(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg hover:bg-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg hover:border-brand-500 transition-colors cursor-pointer bg-dark-900">
                      <FileText className="text-gray-500 mb-2" size={24} />
                      <span className="text-sm text-gray-400">Click to upload layout image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLayoutImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Brochure */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Brochure (PDF or Image)
                  </label>
                  {brochure ? (
                    <div className="flex items-center justify-between p-4 bg-dark-900 rounded-lg">
                      <div className="flex items-center gap-3">
                        <File className="text-brand-400" size={24} />
                        <div>
                          <p className="text-sm text-white">{brochure.name}</p>
                          <p className="text-xs text-gray-500">{(brochure.size / 1024).toFixed(2)} KB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setBrochure(null)}
                        className="p-2 bg-red-500 rounded-lg hover:bg-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-white/20 rounded-lg hover:border-brand-500 transition-colors cursor-pointer bg-dark-900">
                      <File className="text-gray-500 mb-2" size={24} />
                      <span className="text-sm text-gray-400">Click to upload brochure</span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={handleBrochureUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-white/10">
            <div className="flex gap-2">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="btn-secondary"
                >
                  Previous
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {step < 4 ? (
                <button
                  onClick={handleNext}
                  className="btn-primary"
                >
                  Next Step
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading || !coverImage}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Project'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
