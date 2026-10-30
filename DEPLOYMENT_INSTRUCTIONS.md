# 🚀 DEPLOYMENT INSTRUCTIONS - RESEARCH LEAD FIX

## ✅ What Was Fixed

1. **Added Research Lead Endpoint** (`/api/leads/research-data`)
2. **Added AI Vision Analysis** (`/api/leads/analyze-media`)
3. **Added Call Recordings Support**
4. **Fixed Camera Button** (moved to bottom-left, visible to all non-admin users)
5. **Enhanced Tasks Page** (pink highlighting for research leads)

## 📤 Code Push Status

✅ Code has been committed and pushed to GitHub:
- Commit: `d482060 - fix: add research lead endpoint, AI vision analysis, and call recordings`
- Branch: `master`
- Pushed to: `Home-In-Town/Presold-CRM-repository`

## 🔄 Deployment Options

### Option 1: Automatic Deployment (Recommended)

**Google Cloud Build** should automatically deploy within **5-10 minutes** after the push.

**Check deployment status:**
1. Go to: https://console.cloud.google.com/cloud-build/builds
2. Look for a build with commit SHA starting with `d482060`
3. Wait for it to complete (status should turn green)

### Option 2: Manual Deployment via Google Cloud Console

If automatic deployment doesn't trigger:

1. **Go to Cloud Build:**
   - Visit: https://console.cloud.google.com/cloud-build/triggers
   - Find your build trigger (should be watching `master` branch)
   - Click "RUN" to manually trigger

2. **Or deploy directly via Cloud Run:**
   ```bash
   # Make sure you're in the server directory
   cd server
   
   # Build and deploy to Cloud Run
   gcloud builds submit --config=cloudbuild.yaml
   ```

### Option 3: Manual Docker Build & Deploy

If you have gcloud CLI installed:

```bash
cd server

# Set your project ID
export PROJECT_ID=your-project-id

# Build the Docker image
gcloud builds submit --tag asia-south1-docker.pkg.dev/$PROJECT_ID/presold-crm/presold-crm-server:latest

# Deploy to Cloud Run
gcloud run deploy presold-crm-server \
  --image asia-south1-docker.pkg.dev/$PROJECT_ID/presold-crm/presold-crm-server:latest \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated
```

## 🧪 Verify Deployment

### Test 1: Check if endpoint exists (should NOT return HTML)

```bash
curl -X POST "https://presold-crm-server-624770114041.asia-south1.run.app/api/leads/research-data" \
  -H "Content-Type: application/json" \
  -d "{}"
```

**Expected Response (GOOD):**
```json
{"error": "Unauthorized"}
```

**Wrong Response (BAD - means not deployed yet):**
```html
<!DOCTYPE html>
<html>...Cannot POST /api/leads/research-data...</html>
```

### Test 2: Check from mobile app

1. Install `PreSold-CRM-WORKING-v11.apk`
2. Try adding a research lead
3. Should work without "Failed to add research data lead" error

## 📱 Mobile App Installation

The v11 APK is already built and ready:
- **Location:** `client/PreSold-CRM-WORKING-v11.apk`
- **Size:** 7.29 MB
- **Includes:**
  - Camera button at bottom-left
  - Camera visible to all non-admin users
  - Fixed research lead form
  - Pink highlighting for research leads in Tasks

**Install:**
1. Copy `PreSold-CRM-WORKING-v11.apk` to your phone
2. Install the APK
3. Open the app and test

## ⏱️ Expected Timeline

- **Code Push:** ✅ COMPLETED
- **Cloud Build Trigger:** 5-10 minutes (automatic)
- **Deployment to Cloud Run:** 2-3 minutes
- **Total:** ~10-15 minutes from push

## 🔍 Troubleshooting

### Issue: Deployment not starting after 15 minutes

**Solution:**
1. Check Cloud Build triggers: https://console.cloud.google.com/cloud-build/triggers
2. Manually trigger the build
3. Or use manual deployment command (Option 3 above)

### Issue: Deployment fails during build

**Solution:**
1. Check Cloud Build logs: https://console.cloud.google.com/cloud-build/builds
2. Look for error messages in the build output
3. Common issues:
   - Missing environment variables
   - Prisma generation errors
   - Docker build failures

### Issue: Mobile app still shows old error

**Solutions:**
1. **Force close** the mobile app completely
2. **Clear app cache** (Android Settings > Apps > PreSold CRM > Storage > Clear Cache)
3. **Reinstall** the v11 APK
4. Check if deployment completed successfully (Test 1 above)

## 📋 Checklist

- [ ] Code pushed to GitHub (✅ DONE)
- [ ] Wait 10-15 minutes for automatic deployment
- [ ] Run Test 1 to verify endpoint exists
- [ ] Install v11 APK on phone
- [ ] Test research lead creation from mobile app
- [ ] Verify camera button is visible at bottom-left
- [ ] Check that research leads show with pink highlighting in Tasks

## 🆘 Need Help?

If deployment issues persist:
1. Share Cloud Build logs
2. Share error messages from Cloud Run logs
3. Confirm your Google Cloud project ID
4. Check if billing is enabled on GCP

---

**Current Status:** Code pushed ✅ | Waiting for deployment ⏳

**Next Step:** Wait 10-15 minutes, then run Test 1 to verify deployment
