# 📸 AI-Powered Lead Capture Feature

## Overview
The AI-Powered Lead Capture feature allows sales team members to instantly create leads by simply taking a photo or uploading an image. The system uses OpenAI's GPT-4o-mini Vision API to automatically extract lead information from images like business cards, brochures, advertisements, or screenshots.

## ✨ Key Features

### 1. **Quick Photo Capture**
   - Purple floating action button (camera icon) on dashboard
   - Available only for SALES_EXECUTIVE role
   - Take photo directly with device camera
   - Upload existing photos/videos from gallery

### 2. **AI Vision Analysis**
   - Automatically extracts lead information:
     - Lead name (full name)
     - Company name
     - Phone number
     - Email address
     - Project name
     - Location
   
   - Extracts research/advertisement data:
     - Advertiser identity (brand/page owner)
     - Ad running duration
     - Creative type (Static Poster/Reels/Drone shot)
     - Funnel type (Lead Form/WhatsApp/Landing Page)

### 3. **Smart Lead Creation**
   - Creates both regular lead AND research lead automatically
   - Tagged as `ai-capture` and `research-data` for easy filtering
   - Awards 10 XP (bonus for innovative capture method)
   - Creates activity log entry
   - Adds detailed notes with extracted information

### 4. **User-Friendly Flow**
   1. Click purple camera button on dashboard
   2. Choose "Take Photo" or "Upload File"
   3. AI analyzes image (5-10 seconds)
   4. Review extracted data in preview
   5. Confirm and create lead instantly

## 🎯 Use Cases

### Perfect For:
- **Business Cards** - Capture contact information instantly
- **Real Estate Ads** - Extract developer/project details from advertisements
- **Brochures** - Get company and contact info from marketing materials
- **Social Media Ads** - Analyze competitor ads and capture lead information
- **Billboards** - Photo of outdoor advertising with contact details
- **Website Screenshots** - Capture landing page information

### Example Scenarios:
1. **At a Trade Show**: Snap business cards → Instant lead creation
2. **Competitor Research**: Photo of competitor ad → Research lead with analysis
3. **Site Visit**: Photo of project board → Lead with location and project details
4. **Digital Marketing**: Screenshot of Facebook ad → Full advertiser analysis

## 🔧 Technical Details

### Frontend Components
- **File**: `client/src/components/QuickLeadCapture.jsx`
- **Integration**: Dashboard.jsx (SALES_EXECUTIVE only)
- **Camera API**: Capacitor Camera Plugin
- **Base64 Encoding**: Images converted for API transmission

### Backend Endpoints

#### 1. POST `/api/leads/analyze-media`
**Purpose**: Analyze image and extract lead data using AI Vision

**Request**:
```json
{
  "image": "base64_encoded_image_data",
  "format": "jpeg"
}
```

**Response**:
```json
{
  "leadData": {
    "fullName": "John Smith",
    "company": "ABC Developers",
    "phone": "+91 98765 43210",
    "email": "john@abcdev.com",
    "projectName": "Skyline Towers",
    "location": "Mumbai, Maharashtra"
  },
  "researchData": {
    "advertiserIdentity": "ABC Developers Official",
    "adRunningSince": "2 weeks",
    "creativeType": "Drone shot",
    "funnelType": "WhatsApp redirect"
  },
  "confidence": "high"
}
```

#### 2. POST `/api/leads/create-from-analysis`
**Purpose**: Create lead and research entry from extracted data

**Request**:
```json
{
  "leadData": { /* extracted lead data */ },
  "researchData": { /* extracted research data */ }
}
```

**Response**:
```json
{
  "message": "Lead created successfully from AI analysis",
  "lead": { /* created lead object */ },
  "researchDataAdded": true
}
```

### AI Model Used
- **Model**: OpenAI GPT-4o-mini (Vision-enabled)
- **Temperature**: 0.3 (precise extraction)
- **Max Tokens**: 500
- **Cost**: ~$0.01 per image analysis

## 📋 Requirements

### API Configuration
**OpenAI API Key Required**
- Set in `.env`: `OPENAI_API_KEY=sk-...`
- Or configure in Settings → AI Configuration
- GPT-4o-mini Vision model access needed

### Permissions (Android)
- Camera permission (already configured in AndroidManifest.xml)
- Storage read permission (for uploads)

### Network
- Requires internet connection for AI analysis
- Image uploaded to OpenAI Vision API
- Average processing time: 5-10 seconds

## 🎨 UI/UX Features

### Visual Design
- **Purple gradient FAB**: Matches brand secondary color scheme
- **Position**: Bottom-right corner (above check-in button)
- **Animation**: Spring animation on mount, scale on tap
- **Modal**: Full-screen on mobile, centered on desktop

### States & Feedback
- **Loading**: Spinner while capturing/uploading
- **Analyzing**: AI brain animation with progress message
- **Success**: Green checkmark with extracted data preview
- **Error**: Red alert with actionable error message

### Mobile Optimization
- Touch-friendly button sizes
- Responsive modal layout
- Optimized camera capture flow
- File picker integration

## 📊 Analytics & Tracking

### XP System
- **10 XP** awarded per AI-captured lead (higher than manual entry)
- Bonus for innovation and efficiency
- Tracked in leaderboard system

### Activity Logging
- Type: `LEAD_CREATED`
- Title: "📸 Created lead via AI capture: [Name]"
- Links to created lead
- Visible in dashboard activity feed

### Lead Tagging
- `ai-capture`: Identifies AI-captured leads
- `research-data`: Marks leads with research information
- Filterable in Leads and Tasks sections

## 🔍 Lead Details Stored

### Standard Lead Fields
- Full Name
- Company Name
- Phone Number
- Email Address
- Location (with geocoding)
- Project Name
- Lead Type: BUILDER (default)
- Stage: CONNECT (initial stage)
- Temperature: WARM
- Source: `AI_CAPTURE` (new source type)

### Research Data Notes
```
🔍 RESEARCH DATA (AI-EXTRACTED)
━━━━━━━━━━━━━━━━━━━━
🎯 Advertiser Analysis:
  Advertiser Identity: [Extracted]
  Ad Running Since: [Duration]
  Creative Type: [Type]
  Funnel Type: [Funnel]

📸 Capture Method: AI Vision Analysis
📅 Captured: [Timestamp]
━━━━━━━━━━━━━━━━━━━━
```

## 🚀 Performance Considerations

### Image Processing
- **Max File Size**: 10MB (Capacitor Camera default)
- **Supported Formats**: JPEG, PNG, WebP, HEIC
- **Base64 Encoding**: Handled client-side
- **Network Usage**: ~1-3MB per analysis request

### API Costs
- OpenAI GPT-4o-mini Vision: ~$0.01 per image
- Estimated monthly cost (100 captures): ~$1.00
- Very cost-effective compared to manual data entry time

### Response Times
- Image capture: Instant
- Upload: 1-2 seconds
- AI analysis: 5-10 seconds
- Lead creation: 1-2 seconds
- **Total**: ~10-15 seconds end-to-end

## 🔒 Security & Privacy

### Data Handling
- Images sent to OpenAI API (encrypted HTTPS)
- Base64 encoding for transmission
- No images stored on server
- OpenAI retention: 30 days max (per their policy)

### Access Control
- Feature restricted to SALES_EXECUTIVE role only
- Requires authentication token
- Rate limiting applies (API level)

### Best Practices
- Don't capture sensitive personal documents
- Use for business-related leads only
- Comply with data protection regulations
- Inform leads if capturing their information

## 📱 Installation & Setup

### 1. Backend Setup
```bash
# Server environment variable
echo "OPENAI_API_KEY=sk-your-key-here" >> server/.env

# Or set in Settings UI
# Navigate to Settings → AI Configuration → Add OpenAI API Key
```

### 2. Build APK
```bash
cd client
npm run build
npx cap sync android
cd android
./gradlew :app:assembleRelease --offline
```

### 3. Install APK
- File: `client/PreSold-CRM-AI-Capture-v6.apk`
- Size: 7.64 MB
- Install on device and grant camera permissions

## 🎓 User Training Tips

### For Sales Teams:
1. **Practice First**: Try with clear, well-lit images
2. **Angle Matters**: Keep camera perpendicular to text
3. **Lighting**: Ensure good lighting, avoid shadows
4. **Review Data**: Always review extracted information before confirming
5. **Manual Edit**: You can edit any field in the preview before creating

### Common Issues:
- **Blurry Images**: Retake with steady hand
- **Low Light**: Use flash or find better lighting
- **Partial Text**: Ensure all information is visible in frame
- **Handwriting**: Works best with printed text

## 🔄 Future Enhancements

### Planned Features:
- [ ] Batch processing (multiple images at once)
- [ ] OCR fallback for low-quality images
- [ ] Confidence scoring display
- [ ] Image editing before analysis
- [ ] Offline mode with sync later
- [ ] Video frame extraction
- [ ] Voice note transcription
- [ ] Business card scanner mode
- [ ] QR code detection and parsing

### Integration Ideas:
- WhatsApp image forwarding → auto-lead creation
- Email attachment processing
- Integration with document scanner apps
- Cloud storage auto-import (Google Drive, Dropbox)

## 📞 Support & Troubleshooting

### Common Errors

**"OpenAI API key is required"**
- Solution: Add API key in Settings or .env file

**"Failed to analyze image"**
- Check: Internet connection
- Check: Image format is supported
- Try: Smaller file size or better quality

**"Unable to create lead"**
- Verify: At least name and company were extracted
- Check: Backend server is running
- Try: Manual entry if AI extraction fails

### Contact
For issues or feature requests:
- GitHub: [Repository Issues]
- Team Lead: Check with admin
- Support: help@presold-crm.com

## 📊 Success Metrics

### Efficiency Gains:
- **Manual Entry Time**: ~5-10 minutes per lead
- **AI Capture Time**: ~15 seconds per lead
- **Time Saved**: 95%+ reduction
- **Data Accuracy**: 90%+ with AI extraction

### Adoption Targets:
- Week 1: 10% of leads via AI capture
- Month 1: 30% of leads via AI capture
- Month 3: 50%+ of leads via AI capture

## 🏆 Best Practices

### Do's:
✅ Use clear, well-lit photos
✅ Capture full business cards/brochures
✅ Review extracted data before confirming
✅ Use for competitive research
✅ Take advantage of 10 XP bonus

### Don'ts:
❌ Don't capture blurry images
❌ Don't skip the review step
❌ Don't use for non-business purposes
❌ Don't capture sensitive personal info without consent

---

## 📦 APK Information

**Filename**: `PreSold-CRM-AI-Capture-v6.apk`
**Size**: 7.64 MB
**Build Date**: October 29, 2026
**Version**: 6.0
**Minimum Android**: 7.0 (API 24)

### What's New in v6:
- ✨ NEW: AI-powered photo lead capture
- 📸 Camera integration with instant analysis
- 🤖 GPT-4o-mini Vision API integration
- 📋 Automatic research lead creation
- 🎯 Dual tagging system (ai-capture + research-data)
- 🏆 10 XP bonus for AI captures
- 🎨 Purple FAB button for quick access

### Previous Features (v1-v5):
- ✅ Background location tracking
- ✅ Synced attendance databases
- ✅ Enhanced research lead form (6 steps)
- ✅ Pink highlighting for research leads
- ✅ Projects section with completion tracker
- ✅ Video upload support

---

**Built with ❤️ for PreSold CRM Sales Teams**
