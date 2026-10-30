import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import toast from 'react-hot-toast';

export default function InAppCallRecorder({ 
  phoneNumber, 
  leadName, 
  leadId,
  onClose, 
  onCallComplete 
}) {
  const [callState, setCallState] = useState('initiating'); // initiating, ringing, active, ended
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [recordingData, setRecordingData] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);
  
  const durationIntervalRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);

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
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const initiateCall = async () => {
    try {
      // Request microphone permission
      console.log('📞 Requesting microphone permission...');
      const permission = await VoiceRecorder.hasAudioRecordingPermission();
      
      if (permission.value !== true) {
        const requested = await VoiceRecorder.requestAudioRecordingPermission();
        if (requested.value !== true) {
          toast.error('Microphone permission required for calls');
          onClose();
          return;
        }
      }

      setHasPermission(true);
      console.log('✅ Microphone permission granted');

      // Get user media for audio feedback (optional)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        console.log('🎤 Microphone stream acquired');
      } catch (err) {
        console.error('Failed to get media stream:', err);
        // Continue anyway, VoiceRecorder will handle it
      }

      // Simulate ringing
      setCallState('ringing');
      toast('Calling ' + phoneNumber + '...', { icon: '📞' });
      
      // Simulate call being answered after 2-3 seconds
      setTimeout(() => {
        startCall();
      }, 2500);
      
    } catch (err) {
      console.error('Call initiation error:', err);
      toast.error('Failed to initiate call: ' + err.message);
      onClose();
    }
  };

  const startCall = async () => {
    console.log('📞 Call connected');
    setCallState('active');
    
    // Start recording automatically
    const recordingStarted = await startRecording();
    
    if (recordingStarted) {
      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      toast.success('Call connected - Recording started');
      
      // Play a beep sound to indicate recording started (optional)
      playBeep();
    } else {
      toast.error('Failed to start recording');
    }
  };

  const startRecording = async () => {
    try {
      console.log('🎙️ Starting voice recording...');
      
      // Start recording with VoiceRecorder
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

  const endCall = async () => {
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

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
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
    }, 1500);
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    // Mute/unmute media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMuted;
      });
      toast(newMuted ? '🔇 Muted' : '🔊 Unmuted', { duration: 1000 });
    }
  };

  const toggleSpeaker = () => {
    const newSpeaker = !isSpeaker;
    setIsSpeaker(newSpeaker);
    
    // Note: Switching between speaker/earpiece requires native code
    // This is a visual toggle for now
    toast(newSpeaker ? '🔊 Speaker ON' : '📱 Earpiece', { duration: 1000 });
  };

  const playBeep = () => {
    // Play a simple beep tone to indicate recording started
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (err) {
      // Silently fail if audio context not available
      console.log('Could not play beep:', err);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleClose = () => {
    if (callState === 'active' || callState === 'ringing') {
      // Confirm before closing active call
      if (window.confirm('End the call?')) {
        endCall();
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
          {/* Close button (only when ended) */}
          {callState === 'ended' && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X size={20} className="text-white" />
            </button>
          )}

          {/* Call Status */}
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
              {callState === 'initiating' && (
                <>
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-sm text-blue-400">Connecting...</span>
                </>
              )}
              {callState === 'ringing' && (
                <>
                  <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-sm text-yellow-400">Ringing...</span>
                </>
              )}
              {callState === 'active' && (
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
                <span className="text-sm text-red-400 font-medium">Recording in progress...</span>
              </motion.div>
            )}
          </div>

          {/* Call Controls */}
          {callState === 'active' && (
            <div className="flex items-center justify-center gap-6 mb-6">
              {/* Mute */}
              <button
                onClick={toggleMute}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isMuted 
                    ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30' 
                    : 'bg-white/10 hover:bg-white/20'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <MicOff size={24} className="text-white" />
                ) : (
                  <Mic size={24} className="text-white" />
                )}
              </button>

              {/* Speaker */}
              <button
                onClick={toggleSpeaker}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isSpeaker 
                    ? 'bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/30' 
                    : 'bg-white/10 hover:bg-white/20'
                }`}
                title={isSpeaker ? 'Use Earpiece' : 'Use Speaker'}
              >
                {isSpeaker ? (
                  <Volume2 size={24} className="text-white" />
                ) : (
                  <VolumeX size={24} className="text-white" />
                )}
              </button>
            </div>
          )}

          {/* End Call Button */}
          {callState !== 'ended' && (
            <button
              onClick={endCall}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold text-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-red-500/30"
            >
              <PhoneOff size={24} />
              <span>End Call</span>
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
                  ✓ Recording saved automatically ({Math.floor(recordingData.base64.length / 1024)}KB)
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
            <div className="mt-6 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-300 text-center">
                ℹ️ This simulates a call. Real audio is being recorded from your microphone.
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
