import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Camera as CapacitorCamera } from '@capacitor/camera';
import { CameraResultType, CameraSource } from '@capacitor/camera';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function QuickLeadCapture() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleCameraCapture = async () => {
    try {
      setLoading(true);
      setError(null);

      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera
      });

      if (image.base64String) {
        await analyzeImage(image.base64String, image.format);
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err.message !== 'User cancelled photos app') {
        toast.error('Failed to capture photo');
        setError('Camera access denied or unavailable');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('Please upload an image or video file');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result.split(',')[1];
        const format = file.type.split('/')[1];
        await analyzeImage(base64, format);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File upload error:', err);
      toast.error('Failed to upload file');
      setError('File upload failed');
      setLoading(false);
    }
  };

  const analyzeImage = async (base64Data, format) => {
    try {
      setAnalyzing(true);
      
      // Call backend API to analyze the image
      const response = await api.post('/leads/analyze-media', {
        image: base64Data,
        format: format
      });

      setResult(response.data);
      toast.success('Image analyzed! Review the extracted data.');
    } catch (err) {
      console.error('Analysis error:', err);
      toast.error('Failed to analyze image');
      setError(err.response?.data?.error || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  };

  const handleConfirmLead = async () => {
    if (!result) return;

    try {
      setLoading(true);

      // Create both regular lead and research lead
      await api.post('/leads/create-from-analysis', {
        leadData: result.leadData,
        researchData: result.researchData
      });

      toast.success('Lead created successfully! 🎉');
      setResult(null);
      setIsOpen(false);
      
      // Refresh the page to show new lead
      window.location.reload();
    } catch (err) {
      console.error('Create lead error:', err);
      toast.error('Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setResult(null);
    setError(null);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 20 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-24 left-6 z-40 w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-2xl shadow-purple-500/40 flex items-center justify-center transition-all"
      >
        <Camera size={28} className="text-white" />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-2xl z-50"
            >
              <div className="glass-card p-6 h-full sm:h-auto max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white">📸 Quick Lead Capture</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      Take or upload a photo to auto-extract lead information
                    </p>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>

                {/* Action Buttons */}
                {!result && !analyzing && (
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                      onClick={handleCameraCapture}
                      disabled={loading}
                      className="flex flex-col items-center gap-3 p-6 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <Loader2 size={32} className="text-white animate-spin" />
                      ) : (
                        <Camera size={32} className="text-white" />
                      )}
                      <div className="text-center">
                        <p className="text-sm font-bold text-white">Take Photo</p>
                        <p className="text-xs text-white/70 mt-1">Open camera</p>
                      </div>
                    </button>

                    <label className="flex flex-col items-center gap-3 p-6 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20 cursor-pointer">
                      <Upload size={32} className="text-white" />
                      <div className="text-center">
                        <p className="text-sm font-bold text-white">Upload File</p>
                        <p className="text-xs text-white/70 mt-1">Photo or video</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={loading}
                      />
                    </label>
                  </div>
                )}

                {/* Analyzing State */}
                {analyzing && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 size={48} className="text-brand-400 animate-spin mb-4" />
                    <p className="text-lg font-semibold text-white mb-2">Analyzing image...</p>
                    <p className="text-sm text-gray-400">Extracting lead information using AI</p>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-400">Analysis Failed</p>
                        <p className="text-xs text-red-300 mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Result Preview */}
                {result && (
                  <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 size={18} className="text-green-400" />
                        <p className="text-sm font-semibold text-green-400">
                          Lead information extracted successfully!
                        </p>
                      </div>
                      <p className="text-xs text-gray-400">
                        Review the data below and confirm to create the lead.
                      </p>
                    </div>

                    {/* Extracted Lead Data */}
                    <div className="glass-card p-4">
                      <h3 className="text-sm font-semibold text-white mb-3">📋 Lead Information</h3>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-gray-500">Name</p>
                          <p className="text-white font-medium">{result.leadData?.fullName || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Company</p>
                          <p className="text-white font-medium">{result.leadData?.company || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Phone</p>
                          <p className="text-white font-medium">{result.leadData?.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Email</p>
                          <p className="text-white font-medium">{result.leadData?.email || 'N/A'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-500">Project</p>
                          <p className="text-white font-medium">{result.leadData?.projectName || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Research Data Preview */}
                    {result.researchData && (
                      <div className="glass-card p-4 bg-pink-500/5 border-pink-500/20">
                        <h3 className="text-sm font-semibold text-pink-400 mb-3">🔍 Research Data</h3>
                        <div className="space-y-2 text-xs">
                          {result.researchData.advertiserIdentity && (
                            <div>
                              <p className="text-gray-500">Advertiser</p>
                              <p className="text-white">{result.researchData.advertiserIdentity}</p>
                            </div>
                          )}
                          {result.researchData.creativeType && (
                            <div>
                              <p className="text-gray-500">Creative Type</p>
                              <p className="text-white">{result.researchData.creativeType}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleCancel}
                        className="flex-1 py-3 rounded-xl bg-dark-600 hover:bg-dark-500 text-white font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmLead}
                        disabled={loading}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={16} />
                            Confirm & Create Lead
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Help Text */}
                {!result && !analyzing && (
                  <div className="bg-dark-700/50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 mb-2">💡 <span className="font-semibold">Tips:</span></p>
                    <ul className="text-xs text-gray-500 space-y-1 ml-4">
                      <li>• Ensure the image is clear and text is readable</li>
                      <li>• Include business cards, brochures, or ad screenshots</li>
                      <li>• AI will extract name, company, contact details automatically</li>
                      <li>• Works with both photos and videos</li>
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
