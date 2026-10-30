# WebRTC In-App Calling Implementation Guide

## Overview
This document explains how to implement **automatic call recording** by making calls through the app using WebRTC, instead of the system dialer.

---

## Why WebRTC?

### ❌ System Dialer Limitations:
- Cannot access call audio streams
- Android blocks call recording (security restriction)
- No control over call audio
- Requires root access or system app privileges

### ✅ WebRTC Benefits:
- Full control over audio streams
- **Automatic recording** possible ✅
- Works on all Android versions
- No special permissions needed (just microphone)
- Can add video calling later

---

## Current Implementation

### What's Ready:
✅ `InAppCallRecorder.jsx` - Call UI component
✅ Automatic recording start when call connects
✅ Call duration tracking
✅ Mute/unmute functionality
✅ Speaker toggle
✅ Automatic save to lead when call ends
✅ Beautiful call interface

### What's Missing (Production Requirements):
⚠️ WebRTC signaling server
⚠️ STUN/TURN servers for NAT traversal
⚠️ Actual peer-to-peer connection logic

---

## Production Implementation Options

### Option 1: Simple WebRTC (Free)
**Use simple-peer library with your own signaling server**

#### Install Dependencies:
```bash
npm install simple-peer socket.io-client
```

#### Setup:
1. Create WebSocket signaling server (Node.js)
2. Implement peer connection logic
3. Add STUN servers (free from Google)

**Pros:**
- Free (except server hosting)
- Full control
- No per-minute costs

**Cons:**
- Complex setup
- Need to maintain infrastructure
- May have connection issues

---

### Option 2: Twilio Programmable Voice (Recommended)
**Use Twilio's API for calling**

#### Install Dependencies:
```bash
npm install twilio-video @twilio/voice-sdk
```

#### Setup:
```javascript
import { Device } from '@twilio/voice-sdk';

// Initialize
const device = new Device(twilioToken);

// Make call
const call = await device.connect({
  params: { To: phoneNumber }
});

// Start recording automatically
call.on('accept', () => {
  startRecording();
});
```

**Pricing:**
- Voice: $0.013/min (incoming)
- Recording: $0.0025/min
- Example: 100 minutes = $1.55

**Pros:**
- Easy implementation
- Reliable connection
- Built-in recording option
- Global phone numbers

**Cons:**
- Pay per minute
- Requires Twilio account

---

### Option 3: Daily.co (Easy WebRTC)
**Use Daily.co's prebuilt WebRTC**

#### Install Dependencies:
```bash
npm install @daily-co/daily-js
```

#### Setup:
```javascript
import DailyIframe from '@daily-co/daily-js';

// Create call room
const callFrame = DailyIframe.createFrame();
await callFrame.join({ url: roomUrl });

// Auto-start recording
callFrame.startRecording();
```

**Pricing:**
- Free: 10,000 minutes/month
- Pro: $99/month unlimited

**Pros:**
- Super easy setup
- Free tier available
- Built-in recording
- No infrastructure needed

**Cons:**
- Requires internet connection
- Both parties need app

---

## Implementation Steps

### Step 1: Choose Service
Pick one of the options above based on budget and requirements.

### Step 2: Update InAppCallRecorder.jsx

Replace the demo `initiateCall()` function with real WebRTC code:

**For Twilio:**
```javascript
import { Device } from '@twilio/voice-sdk';

const initiateCall = async () => {
  try {
    // Get Twilio token from your backend
    const response = await api.post('/twilio/token', { 
      leadId, 
      phoneNumber 
    });
    const token = response.data.token;

    // Initialize Twilio Device
    const device = new Device(token);
    await device.register();

    // Make call
    const call = await device.connect({
      params: { To: phoneNumber }
    });

    setCallState('ringing');

    // When call is accepted
    call.on('accept', () => {
      setCallState('active');
      startRecording(); // Start auto-recording
      startDurationCounter();
    });

    // When call ends
    call.on('disconnect', () => {
      endCall();
    });

  } catch (err) {
    console.error('Call failed:', err);
    toast.error('Failed to make call');
  }
};
```

**For Simple-Peer (WebRTC):**
```javascript
import SimplePeer from 'simple-peer';
import io from 'socket.io-client';

const initiateCall = async () => {
  // Connect to signaling server
  const socket = io('https://your-signaling-server.com');

  // Create peer connection
  const peer = new SimplePeer({
    initiator: true,
    stream: await navigator.mediaDevices.getUserMedia({ audio: true })
  });

  // Send offer to signaling server
  peer.on('signal', data => {
    socket.emit('call-offer', { 
      to: phoneNumber, 
      offer: data 
    });
  });

  // Receive answer
  socket.on('call-answer', answer => {
    peer.signal(answer);
  });

  // When connected
  peer.on('connect', () => {
    setCallState('active');
    startRecording();
  });

  // Get remote audio stream
  peer.on('stream', remoteStream => {
    const audio = new Audio();
    audio.srcObject = remoteStream;
    audio.play();
  });
};
```

### Step 3: Update Backend

Add endpoints to handle calling:

**For Twilio:**
```javascript
// server/src/routes/twilio.js
router.post('/token', authenticate, async (req, res) => {
  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY,
    process.env.TWILIO_API_SECRET
  );

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWILIO_APP_SID,
    incomingAllow: true
  });

  token.addGrant(voiceGrant);
  token.identity = req.user.id;

  res.json({ token: token.toJwt() });
});
```

### Step 4: Test Implementation

1. Install chosen service SDK
2. Update `InAppCallRecorder.jsx` with real connection logic
3. Test call initiation
4. Verify recording starts automatically
5. Test call end and recording save
6. Test on actual device

---

## Testing Checklist

### Basic Functionality:
- [ ] Call button opens in-app call interface
- [ ] Call connects successfully
- [ ] Recording starts automatically when call begins
- [ ] Duration counter works
- [ ] Mute/unmute functions
- [ ] Speaker toggle works
- [ ] Call ends properly
- [ ] Recording saves to lead automatically

### Edge Cases:
- [ ] Call fails to connect
- [ ] Recording permission denied
- [ ] Network connection lost during call
- [ ] App minimized during call
- [ ] Multiple calls in sequence
- [ ] User cancels before connection

---

## Environment Variables

Add to `.env`:

**For Twilio:**
```env
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxxx
TWILIO_API_KEY=SKxxxxx
TWILIO_API_SECRET=xxxxxx
TWILIO_APP_SID=APxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

**For Daily.co:**
```env
DAILY_API_KEY=xxxxx
DAILY_DOMAIN=your-domain.daily.co
```

---

## Cost Comparison

### Twilio (Pay per use):
- Setup: Free
- Monthly: $0 base fee
- Usage: ~$0.015/minute
- **Example:** 1000 minutes/month = $15

### Daily.co (Subscription):
- Setup: Free
- Monthly: $0 (free tier) or $99 (unlimited)
- Usage: Included in plan
- **Example:** Unlimited calls = $99/month

### Simple-Peer (DIY):
- Setup: Free
- Monthly: Server hosting (~$10-50)
- Usage: Free (unlimited)
- **Example:** Self-hosted = $10-50/month

---

## Recommended Approach

### For Production:
**Use Twilio Programmable Voice**

**Reasons:**
1. Easiest to implement
2. Most reliable
3. Global phone network access
4. Built-in recording support
5. Pay only for what you use
6. Great documentation

### Implementation Time:
- Twilio: **1-2 days**
- Daily.co: **2-3 days**
- Simple-Peer: **1-2 weeks**

---

## Alternative: Hybrid Approach

Keep both options and let admin choose:

```jsx
// In LeadDetail.jsx
<div className="flex gap-2">
  <button onClick={handleInAppCall}>
    📞 In-App Call (Auto-record)
  </button>
  <button onClick={handleSystemCall}>
    📱 System Dialer (Manual record)
  </button>
</div>
```

**Benefits:**
- Users can choose based on situation
- Fallback if in-app fails
- Flexibility for different use cases

---

## Current Status

✅ UI components ready
✅ Automatic recording logic ready
✅ Save to backend ready
⚠️ **Missing:** WebRTC connection implementation

### Next Steps:
1. Choose a service (Twilio recommended)
2. Create account and get API keys
3. Update `InAppCallRecorder.jsx` with real connection code
4. Add backend endpoints for token generation
5. Test thoroughly
6. Deploy

---

## Support

**Need help implementing?**
1. Twilio Docs: https://www.twilio.com/docs/voice
2. Daily.co Docs: https://docs.daily.co/
3. WebRTC Docs: https://webrtc.org/getting-started/overview

**Common Issues:**
- Microphone permission: Check AndroidManifest.xml
- STUN/TURN servers: Use Google's free STUN servers
- NAT traversal: Ensure TURN server configured
- Audio quality: Check bitrate settings

---

## Conclusion

Automatic call recording is **possible** but requires making calls through the app using WebRTC or VoIP services. The current implementation provides the UI and recording logic - you just need to add the actual calling service.

**Recommended:** Start with Twilio for easiest and most reliable implementation.
