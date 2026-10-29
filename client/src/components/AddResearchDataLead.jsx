import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, FileText, Image as ImageIcon, Video, MapPin, Check, Clock } from 'lucide-react';
import { Camera } from '@capacitor/camera';
import { CameraResultType, CameraSource } from '@capacitor/camera';
import api from '../services/api';
import toast from 'react-hot-toast';

const CONTACT_METHODS = ['CALL', 'WHATSAPP'];
const ROLES = ['BUILDER', 'DEVELOPER', 'AGENT'];

export default function AddResearchDataLead({ onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Basic Info
    leadName: '',
    companyName: '',
    contactMethod: '',
    responseTime: '',
    callDate: new Date().toISOString().split('T')[0],
    uploadedFiles: [],
    location: '',
    role: '',
    
    // NEW: Detailed Research Fields
    advertiserIdentity: '', // Direct Builder ka brand page hai ya Broker/Channel Partner
    adRunningSince: '', // Ad kitne dinon se chal raha hai
    creativeType: '', // Static Poster, Reels/Walkthrough, Drone shot
    funnelType: '', // Instant Lead Form, WhatsApp redirect, Landing Page
    autoResponseCheck: false, // 0-5 mins auto response aaya?
    firstHumanCallTime: '', // Form bharne ke kitne time baad call aaya
    whatsappContentAudit: {
      pdfBrochure: false,
      googleMapPin: false,
      videoOrWebsite: false
    }
  });
  const [saving, setSaving] = useState(false);

  const handleNext = () => {
    // Validation for each step
    if (step === 1 && (!formData.leadName || !formData.companyName)) {
      toast.error('कृपया Lead Name और Company Name भरें');
      return;
    }
    if (step === 2 && !formData.contactMethod) {
      toast.error('कृपया Contact Method चुनें');
      return;
    }
    if (step === 3 && (!formData.responseTime || !formData.callDate)) {
      toast.error('कृपया Response Time और Date भरें');
      return;
    }
    if (step === 5 && !formData.role) {
      toast.error('कृपया Role चुनें');
      return;
    }
    // Step 6: Research Data validation - made optional for testing
    if (step === 6) {
      console.log('Step 6 validation - form data:', formData);
      // At least one research field should be filled
      const hasAnyResearchData = formData.advertiserIdentity || formData.adRunningSince || 
                                  formData.creativeType || formData.funnelType || 
                                  formData.firstHumanCallTime;
      
      if (!hasAnyResearchData) {
        console.log('No research data provided');
        toast.error('कृपया कम से कम एक Research field भरें (At least fill one research field)');
        return;
      }
      console.log('Step 6 validation passed, submitting...');
    }
    
    if (step < 6) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFileUpload = async (type) => {
    try {
      let result;
      
      if (type === 'photo' || type === 'video') {
        result = await Camera.getPhoto({
          resultType: CameraResultType.DataUrl,
          source: type === 'photo' ? CameraSource.Camera : CameraSource.Photos,
          quality: 80,
        });
        
        setFormData(prev => ({
          ...prev,
          uploadedFiles: [...prev.uploadedFiles, {
            type: type === 'photo' ? 'image' : 'video',
            data: result.dataUrl,
            name: `${type}_${Date.now()}`
          }]
        }));
      } else if (type === 'pdf') {
        // For PDFs, use file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setFormData(prev => ({
                ...prev,
                uploadedFiles: [...prev.uploadedFiles, {
                  type: 'pdf',
                  data: event.target.result,
                  name: file.name
                }]
              }));
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }
      
      toast.success('File uploaded!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload file');
    }
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      console.log('Submitting research data:', formData);
      
      const payload = {
        leadName: formData.leadName,
        companyName: formData.companyName,
        contactMethod: formData.contactMethod,
        responseTime: formData.responseTime,
        callDate: formData.callDate,
        uploadedFiles: formData.uploadedFiles,
        location: formData.location,
        role: formData.role,
        advertiserIdentity: formData.advertiserIdentity,
        adRunningSince: formData.adRunningSince,
        creativeType: formData.creativeType,
        funnelType: formData.funnelType,
        autoResponseCheck: formData.autoResponseCheck,
        firstHumanCallTime: formData.firstHumanCallTime,
        whatsappContentAudit: formData.whatsappContentAudit
      };
      
      console.log('Payload being sent:', payload);
      
      const response = await api.post('/leads/research-data', payload);
      console.log('Response:', response.data);
      
      toast.success('Research data lead added successfully! 🎉');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Submit error:', err);
      console.error('Error response:', err.response?.data);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to add research data lead';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center mx-auto mb-3">
                <FileText size={32} className="text-brand-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Basic Information</h3>
              <p className="text-sm text-gray-400">Enter lead and company details</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Lead Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.leadName}
                onChange={(e) => setFormData({ ...formData, leadName: e.target.value })}
                placeholder="Enter lead name"
                className="w-full px-4 py-3 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Company Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Enter company name"
                className="w-full px-4 py-3 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">📞</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Contact Method</h3>
              <p className="text-sm text-gray-400">How did they reach out?</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {CONTACT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setFormData({ ...formData, contactMethod: method })}
                  className={`relative p-6 rounded-xl border-2 transition-all ${
                    formData.contactMethod === method
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                  }`}
                >
                  {formData.contactMethod === method && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-3xl mb-2">
                      {method === 'CALL' ? '📞' : '💬'}
                    </div>
                    <div className="font-semibold text-white">
                      {method === 'CALL' ? 'Phone Call' : 'WhatsApp Message'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">⏰</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Response Details</h3>
              <p className="text-sm text-gray-400">When did they contact you?</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Response Time <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={formData.responseTime}
                onChange={(e) => setFormData({ ...formData, responseTime: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-dark-700 border border-dark-600 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date of Contact <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={formData.callDate}
                onChange={(e) => setFormData({ ...formData, callDate: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-dark-700 border border-dark-600 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                <Upload size={32} className="text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Upload Media</h3>
              <p className="text-sm text-gray-400">Add photos, videos or PDFs (optional)</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleFileUpload('photo')}
                className="p-4 rounded-lg bg-dark-700 border border-dark-600 hover:border-brand-500 transition-colors"
              >
                <ImageIcon size={24} className="text-brand-400 mx-auto mb-2" />
                <div className="text-xs text-gray-300">Photo</div>
              </button>

              <button
                type="button"
                onClick={() => handleFileUpload('video')}
                className="p-4 rounded-lg bg-dark-700 border border-dark-600 hover:border-brand-500 transition-colors"
              >
                <Video size={24} className="text-purple-400 mx-auto mb-2" />
                <div className="text-xs text-gray-300">Video</div>
              </button>

              <button
                type="button"
                onClick={() => handleFileUpload('pdf')}
                className="p-4 rounded-lg bg-dark-700 border border-dark-600 hover:border-brand-500 transition-colors"
              >
                <FileText size={24} className="text-red-400 mx-auto mb-2" />
                <div className="text-xs text-gray-300">PDF</div>
              </button>
            </div>

            {formData.uploadedFiles.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium text-gray-300 mb-2">
                  Uploaded Files ({formData.uploadedFiles.length})
                </div>
                <div className="space-y-2">
                  {formData.uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-dark-700 border border-dark-600">
                      <div className="flex items-center gap-3">
                        {file.type === 'image' && <ImageIcon size={20} className="text-brand-400" />}
                        {file.type === 'video' && <Video size={20} className="text-purple-400" />}
                        {file.type === 'pdf' && <FileText size={20} className="text-red-400" />}
                        <span className="text-sm text-white">{file.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Location / Address (Optional)
              </label>
              <div className="relative">
                <MapPin size={18} className="absolute left-3 top-3.5 text-gray-500" />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Enter location or address"
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">👤</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Select Role</h3>
              <p className="text-sm text-gray-400">What is their role?</p>
            </div>

            <div className="space-y-3">
              {ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setFormData({ ...formData, role })}
                  className={`relative w-full p-4 rounded-xl border-2 transition-all text-left ${
                    formData.role === role
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                  }`}
                >
                  {formData.role === role && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {role === 'BUILDER' && '🏗️'}
                      {role === 'DEVELOPER' && '👷'}
                      {role === 'AGENT' && '🤝'}
                    </div>
                    <div>
                      <div className="font-semibold text-white capitalize">
                        {role.toLowerCase()}
                      </div>
                      <div className="text-xs text-gray-400">
                        {role === 'BUILDER' && 'Construction & Building'}
                        {role === 'DEVELOPER' && 'Real Estate Development'}
                        {role === 'AGENT' && 'Sales & Brokerage'}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      
      case 6:
        return (
          <div className="space-y-5">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-pink-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">📋</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Research Data</h3>
              <p className="text-xs text-gray-400">Ad aur Follow-up ki details</p>
            </div>

            {/* Advertiser Identity */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Advertiser Identity <span className="text-red-400">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">Page kiska hai? (Direct Builder ya Broker/Channel Partner)</p>
              <input
                type="text"
                value={formData.advertiserIdentity}
                onChange={(e) => setFormData({ ...formData, advertiserIdentity: e.target.value })}
                placeholder="जैसे: XYZ Builder ka official page / ABC Broker ka page"
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Ad Running Since */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ad Running Since <span className="text-red-400">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">Ad kitne dinon se chal raha hai?</p>
              <input
                type="text"
                value={formData.adRunningSince}
                onChange={(e) => setFormData({ ...formData, adRunningSince: e.target.value })}
                placeholder="जैसे: 7 din / 15+ din / 2 months"
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Creative Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Creative Type <span className="text-red-400">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">Kis tarah ka ad tha?</p>
              <select
                value={formData.creativeType}
                onChange={(e) => setFormData({ ...formData, creativeType: e.target.value })}
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-dark-700 border border-dark-600 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Select...</option>
                <option value="STATIC_POSTER">Static Poster</option>
                <option value="REELS_WALKTHROUGH">Reels/Walkthrough Video</option>
                <option value="DRONE_SHOT">Drone Shot</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Funnel Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Funnel Type <span className="text-red-400">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">Form kahan submit hua?</p>
              <select
                value={formData.funnelType}
                onChange={(e) => setFormData({ ...formData, funnelType: e.target.value })}
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-dark-700 border border-dark-600 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Select...</option>
                <option value="INSTANT_LEAD_FORM">Instant Lead Form (Facebook/Instagram)</option>
                <option value="WHATSAPP_REDIRECT">WhatsApp Redirect</option>
                <option value="LANDING_PAGE">Landing Page Website</option>
              </select>
            </div>

            {/* Auto-Response Check */}
            <div className="border border-dark-600 rounded-lg p-3 bg-dark-700/50">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autoResponseCheck}
                  onChange={(e) => setFormData({ ...formData, autoResponseCheck: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-dark-800"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">Auto-Response Check (0-5 Mins)</div>
                  <div className="text-xs text-gray-400 mt-0.5">Kya form bharte hi turant automated WhatsApp/SMS/Call aaya?</div>
                </div>
              </label>
            </div>

            {/* First Human Call Time */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                First Human Call Time
              </label>
              <p className="text-xs text-gray-500 mb-2">Form bharne ke kitne time baad pehla call aaya?</p>
              <input
                type="text"
                value={formData.firstHumanCallTime}
                onChange={(e) => setFormData({ ...formData, firstHumanCallTime: e.target.value })}
                placeholder="जैसे: 14 minutes / 6 hours / Next Day"
                className="w-full px-3 py-2.5 text-sm rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* WhatsApp Content Audit */}
            <div className="border border-dark-600 rounded-lg p-3 bg-dark-700/50">
              <div className="text-sm font-medium text-gray-300 mb-3">WhatsApp Content Audit</div>
              <p className="text-xs text-gray-500 mb-3">Call se pehle ya baad mein WhatsApp par kya bheja gaya?</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.whatsappContentAudit.pdfBrochure}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      whatsappContentAudit: { ...formData.whatsappContentAudit, pdfBrochure: e.target.checked } 
                    })}
                    className="w-4 h-4 rounded border-gray-600 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-xs text-gray-300">Wahi purana 15-25 MB ka PDF Brochure?</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.whatsappContentAudit.googleMapPin}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      whatsappContentAudit: { ...formData.whatsappContentAudit, googleMapPin: e.target.checked } 
                    })}
                    className="w-4 h-4 rounded border-gray-600 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-xs text-gray-300">Normal Google Map ka location pin?</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.whatsappContentAudit.videoOrWebsite}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      whatsappContentAudit: { ...formData.whatsappContentAudit, videoOrWebsite: e.target.checked } 
                    })}
                    className="w-4 h-4 rounded border-gray-600 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-xs text-gray-300">Koi video ya micro-website link?</span>
                </label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
        className="bg-dark-800 rounded-2xl w-full max-w-lg border border-dark-700 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Research Data Lead</h2>
              <p className="text-sm text-gray-400 mt-1">Step {step} of 6</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg bg-dark-700 hover:bg-dark-600 flex items-center justify-center transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 flex gap-2">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-pink-500' : 'bg-dark-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-dark-700 flex gap-3">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex-1 px-6 py-3 rounded-lg border border-dark-600 text-white hover:bg-dark-700 transition-colors font-medium"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={saving}
            className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : step === 6 ? 'Submit Research Data' : 'Next'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
