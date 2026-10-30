import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';
import toast from 'react-hot-toast';

// Register custom phone call plugin
const PhoneCall = registerPlugin('PhoneCall');

export default function RealPhoneCall({ 
  phoneNumber, 
  leadName, 
  leadId,
  onClose, 
  onCallComplete 
}) {
  const [callState, setCallState] = useState('preparing'); // preparing, calling, recording, ended
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingData, setRecordingData] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  
  const durationIntervalRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const callStartTimeRef = useRef(null);

  useEffect(() => {
    initiateCall();
    
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    if (isRecording) {
      stopRecording();
    }
  };

  const initiateCall = async () => {
    try {
      // Check if we're on a mobile device
      if (!Capacitor.isNativePlatform()) {
        toast.error('Phone calls only work on mobile devices');
        onClose();
        return;
      }

      // Request microphone permission
      console.log('📞 Requesting microphone permission...');
      const permission = await VoiceRecorder.hasAudioRecordingPermission();
      
      if (permission.value !== true) {
        const requested = await VoiceRecorder.requestAudioRecordingPermission();
        if (requested.value !== true) {
          toast.error('Microphone permission required for recording');
          onClose();
          return;
        }
      }

      setHasPermission(true);
      console.log('✅ Microphone permission granted');

      // Make the actual phone call
      makePhoneCall();
      
    } catch (err) {
      console.error('Call initiation error:', err);
      toast.error('Failed to initiate call: ' + err.message);
      onClose();
    }
  };

  const makePhoneCall = async () => {
    try {
      setCallState('calling');
      
      // Format phone number (remove spaces, dashes, etc.)
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      
      if (!Capacitor.isNativePlatform()) {
        // Fallback for web - open tel: link
        window.location.href = `tel:${cleanNumber}`;
        toast('Opening phone dialer...', { icon: '📞' });
      } else {
        // Use native plugin to make direct call
        try {
          const result = await PhoneCall.makeCall({ phoneNumber: cleanNumber });
          console.log('Call initiated:', result);
          toast('Call initiated', { icon: '📞' });
        } catch (err) {
          console.error('Direct call failed, opening dialer:', err);
          // Fallback to dialer if direct call fails
          await PhoneCall.openDialer({ phoneNumber: cleanNumber });
          toast('Dialer opened', { icon: '📞' });
        }
      }
      
      // Show prompt to start recording
      setTimeout(() => {
        const shouldRecord = window.confirm('Call connected? Start recording now?');
        if (shouldRecord) {
          startRecordingFlow();
        } else {
          onClose();
        }
      }, 3000); // Give 3 seconds for call to connect
      
    } catch (err) {
      console.error('Phone call error:', err);
      toast.error('Failed to make call: ' + err.message);
      onClose();
    }
  };

  const startRecordingFlow = async () => {
    setCallState('recording');
    callStartTimeRef.current = Date.now();
    
    // Start recording
    const recordingStarted = await startRecording();
    
    if (recordingStarted) {
      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      toast.success('Recording started');
    } else {
      toast.error('Failed to start recording');
      onClose();
    }
  };

  const startRecording = async () => {
    try {
      console.log('🎙️ Starting voice recording...');
      
      await VoiceRecorder.startRecording();
      
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      
      console.log('✅ Recording started successfully');
      return true;
    } catch (err) {
      console.error('Recording start error:', err);
      toast.error('Failed to start recording: ' + err.message);
      return false;
    }
  };

  const stopRecording = async () => {
    try {
      console.log('⏹️ Stopping recording...');
      
      const result = await VoiceRecorder.stopRecording();
      setIsRecording(false);
      
      if (result.value && result.value.recordDataBase64) {
        const actualDuration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        
        const data = {
          base64: result.value.recordDataBase64,
          mimeType: result.value.mimeType || 'audio/aac',
          duration: actualDuration
        };
        
        setRecordingData(data);
        
        console.log('✅ Recording stopped successfully');
        console.log(`📊 Duration: ${actualDuration}s, MIME: ${data.mimeType}`);
        
        return true;
      } else {
        console.warn('⚠️ No recording data received');
        return false;
      }
    } catch (err) {
      console.error('Recording stop error:', err);
      toast.error('Failed to stop recording');
      return false;
    }
  };

  const handleEndCall = async () => {
    console.log('📞 Ending call...');
    
    // Stop duration counter
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    // Stop recording if active
    let recordingSaved = false;
    if (isRecording) {
      recordingSaved = await stopRecording();
    }

    setCallState('ended');

    // Wait a moment before processing
    setTimeout(() => {
      if (recordingData || duration > 0) {
        console.log('💾 Saving recording to backend...');
        onCallComplete(recordingData, duration);
      } else {
        console.log('ℹ️ No recording to save (duration too short)');
      }
    }, 1000);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleClose = () => {
    if (callState === 'recording') {
      if (window.confirm('Recording is in progress. End call and save recording?')) {
        handleEndCall();
        setTimeout(() => onClose(), 2000);
      }
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget && callState === 'ended') {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gradient-to-b from-dark-800 to-dark-900 rounded-3xl p-8 w-full max-w-md border border-white/10 shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          {callState === 'ended' && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={20} className="text-white" />
            </button>
          )}

          {/* Contact Info */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-4 shadow-lg shadow-brand-500/30">
              <span className="text-4xl font-bold text-white">
                {leadName?.charAt(0) || '?'}
              </span>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">{leadName}</h2>
            <p className="text-base text-gray-400 font-mono mb-1">{phoneNumber}</p>

            {/* Call State */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mt-3">
              {callState === 'preparing' && (
                <>
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-sm text-blue-400">Preparing...</span>
                </>
              )}
              {callState === 'calling' && (
                <>
                  <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-sm text-yellow-400">Opening Dialer...</span>
                </>
              )}
              {callState === 'recording' && (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm text-green-400 font-mono">
                    {formatDuration(duration)}
                  </span>
                </>
              )}
              {callState === 'ended' && (
                <>
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-sm text-red-400">Call Ended</span>
                </>
              )}
            </div>

            {/* Recording Indicator */}
            {isRecording && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 mt-4 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30"
              >
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm text-red-400 font-medium">Recording call...</span>
              </motion.div>
            )}
          </div>

          {/* Instructions */}
          {callState === 'calling' && (
            <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-300 text-center">
                📞 Phone dialer opened.<br />
                Click "Start Recording" when call connects
              </p>
            </div>
          )}

          {/* End Call Button */}
          {callState === 'recording' && (
            <button
              onClick={handleEndCall}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold text-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-red-500/30"
            >
              <PhoneOff size={24} />
              <span>End Call & Save Recording</span>
            </button>
          )}

          {/* Call Ended Message */}
          {callState === 'ended' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Phone size={32} className="text-green-400" />
              </div>
              <p className="text-lg font-medium text-white mb-2">Call Completed</p>
              <p className="text-sm text-gray-400 mb-1">
                Duration: {formatDuration(duration)}
              </p>
              {recordingData && (
                <p className="text-sm text-green-400">
                  ✓ Recording saved ({Math.floor(recordingData.base64.length / 1024)}KB)
                </p>
              )}
              {!recordingData && duration > 0 && (
                <p className="text-sm text-yellow-400">
                  ⚠️ Recording may have failed
                </p>
              )}
              <button
                onClick={onClose}
                className="mt-6 w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
              >
                Close
              </button>
            </motion.div>
          )}

          {/* Info Note */}
          {callState !== 'ended' && (
            <div className="mt-6 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs text-purple-300 text-center">
                ℹ️ Real phone call will be made. Call audio will be recorded.
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
