# 🎙️ Two-Way Call Recording Setup Guide

## 📋 Overview

To record **both sides** of a phone call (your voice + caller's voice), you **must** use a VoIP service like Twilio instead of the phone dialer, because:

- ❌ **Android blocks direct call audio recording** (privacy restriction since Android 10)
- ❌ Phone dialer calls cannot capture the caller's voice
- ✅ **Twilio Voice SDK gives full audio access** to both call participants
- ✅ Twilio provides **automatic call recording** in the cloud

---

## 🎯 Solution Options

### Option 1: Twilio Voice SDK (Recommended)
**Best for:** Production apps, business use, PSTN calls

**Pros:**
- ✅ Records both sides automatically
- ✅ Makes real phone calls (not just internet calls)
- ✅ Cloud storage for recordings
- ✅ Call analytics and logs
- ✅ Global phone numbers
- ✅ Enterprise reliability

**Cons:**
- 💰 Paid service (~$0.013/minute)
- 🔧 Complex setup (backend required)
- 📱 Requires internet connection

**Cost:** ~$15-20/month for light use (1000 minutes)

---

### Option 2: WebRTC (Daily.co / Agora.io)
**Best for:** App-to-app calls, video calls

**Pros:**
- ✅ Built-in recording
- ✅ Video calls option
- ✅ Lower cost
- ✅ Screen sharing

**Cons:**
- ❌ Cannot call regular phone numbers
- ❌ Both parties need the app
- 📱 Internet required

**Cost:** ~$10/month for 1000 minutes

---

### Option 3: Keep Current Implementation + Speaker
**Best for:** Budget projects, testing

**Pros:**
- ✅ Free
- ✅ Real phone calls
- ✅ Already implemented

**Cons:**
- ⚠️ Only records ambient audio
- ⚠️ Must use speaker phone
- ⚠️ Quality depends on environment

**Cost:** $0

---

## 🚀 Recommended: Twilio Voice Implementation

I'll guide you through setting up Twilio for proper two-way recording.

---

## 📦 Step 1: Install Twilio Voice SDK

```bash
cd client
npm install @twilio/voice-react-native-sdk
```

---

## 🔧 Step 2: Configure Android

### 2.1 Update `android/app/build.gradle`

Add after `dependencies {`:

```gradle
dependencies {
    // ... existing dependencies
    
    // Twilio Voice SDK
    implementation 'com.twilio:voice-android:6.4.+'
    implementation 'com.google.firebase:firebase-messaging:23.4.1'
}
```

### 2.2 Update `AndroidManifest.xml`

Add these permissions:

```xml
<!-- Twilio Voice Permissions -->
<uses-permission android:name="android.permission.USE_SIP" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_PHONE_CALL" />
```

---

## 🖥️ Step 3: Setup Backend (Node.js + Express)

Twilio requires a backend server to generate access tokens.

### 3.1 Install Twilio SDK on Backend

```bash
cd server
npm install twilio
```

### 3.2 Get Twilio Credentials

1. Sign up at [twilio.com/console](https://www.twilio.com/console)
2. Get your **Account SID** and **Auth Token**
3. Create a **TwiML App** (Voice → TwiML Apps → Create new)
4. Buy a **phone number** (Phone Numbers → Buy a Number)

### 3.3 Add to `.env`

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3.4 Create Access Token Endpoint

**File:** `server/src/routes/twilio.js`

```javascript
const express = require('express');
const twilio = require('twilio');
const router = express.Router();

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

// Generate access token for client
router.post('/access-token', async (req, res) => {
  try {
    const { userId, userName } = req.body;
    
    const identity = `user_${userId}`;
    
    // Create access token
    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity }
    );
    
    // Grant voice access
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
      incomingAllow: true
    });
    
    token.addGrant(voiceGrant);
    
    res.json({
      token: token.toJwt(),
      identity
    });
  } catch (err) {
    console.error('Token generation error:', err);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// Make outgoing call (TwiML endpoint)
router.post('/voice', (req, res) => {
  const { To } = req.body;
  
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  
  // Start recording
  const dial = response.dial({
    callerId: process.env.TWILIO_PHONE_NUMBER,
    record: 'record-from-answer', // Record both sides
    recordingStatusCallback: '/twilio/recording-callback',
    recordingStatusCallbackEvent: 'completed'
  });
  
  dial.number(To);
  
  res.type('text/xml');
  res.send(response.toString());
});

// Recording callback (save recording URL)
router.post('/recording-callback', async (req, res) => {
  const { RecordingSid, RecordingUrl, CallSid, RecordingDuration } = req.body;
  
  console.log('Recording completed:', {
    sid: RecordingSid,
    url: RecordingUrl,
    duration: RecordingDuration
  });
  
  // TODO: Save to database
  // await prisma.callRecording.create({
  //   data: {
  //     twilioSid: RecordingSid,
  //     audioUrl: RecordingUrl,
  //     duration: parseInt(RecordingDuration),
  //     ...
  //   }
  // });
  
  res.sendStatus(200);
});

module.exports = router;
```

### 3.5 Register Route

**File:** `server/src/index.js`

```javascript
const twilioRoutes = require('./routes/twilio');
app.use('/twilio', twilioRoutes);
```

---

## 📱 Step 4: Create React Native Component

**File:** `client/src/components/TwilioVoiceCall.jsx`

```javascript
import { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Voice } from '@twilio/voice-react-native-sdk';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function TwilioVoiceCall({ 
  phoneNumber, 
  leadName, 
  leadId,
  onClose, 
  onCallComplete 
}) {
  const [callState, setCallState] = useState('preparing'); // preparing, calling, active, ended
  const [duration, setDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(true); // Always recording with Twilio
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [call, setCall] = useState(null);
  
  const durationIntervalRef = useRef(null);

  useEffect(() => {
    initializeTwilio();
    
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    if (call) {
      call.disconnect();
    }
  };

  const initializeTwilio = async () => {
    try {
      setCallState('preparing');
      
      // Get access token from backend
      const response = await api.post('/twilio/access-token', {
        userId: user.id,
        userName: user.fullName
      });
      
      const { token } = response.data;
      
      // Register with Twilio
      await Voice.register(token);
      
      // Make the call
      makeCall(token);
      
    } catch (err) {
      console.error('Twilio initialization error:', err);
      toast.error('Failed to initialize call: ' + err.message);
      onClose();
    }
  };

  const makeCall = async (token) => {
    try {
      setCallState('calling');
      toast('Calling...', { icon: '📞' });
      
      // Connect to phone number
      const outgoingCall = await Voice.connect(token, {
        params: {
          To: phoneNumber
        }
      });
      
      setCall(outgoingCall);
      
      // Listen for call events
      outgoingCall.on('connected', () => {
        console.log('Call connected');
        setCallState('active');
        toast.success('Call connected - Recording automatically');
        
        // Start duration counter
        durationIntervalRef.current = setInterval(() => {
          setDuration(prev => prev + 1);
        }, 1000);
      });
      
      outgoingCall.on('disconnected', () => {
        console.log('Call disconnected');
        handleCallEnd();
      });
      
      outgoingCall.on('reconnecting', () => {
        toast('Reconnecting...', { icon: '🔄' });
      });
      
    } catch (err) {
      console.error('Call error:', err);
      toast.error('Failed to make call');
      onClose();
    }
  };

  const handleCallEnd = () => {
    setCallState('ended');
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    toast.success('Call ended - Recording saved automatically');
    
    // Wait for Twilio webhook to save recording
    setTimeout(() => {
      onCallComplete(null, duration); // Recording URL comes via webhook
    }, 2000);
  };

  const endCall = () => {
    if (call) {
      call.disconnect();
    }
  };

  const toggleMute = () => {
    if (call) {
      const newMuted = !isMuted;
      call.mute(newMuted);
      setIsMuted(newMuted);
      toast(newMuted ? '🔇 Muted' : '🔊 Unmuted', { duration: 1000 });
    }
  };

  const toggleSpeaker = () => {
    const newSpeaker = !isSpeaker;
    // Audio routing handled by Twilio SDK
    setIsSpeaker(newSpeaker);
    toast(newSpeaker ? '🔊 Speaker ON' : '📱 Earpiece', { duration: 1000 });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return \`\${String(mins).padStart(2, '0')}:\${String(secs).padStart(2, '0')}\`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gradient-to-b from-dark-800 to-dark-900 rounded-3xl p-8 w-full max-w-md border border-white/10 shadow-2xl relative"
        >
          {/* Close button */}
          {callState === 'ended' && (
            <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
              <X size={20} className="text-white" />
            </button>
          )}

          {/* Contact Info */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mb-4">
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
                  <span className="text-sm text-blue-400">Connecting...</span>
                </>
              )}
              {callState === 'calling' && (
                <>
                  <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-sm text-yellow-400">Calling...</span>
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
            {callState === 'active' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 mt-4 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30"
              >
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm text-red-400 font-medium">Recording both sides...</span>
              </motion.div>
            )}
          </div>

          {/* Call Controls */}
          {callState === 'active' && (
            <div className="flex items-center justify-center gap-6 mb-6">
              <button
                onClick={toggleMute}
                className={\`w-16 h-16 rounded-full flex items-center justify-center transition-all \${
                  isMuted ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'
                }\`}
              >
                {isMuted ? <MicOff size={24} className="text-white" /> : <Mic size={24} className="text-white" />}
              </button>

              <button
                onClick={toggleSpeaker}
                className={\`w-16 h-16 rounded-full flex items-center justify-center transition-all \${
                  isSpeaker ? 'bg-brand-500' : 'bg-white/10 hover:bg-white/20'
                }\`}
              >
                {isSpeaker ? <Volume2 size={24} className="text-white" /> : <VolumeX size={24} className="text-white" />}
              </button>
            </div>
          )}

          {/* End Call Button */}
          {callState !== 'ended' && callState !== 'preparing' && (
            <button
              onClick={endCall}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold text-lg flex items-center justify-center gap-3"
            >
              <PhoneOff size={24} />
              <span>End Call</span>
            </button>
          )}

          {/* Call Ended */}
          {callState === 'ended' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Phone size={32} className="text-green-400" />
              </div>
              <p className="text-lg font-medium text-white mb-2">Call Completed</p>
              <p className="text-sm text-gray-400 mb-1">Duration: {formatDuration(duration)}</p>
              <p className="text-sm text-green-400">✓ Recording saved automatically (both sides)</p>
              <button onClick={onClose} className="mt-6 w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium">
                Close
              </button>
            </motion.div>
          )}

          {/* Info */}
          {callState !== 'ended' && (
            <div className="mt-6 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs text-purple-300 text-center">
                ✨ Powered by Twilio - Both sides recorded automatically
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

---

## 🔗 Step 5: Configure TwiML App

1. Go to [Twilio Console → Voice → TwiML Apps](https://console.twilio.com/us1/develop/voice/manage/twiml-apps)
2. Click your TwiML App
3. Set **Voice Request URL** to: `https://your-backend.com/twilio/voice` (POST)
4. Set **Status Callback URL** to: `https://your-backend.com/twilio/recording-callback` (POST)
5. Save

---

## 📊 Step 6: Update Database Schema

Add Twilio fields to CallRecording:

```prisma
model CallRecording {
  id          String   @id @default(cuid())
  leadId      String
  userId      String
  
  // Twilio specific
  twilioSid   String?  @unique
  twilioCallSid String?
  audioUrl    String
  
  duration    Int      // in seconds
  notes       String?
  createdAt   DateTime @default(now())
  
  lead        Lead     @relation(fields: [leadId], references: [id])
  user        User     @relation(fields: [userId], references: [id])
}
```

---

## 💰 Step 7: Cost Estimate

### Twilio Pricing (US)
- **Outbound calls:** $0.013/minute
- **Inbound calls:** $0.0085/minute
- **Phone number:** $1/month
- **Call recording:** $0.0025/minute
- **Recording storage:** $0.0005/minute/month

### Example Cost for 1000 minutes/month
- Calls: 1000 min × $0.013 = **$13.00**
- Recording: 1000 min × $0.0025 = **$2.50**
- Storage: 1000 min × $0.0005 = **$0.50**
- Phone number: **$1.00**

**Total: ~$17/month**

---

## ✅ Step 8: Testing

1. Start backend with Twilio credentials
2. Rebuild and install APK
3. Click phone icon on lead
4. Call connects via Twilio
5. Both sides are recorded automatically
6. Recording URL saved via webhook
7. Check recording in Twilio Console or your database

---

## 🎯 Summary

### What You Get with Twilio:
- ✅ **Both sides recorded** (you + caller)
- ✅ **Cloud storage** (recordings hosted by Twilio)
- ✅ **High quality** audio
- ✅ **Automatic recording** (no manual start/stop)
- ✅ **Call analytics** (duration, timestamps, status)
- ✅ **Phone numbers** (your business number)

### What You Need:
- 💰 Twilio account (~$17/month for 1000 minutes)
- 🖥️ Backend server (already have)
- 🔧 TwiML app configuration
- 📱 Internet connection on device

---

## 🚀 Quick Start Commands

```bash
# Install Twilio on client
cd client
npm install @twilio/voice-react-native-sdk

# Install Twilio on server
cd server
npm install twilio

# Add environment variables to server/.env
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_TWIML_APP_SID=APxxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_API_KEY=SKxxxx
TWILIO_API_SECRET=xxxx

# Rebuild APK
cd client
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

---

## 📚 Resources

- [Twilio Voice SDK Docs](https://www.twilio.com/docs/voice/sdks/react-native)
- [Twilio Console](https://console.twilio.com)
- [Twilio Pricing](https://www.twilio.com/voice/pricing)
- [TwiML Reference](https://www.twilio.com/docs/voice/twiml)

---

**Ready to implement? Let me know and I'll create all the files!** 🚀
