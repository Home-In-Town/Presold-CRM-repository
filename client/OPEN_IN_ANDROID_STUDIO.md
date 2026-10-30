# 🚀 Open PreSold CRM in Android Studio and Run on Your Phone

## ✅ Prerequisites Checked:
- Android Studio installed ✅
- Phone connected via USB ✅
- Project configured ✅

---

## 📋 Step-by-Step Instructions

### Step 1: Open Android Studio

1. Launch **Android Studio**
2. Click **"Open"** (or File → Open)
3. Navigate to and select this folder:
   ```
   C:\Users\HP\Desktop\Presold-CRM-repository-main\client\android
   ```
4. Click **"OK"**

### Step 2: Wait for Gradle Sync

When the project opens, Android Studio will automatically:
- Sync Gradle (this takes 2-5 minutes first time)
- Download dependencies
- Index the project

**✅ Wait for the progress bar at the bottom to finish!**

You'll see messages like:
- "Syncing gradle..."
- "Building gradle project info..."
- When done: "Gradle sync completed successfully"

### Step 3: Configure Android Studio to Use Its Own JDK

**Important:** Android Studio has its own JDK built-in. Let's use it:

1. Click **File → Project Structure** (or press `Ctrl+Alt+Shift+S`)
2. In **SDK Location** tab:
   - Look for "JDK location"
   - It should show Android Studio's embedded JDK
   - If not, click **"Download JDK"** and select version **17**
3. Click **"Apply"** then **"OK"**
4. Let Gradle sync again

### Step 4: Enable Your Phone for Development

On your Android phone:

1. Go to **Settings → About Phone**
2. Tap **"Build Number"** 7 times (enables Developer Options)
3. Go back to **Settings → Developer Options**
4. Enable **"USB Debugging"**
5. Connect phone to computer via USB
6. **Unlock your phone** and tap **"Allow"** when prompt appears

### Step 5: Select Your Device in Android Studio

In Android Studio toolbar (top):
1. Look for device dropdown (next to the green play button ▶️)
2. Click it - you should see your phone's name
3. Select your phone
4. If you don't see it:
   - Check USB connection
   - Try a different USB cable
   - Re-enable USB debugging on phone
   - Click the dropdown again

### Step 6: Run the App on Your Phone!

**Option A: Use Run Button (Recommended)**
1. Click the green **▶️ Play button** in the toolbar
2. Or press **Shift+F10**
3. Android Studio will:
   - Build the APK
   - Install it on your phone
   - Launch the app automatically

**Option B: Build APK and Install Manually**
1. Click **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Wait for build to complete
3. Click **"locate"** in the notification
4. Copy `app-debug.apk` to your phone
5. Open it on phone and install

---

## ⏱️ What to Expect

### First Build:
- **Time:** 5-10 minutes
- **Size:** ~15-20 MB APK
- **Activities:**
  - Gradle downloads dependencies
  - Compiles code
  - Packages APK
  - Installs on phone

### Subsequent Builds:
- **Time:** 30 seconds - 2 minutes
- Much faster (incremental builds)

---

## 🖥️ Android Studio Interface Guide

```
┌─────────────────────────────────────────────────┐
│  File  Edit  View  Navigate  Code  Build  Run  │
├─────────────────────────────────────────────────┤
│  Device: [Your Phone] │ ▶️ Run │ 🔧 │ 🐛 │      │ ← Toolbar
├─────────────────────────────────────────────────┤
│  Project Files       │    Code Editor            │
│  ├─ app              │                           │
│  │  ├─ manifests    │    Your Code Here         │
│  │  ├─ java         │                           │
│  │  └─ res          │                           │
│  └─ Gradle Scripts  │                           │
├─────────────────────┴───────────────────────────┤
│  Build Output / Run / Logcat                    │ ← Bottom panel
└─────────────────────────────────────────────────┘
```

**Key Areas:**
- **Top toolbar:** Run button (▶️) and device selector
- **Bottom panel:** Build progress and logs
- **Left sidebar:** Project files
- **Status bar (bottom):** Shows Gradle sync progress

---

## 🐛 Troubleshooting

### Issue 1: "Gradle sync failed" or Java version error

**Solution:**
1. File → Project Structure
2. Change JDK to Android Studio's embedded JDK (usually JDK 17)
3. Click Apply → OK
4. File → Invalidate Caches → Invalidate and Restart

### Issue 2: Device not showing in dropdown

**Solution:**
1. Unplug and replug USB cable
2. On phone: Settings → Developer Options
   - Turn OFF and ON USB Debugging
   - Select "File Transfer" mode (not just charging)
3. Android Studio → Tools → Troubleshoot Device Connections
4. Check cable - try a data cable (not charge-only)

### Issue 3: "Installation failed" error

**Solution:**
1. On phone: Uninstall existing app if any
2. Settings → Apps → PreSold CRM → Uninstall
3. Try running again from Android Studio

### Issue 4: Build fails with errors

**Solution:**
```powershell
# Clean and rebuild from command line
cd C:\Users\HP\Desktop\Presold-CRM-repository-main\client\android
.\gradlew clean
```
Then in Android Studio: Build → Rebuild Project

### Issue 5: Phone shows "Allow USB debugging?" but you can't see it

**Solution:**
- Unlock your phone completely
- The dialog is on the phone screen
- Tap "Always allow from this computer" ☑️
- Tap "OK"

---

## 📱 After Successful Installation

The app will:
1. ✅ Install on your phone
2. ✅ Launch automatically
3. ✅ Show the login screen

**Test these features:**
- Login with your credentials
- Navigate through pages
- Check location access (may prompt for permissions)
- Try camera/file upload
- Test all CRM features

---

## 🔧 Build Variants

Android Studio can build different versions:

**In Build Variants panel (left side):**
- **debug** - For development (default)
  - Includes debugging tools
  - Larger file size
  - Use this for testing

- **release** - For production
  - Optimized and compressed
  - Requires signing key
  - Smaller file size

**To switch:** View → Tool Windows → Build Variants

---

## 📦 Finding Your APK

After building:

### Debug APK:
```
client\android\app\build\outputs\apk\debug\app-debug.apk
```

### From Android Studio:
1. After build completes, notification shows
2. Click **"locate"** in notification
3. Or: Navigate manually to folder above

---

## 🎯 Quick Checklist

Before running:
- [ ] Android Studio opened
- [ ] Project folder: `client\android` opened
- [ ] Gradle sync completed (check bottom status bar)
- [ ] Phone connected via USB
- [ ] USB Debugging enabled on phone
- [ ] Device appears in dropdown
- [ ] Phone is unlocked

To run:
- [ ] Click green ▶️ Play button
- [ ] Wait for build (5-10 min first time)
- [ ] Accept permissions on phone if prompted
- [ ] App installs and launches!

---

## 💡 Pro Tips

1. **Keep phone unlocked** during installation
2. **Use "File Transfer" mode** on USB connection
3. **First build takes longest** - be patient!
4. **Check bottom panel** for build progress
5. **Enable "Always allow USB debugging"** from this computer

---

## 🚀 Ready to Go!

Your project is **100% configured and ready**. Just:

1. Open Android Studio
2. Open `client\android` folder
3. Wait for Gradle sync
4. Select your phone
5. Click ▶️ Run
6. **Done!** 🎉

---

## 📞 If You Get Stuck

Common fixes:
1. **File → Invalidate Caches → Invalidate and Restart**
2. **Unplug/replug phone**
3. **Check Build panel** at bottom for errors
4. **Clean project:** Build → Clean Project
5. **Rebuild:** Build → Rebuild Project

---

**Your app package:** `in.homeintown.sales`  
**Your app name:** PreSold CRM  
**Android folder:** `C:\Users\HP\Desktop\Presold-CRM-repository-main\client\android`  

**Ready to launch!** 🚀📱
