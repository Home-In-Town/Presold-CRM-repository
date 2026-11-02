# 🎓 TRAINING SYSTEM DEPLOYMENT GUIDE

## 📋 Overview

This guide covers deploying the complete PreSold CRM Training Module System to production.

### ✨ Training System Features
- **Admin Training Scheduler** with video upload (up to 500MB)
- **Google Form-style MCQ Builder** with 4 options per question
- **12-hour Time Picker** for scheduling
- **Video Streaming** with GridFS (seekable playback)
- **Forced Training Popup** (no skip, no escape)
- **Step-based Flow:** Intro → Video → Quiz → Result
- **Automatic Scoring** and percentage calculation
- **Training Library** for users to browse all modules
- **Filter by:** All / Pending / Completed
- **Admin Statistics Dashboard** showing all user scores

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Backend Deployment (Google Cloud Run)

#### Prerequisites
- Google Cloud account with billing enabled
- Existing Cloud Run service: `presold-crm-server`
- Region: `asia-south1`

#### 1.1 Verify Environment Variables in Cloud Run

Go to: https://console.cloud.google.com/run

Find your service `presold-crm-server` and verify these environment variables are set:

```bash
DATABASE_URL=<your-production-mongodb-url>

TRACKING_DATABASE_URL=<your-tracking-mongodb-url>

JWT_SECRET=<your-jwt-secret-key>

JWT_EXPIRES_IN=30d

PORT=8080

NODE_ENV=production

FRONTEND_URL=https://sales.homeintown.in,capacitor://localhost,http://localhost

GROQ_API_KEY=<your-groq-api-key>

GROQ_MODEL=llama-3.1-8b-instant
```

**Note:** Use the actual values from your `server/.env` file.

#### 1.2 Deploy Backend

**Option A: Automatic Deployment (Recommended)**

If you have Cloud Build triggers configured:

1. Push to GitHub:
   ```bash
   git status
   git add -A
   git commit -m "deploy: training system to production"
   git push origin master
   ```

2. Monitor deployment:
   - Go to: https://console.cloud.google.com/cloud-build/builds
   - Wait 5-10 minutes for automatic build
   - Status should turn green when complete

**Option B: Manual Deployment**

If automatic deployment doesn't trigger:

```bash
cd server

# Build and deploy using Cloud Build
gcloud builds submit --config=cloudbuild.yaml

# Or deploy directly
gcloud run deploy presold-crm-server \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated
```

#### 1.3 Verify Backend Deployment

Test the training endpoints:

```bash
# Test 1: Check training modules endpoint (should return 401 or empty array, not HTML)
curl https://presold-crm-server-624770114041.asia-south1.run.app/api/training/modules

# Test 2: Check video streaming endpoint (should return 404 for invalid ID, not HTML)
curl https://presold-crm-server-624770114041.asia-south1.run.app/api/training/videos/test123

# Test 3: Check health endpoint
curl https://presold-crm-server-624770114041.asia-south1.run.app/health
```

**✅ Expected Response for Test 1:**
```json
{"error": "Unauthorized"}
```

**❌ Wrong Response (means not deployed yet):**
```html
<!DOCTYPE html>...Cannot GET /api/training/modules...
```

---

### Step 2: Update Prisma Schema in Production Database

The backend Dockerfile already includes Prisma generation, but you should verify the schema is applied:

#### 2.1 Check Database Schema

Option A: Connect via MongoDB Compass
1. Connect to your production MongoDB URL (from DATABASE_URL in Cloud Run)
2. Verify collections exist:
   - `TrainingModule`
   - `TrainingQuestion`
   - `TrainingCompletion`

Option B: Run from deployed Cloud Run instance
```bash
# SSH into Cloud Run container (if enabled)
gcloud run services proxy presold-crm-server --region=asia-south1

# Or check logs for Prisma initialization
gcloud run services logs read presold-crm-server --region=asia-south1 --limit=50
```

#### 2.2 Manual Schema Push (If Needed)

If collections don't exist, run this locally:

```bash
cd server

# Ensure DATABASE_URL is set to production
export DATABASE_URL="<your-production-mongodb-url>"

# Push schema to production
npx prisma db push --skip-generate

# Verify
npx prisma studio
```

---

### Step 3: Frontend Deployment (Vercel)

#### 3.1 Build Frontend Locally (Verification)

```bash
cd client

# Install dependencies (if needed)
npm install

# Build for production
npm run build

# Verify build output
ls -la dist/
```

**Expected Output:**
- `dist/index.html`
- `dist/assets/` folder with JS and CSS files
- Build size: ~1.4MB main bundle

#### 3.2 Deploy to Vercel

**Option A: Automatic Deployment (Recommended)**

If you have Vercel connected to your GitHub repo:

1. Push code:
   ```bash
   git push origin master
   ```

2. Vercel will automatically:
   - Detect the push
   - Build the frontend
   - Deploy to production

3. Monitor at: https://vercel.com/your-project/deployments

**Option B: Manual Deployment**

```bash
cd client

# Install Vercel CLI (if needed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

#### 3.3 Verify Frontend Deployment

Visit your production URL: **https://sales.homeintown.in**

**Check these pages:**
1. `/login` - Login page loads
2. `/dashboard` - Dashboard loads (after login)
3. `/training` - Admin training page (admin only)
4. `/training-library` - Training library page (all users)

**Check navigation:**
- Admin users should see "Training" in sidebar
- All users should see "My Training" in sidebar

---

### Step 4: Test Complete Training Flow

#### 4.1 Admin Creates Training Module

1. Login as admin with your admin credentials
2. Go to: Training section
3. Create a new training module:
   - **Topic Name:** "Customer Service Training"
   - **Description:** "Learn best practices for customer service"
   - **Upload Video:** Select a video file (max 500MB)
   - **Scheduled Date:** Tomorrow's date
   - **Scheduled Time:** Select a time (e.g., "02:00 PM")
   - **Add MCQ Questions:**
     - Question 1: "What is the first rule of customer service?"
       - Options: ["Always smile", "Listen actively", "Speak fast", "Ignore complaints"]
       - Correct Answer: "Listen actively" (index 1)
     - Question 2: "How should you handle angry customers?"
       - Options: ["Argue back", "Stay calm", "Ignore them", "Hang up"]
       - Correct Answer: "Stay calm" (index 1)
4. Click "Create Training Module"
5. Verify it appears in the modules list

#### 4.2 User Sees Training Popup

1. Login as a regular user (SALES_EXECUTIVE role)
2. Refresh the dashboard
3. **Expected:** Full-screen popup appears with training module
4. **Verify popup shows:**
   - Topic name
   - Description
   - "Start Training" button
   - No close/skip button

#### 4.3 Complete Training Flow

1. Click "Start Training"
2. **Video plays:**
   - Video should be seekable
   - Volume controls work
   - Can pause/play
3. Watch video to completion
4. **Quiz appears:**
   - One question at a time
   - 4 options with radio buttons
   - Progress indicator (e.g., "Question 1 of 2")
   - "Next" button
5. Answer all questions
6. Click "Submit Quiz"
7. **Results show:**
   - Score (e.g., "2 out of 2")
   - Percentage (e.g., "100%")
   - Visual feedback (green checkmark for pass)
   - "Close" button

#### 4.4 Verify Training Library

1. Go to: "My Training" section
2. **Verify display:**
   - All training modules shown
   - Filter buttons: All / Pending / Completed
   - Stats cards: Total / Completed / Average Score
   - Module cards show:
     - Topic name
     - Date and time
     - Number of questions
     - Score (if completed)
     - Status badge (Completed/Pending)
3. Click on a completed module
4. Can watch video again (no quiz)

#### 4.5 Admin Views Statistics

1. Login as admin
2. Go to: Training section
3. Click "View Stats" on a module
4. **Verify display:**
   - List of all users
   - Each user's completion status
   - Score and percentage
   - Completion date/time
   - Filter/search functionality

---

### Step 5: Build and Deploy Mobile App

#### 5.1 Sync Capacitor with Web Build

```bash
cd client

# Build web version
npm run build

# Sync with Android
npx cap sync android
```

#### 5.2 Build APK

**Option A: Using Android Studio**
1. Open Android Studio
2. Open project: `client/android`
3. Build → Generate Signed Bundle / APK
4. Select APK
5. Use keystore: `client/android/app/presold-crm-key.jks`
6. Build release APK
7. Output: `client/android/app/build/outputs/apk/release/app-release.apk`

**Option B: Command Line**
```bash
cd client/android

# Build release APK
./gradlew assembleRelease

# Sign APK (if needed)
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore app/presold-crm-key.jks \
  app/build/outputs/apk/release/app-release-unsigned.apk \
  presold-crm-key
```

#### 5.3 Install on Devices

1. Copy APK to shared location
2. Install on team devices
3. Test complete training flow on mobile

---

## ✅ DEPLOYMENT CHECKLIST

### Backend
- [ ] Code pushed to GitHub repository
- [ ] Cloud Build completed successfully
- [ ] Cloud Run service deployed (asia-south1)
- [ ] Environment variables verified in Cloud Run
- [ ] Training endpoints responding (not HTML errors)
- [ ] Video streaming endpoint responding
- [ ] Health check endpoint returning 200

### Database
- [ ] MongoDB collections created (TrainingModule, TrainingQuestion, TrainingCompletion)
- [ ] GridFS configured for video storage
- [ ] Can connect via MongoDB Compass
- [ ] Prisma schema applied successfully

### Frontend
- [ ] Code built successfully (`npm run build`)
- [ ] Deployed to Vercel or hosting platform
- [ ] Production URL accessible: https://sales.homeintown.in
- [ ] Login page loads
- [ ] Dashboard loads after authentication
- [ ] Training section visible to admin
- [ ] My Training section visible to all users

### Training System
- [ ] Admin can create training modules
- [ ] Admin can upload videos (up to 500MB)
- [ ] Admin can add MCQ questions (Google Form style)
- [ ] Admin can schedule training (date + time)
- [ ] Admin can view user statistics
- [ ] Users see forced popup at scheduled time
- [ ] Users can watch video (seekable, pausable)
- [ ] Users must complete video before quiz
- [ ] Users see quiz one question at a time
- [ ] Users can submit quiz and see score
- [ ] Users can view Training Library
- [ ] Users can filter by All/Pending/Completed
- [ ] Completed trainings show score in library

### Mobile App
- [ ] Capacitor synced with web build
- [ ] APK built and signed
- [ ] APK installed on test devices
- [ ] Training popup works on mobile
- [ ] Video playback works on mobile
- [ ] Quiz functionality works on mobile
- [ ] Training Library accessible on mobile

---

## 🧪 TESTING SCENARIOS

### Scenario 1: Mandatory Training
1. Admin schedules training for 2:00 PM
2. User logs in at 2:05 PM
3. **Expected:** Popup appears immediately, cannot be skipped
4. User completes training
5. **Expected:** Popup doesn't appear again for that module

### Scenario 2: Video Streaming
1. User starts training with large video (100MB+)
2. **Expected:** Video starts playing within 5 seconds
3. User seeks forward in video
4. **Expected:** Seeking works smoothly
5. User pauses and resumes
6. **Expected:** Video state maintained

### Scenario 3: Quiz Scoring
1. User completes video
2. Quiz with 5 questions appears
3. User answers: Correct, Wrong, Correct, Correct, Wrong
4. **Expected:** Score shows "3 out of 5 (60%)"
5. Admin views stats
6. **Expected:** User's score visible in admin dashboard

### Scenario 4: Training Library
1. User has 3 completed trainings and 2 pending
2. User opens Training Library
3. **Expected:** Shows "Total: 5, Completed: 3"
4. User clicks "Completed" filter
5. **Expected:** Shows only 3 completed trainings with scores
6. User clicks on a completed training
7. **Expected:** Can rewatch video, no quiz

### Scenario 5: Future Training
1. Admin schedules training for tomorrow 10:00 AM
2. User checks Training Library today
3. **Expected:** Training shows with lock icon, cannot start
4. Tomorrow at 10:00 AM, user logs in
5. **Expected:** Popup appears for scheduled training

---

## 🔍 TROUBLESHOOTING

### Issue: Training endpoints return HTML errors

**Symptom:**
```html
<!DOCTYPE html>...Cannot GET /api/training/modules...
```

**Solution:**
1. Backend not deployed yet - wait for Cloud Build to complete
2. Check Cloud Run logs: `gcloud run services logs read presold-crm-server --region=asia-south1`
3. Verify routes are registered in `server/src/index.js`
4. Check if training routes file exists: `server/src/routes/training.js`

### Issue: Video upload fails

**Symptom:** "Failed to upload video" or "File too large"

**Solution:**
1. Verify file size is under 500MB
2. Check MongoDB connection: GridFS requires MongoDB connection
3. Verify DATABASE_URL environment variable
4. Check Cloud Run memory limits (should be at least 2GB)
5. Check backend logs for GridFS errors

### Issue: Training popup doesn't appear

**Symptom:** User logs in, but popup doesn't show

**Solution:**
1. Check if training is scheduled for current date/time
2. Verify user hasn't completed the training already
3. Check browser console for JavaScript errors
4. Verify API call to `/api/training/my-modules` is successful
5. Check if `TrainingPopup` component is imported in Dashboard

### Issue: Video won't play

**Symptom:** Video player shows loading spinner forever

**Solution:**
1. Check video file format (MP4 is best supported)
2. Verify video streaming endpoint: `/api/training/videos/:fileId`
3. Check GridFS file exists in database
4. Verify range request headers are supported
5. Test video URL directly in browser

### Issue: Quiz scores not saving

**Symptom:** User completes quiz, but score doesn't appear in admin dashboard

**Solution:**
1. Check API endpoint: `POST /api/training/modules/:id/submit-quiz`
2. Verify answers format is correct: `[0, 1, 2, 3]` (indices)
3. Check TrainingCompletion collection in database
4. Verify user ID and module ID are correct
5. Check backend logs for validation errors

### Issue: Training Library shows no modules

**Symptom:** Library page loads but no modules appear

**Solution:**
1. Verify training modules exist in database (TrainingModule collection)
2. Check API call to `/api/training/my-modules` in Network tab
3. Verify `isActive: true` on modules
4. Check if modules have valid scheduledDate
5. Verify user permissions

### Issue: Mobile app doesn't show training

**Symptom:** Training works on web, but not in mobile app

**Solution:**
1. Rebuild APK after web changes: `npx cap sync android`
2. Check if API_URL is correct in mobile environment
3. Verify network requests in Logcat
4. Check if video formats are mobile-compatible
5. Test in browser first, then mobile

---

## 📊 MONITORING

### Backend Metrics (Google Cloud Console)

Monitor these metrics for the training system:

1. **Request Count:**
   - Path: `/api/training/*`
   - Expected: Increase with user activity

2. **Response Times:**
   - Video streaming: < 2s for first byte
   - API endpoints: < 500ms average

3. **Error Rate:**
   - Target: < 1% error rate
   - Watch for 500 errors on video uploads

4. **Memory Usage:**
   - Watch during video uploads
   - Should stay under 80% of allocated memory

### Database Metrics (MongoDB Atlas)

1. **Collections Size:**
   - TrainingModule: grows with each training created
   - TrainingQuestion: ~5-10 per module
   - TrainingCompletion: grows with each user completion

2. **GridFS Storage:**
   - Monitor `uploads.files` and `uploads.chunks`
   - Large videos will consume significant space
   - Plan for ~100MB per training module average

### Frontend Metrics (Vercel)

1. **Page Load Times:**
   - Training page: < 2s
   - Training Library: < 1.5s

2. **Video Streaming:**
   - Initial buffering: < 5s
   - Seek time: < 2s

---

## 🔐 SECURITY NOTES

### Video Storage
- Videos stored in MongoDB GridFS (main DATABASE_URL)
- No public URL - videos served through authenticated endpoint
- Videos automatically deleted when training module deleted

### Authentication
- All training endpoints require JWT authentication
- Admin endpoints check role: `req.user.role === 'ADMIN'`
- User can only see their own completion records

### File Upload
- Max video size: 500MB (configured in multer)
- Allowed formats: video/* (MP4 recommended)
- Files validated before upload to GridFS

---

## 📱 MOBILE CONSIDERATIONS

### Video Format
- **Best:** MP4 with H.264 codec
- **Container:** MP4
- **Audio:** AAC
- **Resolution:** 720p or 1080p

### Storage
- Videos cached in app for offline viewing (future feature)
- Current: Requires internet connection for video streaming

### Performance
- Video streaming works on 4G/LTE
- Recommended: WiFi for initial training
- Seek functionality requires good connection

---

## 🎯 SUCCESS CRITERIA

Deployment is successful when:

1. ✅ Admin can create training modules with videos and MCQs
2. ✅ Videos upload successfully and play smoothly
3. ✅ Users see forced popup at scheduled time
4. ✅ Users can complete training flow without errors
5. ✅ Quiz scoring works correctly
6. ✅ Training Library displays all modules
7. ✅ Admin can view user statistics
8. ✅ Mobile app includes all training features
9. ✅ No HTML errors from API endpoints
10. ✅ System handles 50+ concurrent users

---

## 📞 SUPPORT

If you encounter issues during deployment:

1. **Check Logs:**
   - Backend: `gcloud run services logs read presold-crm-server --region=asia-south1 --limit=100`
   - Frontend: Vercel deployment logs
   - MongoDB: Atlas logs

2. **Test Endpoints:**
   - Use curl or Postman to test API endpoints
   - Verify authentication tokens are valid
   - Check request/response formats

3. **Database Inspection:**
   - Use MongoDB Compass to inspect collections
   - Check GridFS files in `uploads.files`
   - Verify schema matches Prisma models

---

## 🎉 NEXT STEPS

After successful deployment:

1. **Train Your Team:**
   - Create a demo training module
   - Walk team through complete flow
   - Document best practices for creating trainings

2. **Monitor Usage:**
   - Track how many trainings are completed
   - Monitor average scores
   - Gather feedback from users

3. **Optimize:**
   - Consider video compression for faster streaming
   - Add more question types (future enhancement)
   - Implement offline video caching (mobile)

4. **Scale:**
   - Monitor MongoDB storage growth
   - Upgrade Cloud Run resources if needed
   - Consider CDN for video delivery (future)

---

**Deployment Status:** Ready to Deploy ✅

**Last Updated:** 2026-10-27

**Version:** Training System v1.0
