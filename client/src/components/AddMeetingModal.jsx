import { useState, useRef } from 'react';
import { X, Camera, Upload, MapPin, Mic, Square, Play, Pause, User, Phone, Building2, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AddMeetingModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // Multi-step form
  
  // Form data
  const [formData, setFormData] = useState({
    meetingDateTime: new Date().toISOString().slice(0, 16), // Auto-capture
    officeName: '',
    officeAddress: '',
    officeLatitude: null,
    officeLongitude: null,
    role: 'OWNER', // OWNER, BROKER, PO
    leadId: '',
    leadName: '',
    personContact: '',
    notes: '',
    conversation: '',
  });

  // Files
  const [selfieFile, setSelfieFile] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [visitingCardFile, setVisitingCardFile] = useState(null);
  const [visitingCardPreview, setVisitingCardPreview] = useState(null);
  
  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Camera refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraMode, setCameraMode] = useState(null); // 'selfie' or 'visitingCard'
  const [showCamera, setShowCamera] = useState(false);

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
          officeLatitude: position.coords.latitude,
          officeLongitude: position.coords.longitude
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

  // Camera functions
  const startCamera = async (mode) => {
    try {
      setCameraMode(mode);
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: mode === 'selfie' ? 'user' : 'environment' },
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error('Failed to access camera: ' + err.message);
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !streamRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      const file = new File([blob], `${cameraMode}-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);

      if (cameraMode === 'selfie') {
        setSelfieFile(file);
        setSelfiePreview(url);
      } else {
        setVisitingCardFile(file);
        setVisitingCardPreview(url);
      }

      stopCamera();
      toast.success('Photo captured!');
    }, 'image/jpeg', 0.9);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setCameraMode(null);
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    if (type === 'selfie') {
      setSelfieFile(file);
      setSelfiePreview(url);
    } else {
      setVisitingCardFile(file);
      setVisitingCardPreview(url);
    }
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success('Recording started');
    } catch (err) {
      toast.error('Failed to start recording: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      toast.success('Recording stopped');
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    toast.info('Recording deleted');
  };

  // Format recording time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Submit form
  const validateStep = (currentStep) => {
    switch(currentStep) {
      case 1:
        // Step 1: Basic Info & Photos validation
        if (!selfieFile) {
          toast.error('Selfie photo is required');
          return false;
        }
        return true;

      case 2:
        // Step 2: Office & Lead Details validation
        if (!formData.officeName.trim()) {
          toast.error('Office name is required');
          return false;
        }
        if (!formData.officeAddress.trim()) {
          toast.error('Office address is required');
          return false;
        }
        if (!formData.role) {
          toast.error('Role is required (Owner/PO/Broker)');
          return false;
        }
        if (!formData.leadName.trim()) {
          toast.error('Person name is required');
          return false;
        }
        if (!formData.personContact.trim()) {
          toast.error('Contact number is required');
          return false;
        }
        return true;

      case 3:
        // Step 3: Audio & Notes validation
        if (!audioBlob) {
          toast.error('Audio recording is mandatory!');
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
    if (!validateStep(3)) {
      return;
    }

    setLoading(true);
    try {
      const submitData = new FormData();
      
      // Append text fields
      submitData.append('meetingDateTime', formData.meetingDateTime);
      submitData.append('officeName', formData.officeName);
      submitData.append('officeAddress', formData.officeAddress);
      submitData.append('role', formData.role);
      submitData.append('personName', formData.leadName);
      submitData.append('personContact', formData.personContact);
      
      if (formData.officeLatitude) submitData.append('latitude', formData.officeLatitude);
      if (formData.officeLongitude) submitData.append('longitude', formData.officeLongitude);
      if (formData.officeAddress) submitData.append('locationAddress', formData.officeAddress);
      if (formData.notes) submitData.append('placeNote', formData.notes);
      if (formData.conversation) submitData.append('conversation', formData.conversation);
      submitData.append('audioDuration', recordingTime);

      // Append files
      submitData.append('selfie', selfieFile);
      if (visitingCardFile) {
        submitData.append('visitingCard', visitingCardFile);
      }
      
      // Append audio
      const audioFile = new File([audioBlob], `meeting-audio-${Date.now()}.webm`, { type: 'audio/webm' });
      submitData.append('audio', audioFile);

      await api.post('/meetings', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Meeting added successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to add meeting:', err);
      toast.error(err.response?.data?.error || 'Failed to add meeting');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-dark-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 className="text-xl font-bold text-white">Add Meeting</h2>
              <p className="text-sm text-gray-400">Step {step} of 3</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Camera Modal */}
          {showCamera && (
            <div className="absolute inset-0 bg-black z-10 flex flex-col">
              <div className="flex-1 relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 flex items-center justify-center gap-4">
                <button
                  onClick={stopCamera}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={capturePhoto}
                  className="w-16 h-16 rounded-full bg-white border-4 border-brand-500 hover:bg-brand-50 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Step 1: Basic Info & Photos */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Date & Time (Auto-captured) */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Meeting Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.meetingDateTime}
                    onChange={(e) => setFormData({ ...formData, meetingDateTime: e.target.value })}
                    className="input w-full"
                  />
                </div>

                {/* Selfie Photo */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Selfie Photo * (Required)
                  </label>
                  {selfiePreview ? (
                    <div className="relative w-full h-36 bg-dark-900 rounded-lg overflow-hidden">
                      <img src={selfiePreview} alt="Selfie" className="w-full h-full object-cover" />
                      <button
                        onClick={() => {
                          setSelfieFile(null);
                          setSelfiePreview(null);
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-500 rounded-lg hover:bg-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => startCamera('selfie')}
                        className="flex-1 btn-secondary flex items-center justify-center gap-2"
                      >
                        <Camera size={18} />
                        <span>Take Selfie</span>
                      </button>
                      <label className="flex-1 btn-secondary flex items-center justify-center gap-2 cursor-pointer">
                        <Upload size={18} />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'selfie')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Visiting Card Photo */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Visiting Card Photo
                  </label>
                  {visitingCardPreview ? (
                    <div className="relative w-full h-36 bg-dark-900 rounded-lg overflow-hidden">
                      <img src={visitingCardPreview} alt="Visiting Card" className="w-full h-full object-cover" />
                      <button
                        onClick={() => {
                          setVisitingCardFile(null);
                          setVisitingCardPreview(null);
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-500 rounded-lg hover:bg-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => startCamera('visitingCard')}
                        className="flex-1 btn-secondary flex items-center justify-center gap-2"
                      >
                        <Camera size={18} />
                        <span>Take Photo</span>
                      </button>
                      <label className="flex-1 btn-secondary flex items-center justify-center gap-2 cursor-pointer">
                        <Upload size={18} />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'visitingCard')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="input w-full"
                  >
                    <option value="OWNER">Owner</option>
                    <option value="BROKER">Broker</option>
                    <option value="PO">PO (Project Officer)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Office & Lead Details */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Lead Search */}
                {/* Person Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Person Name *
                  </label>
                  <input
                    type="text"
                    value={formData.leadName}
                    onChange={(e) => setFormData({ ...formData, leadName: e.target.value })}
                    placeholder="Enter person's name"
                    className="input w-full"
                  />
                </div>

                {/* Contact Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contact Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.personContact}
                    onChange={(e) => setFormData({ ...formData, personContact: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                    className="input w-full"
                  />
                </div>

                {/* Office Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Office Name *
                  </label>
                  <input
                    type="text"
                    value={formData.officeName}
                    onChange={(e) => setFormData({ ...formData, officeName: e.target.value })}
                    placeholder="Enter office name"
                    className="input w-full"
                  />
                </div>

                {/* Office Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Office Address *
                  </label>
                  <textarea
                    value={formData.officeAddress}
                    onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value })}
                    placeholder="Enter complete office address"
                    rows={3}
                    className="input w-full"
                  />
                </div>

                {/* Capture Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Office Location
                  </label>
                  <button
                    onClick={handleCaptureLocation}
                    className="btn-secondary w-full flex items-center justify-center gap-2"
                  >
                    <MapPin size={18} />
                    <span>
                      {formData.officeLatitude && formData.officeLongitude
                        ? `Location Captured (${formData.officeLatitude.toFixed(6)}, ${formData.officeLongitude.toFixed(6)})`
                        : 'Capture Current Location'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Audio, Notes & Conversation */}
            {step === 3 && (
              <div className="space-y-6">
                {/* Audio Recording */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Audio Recording * (Mandatory)
                  </label>
                  {!audioUrl ? (
                    <div className="bg-dark-900 rounded-lg p-6 text-center">
                      {isRecording ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-white font-mono text-xl">{formatTime(recordingTime)}</span>
                          </div>
                          <button
                            onClick={stopRecording}
                            className="btn-danger flex items-center justify-center gap-2 mx-auto"
                          >
                            <Square size={18} />
                            <span>Stop Recording</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={startRecording}
                          className="btn-primary flex items-center justify-center gap-2 mx-auto"
                        >
                          <Mic size={18} />
                          <span>Start Recording</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-dark-900 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <audio src={audioUrl} controls className="flex-1" />
                        <button
                          onClick={deleteRecording}
                          className="p-2 bg-red-500 rounded-lg hover:bg-red-600"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      <p className="text-sm text-green-400 mt-2">✓ Recording saved ({formatTime(recordingTime)})</p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add any notes about the meeting..."
                    rows={4}
                    className="input w-full"
                  />
                </div>

                {/* Conversation */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Conversation Summary (Optional)
                  </label>
                  <textarea
                    value={formData.conversation}
                    onChange={(e) => setFormData({ ...formData, conversation: e.target.value })}
                    placeholder="Summarize the key points discussed..."
                    rows={4}
                    className="input w-full"
                  />
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
              {step < 3 ? (
                <button
                  onClick={handleNext}
                  className="btn-primary"
                >
                  Next Step
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading || !audioBlob}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Meeting'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
