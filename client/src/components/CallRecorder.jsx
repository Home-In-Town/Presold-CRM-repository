import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Phone, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import toast from 'react-hot-toast';

export default function CallRecorder({ leadId, leadName, onSave, onClose }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    // Auto-start recording when component mounts
    startRecording();
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const hasPermission = await VoiceRecorder.hasAudioRecordingPermission();
      
      if (!hasPermission.value) {
        const permissionResult = await VoiceRecorder.requestAudioRecordingPermission();
        if (!permissionResult.value) {
          toast.error('Microphone permission required for call recording');
          onClose();
          return;
        }
      }

      await VoiceRecorder.startRecording();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success('Call recording started 🎙️');
    } catch (err) {
      console.error('Recording error:', err);
      toast.error('Failed to start recording');
      onClose();
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    
    try {
      const result = await VoiceRecorder.stopRecording();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Convert base64 to blob
      const base64Sound = result.value.recordDataBase64;
      const mimeType = result.value.mimeType || 'audio/aac';
      
      const byteCharacters = atob(base64Sound);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
      
      toast.success('Recording stopped');
    } catch (err) {
      console.error('Stop recording error:', err);
      toast.error('Failed to stop recording');
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleSave = async () => {
    if (!audioBlob) {
      toast.error('No recording to save');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      const audioFile = new File([audioBlob], `call-${leadId}-${Date.now()}.aac`, { 
        type: audioBlob.type 
      });
      formData.append('audio', audioFile);
      formData.append('duration', recordingTime);
      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }

      await onSave(formData);
      toast.success('Call recording saved! 📞');
      onClose();
    } catch (err) {
      toast.error('Failed to save recording');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="bg-dark-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md border border-white/10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Phone size={18} className="text-green-400" />
                Call Recording
              </h3>
              <p className="text-xs text-gray-400 mt-1">{leadName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Recording Status */}
            <div className="text-center">
              {isRecording ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-3xl font-mono text-white font-bold">
                      {formatTime(recordingTime)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">Recording in progress...</p>
                  <button
                    onClick={stopRecording}
                    className="btn-danger flex items-center justify-center gap-2 mx-auto"
                  >
                    <Square size={18} />
                    <span>Stop Recording</span>
                  </button>
                </div>
              ) : audioUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-green-400">
                    <div className="w-3 h-3 bg-green-400 rounded-full" />
                    <span className="text-sm font-semibold">Recording Complete</span>
                  </div>
                  <div className="text-2xl font-mono text-white font-bold">
                    {formatTime(recordingTime)}
                  </div>
                  <div className="bg-dark-900 rounded-lg p-4">
                    <audio src={audioUrl} controls className="w-full" />
                  </div>
                  
                  {/* Notes */}
                  <div className="text-left">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Call Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about the call..."
                      rows={3}
                      className="w-full px-3 py-2 bg-dark-900 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        <span>Save Call Recording</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-gray-400 py-8">
                  <p>No recording yet</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
