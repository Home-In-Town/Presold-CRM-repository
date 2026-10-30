# PreSold CRM - Android APK Build Guide

## 📱 Overview
This guide explains how to build an Android APK from the PreSold CRM web application using Capacitor.

## 🛠️ Prerequisites

### Required Software:
1. **Android Studio** (Latest Version)
   - Download: https://developer.android.com/studio
   - Install with Android SDK, Platform Tools, and Build Tools

2. **Java Development Kit (JDK) 17**
   - Download: https://adoptium.net/
   - Set JAVA_HOME environment variable

3. **Node.js** (v18 or higher)
   - Already installed ✅

4. **Gradle** (Included with Android Studio)

### Environment Variables:
Set these in your system:
```
JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.x.x
ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk
```

Add to PATH:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
```

## 📦 Project Setup (Already Done)

The project has been configured with:
- ✅ Capacitor Android platform added
- ✅ Native plugins installed (Geolocation, Camera, Filesystem)
- ✅ Android permissions configured
- ✅ App ID: `in.homeintown.sales`
- ✅ App Name: `PreSold CRM`

## 🚀 Building the APK

### Step 1: Build the Web App
```bash
cd client
npm run build
```

### Step 2: Sync with Capacitor
```bash
npx cap sync android
```

### Step 3: Open in Android Studio
```bash
npx cap open android
```

This will open Android Studio with the Android project.

### Step 4: Build APK in Android Studio

#### Option A: Debug APK (Quick Testing)
1. In Android Studio, go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. Wait for the build to complete
3. Find the APK at: `android/app/build/outputs/apk/debug/app-debug.apk`

#### Option B: Release APK (Production)
1. Go to **Build > Generate Signed Bundle / APK**
2. Select **APK** and click **Next**
3. Create a new keystore or use an existing one:
   - **Keystore path**: Choose a location (e.g., `presold-crm-key.jks`)
   - **Password**: Create a strong password
   - **Alias**: `presold-crm`
   - **Validity**: 25 years (minimum)
4. Click **Next**, select **release**, and click **Finish**
5. APK will be at: `android/app/release/app-release.apk`

### Step 5: Using Command Line (Alternative)

#### Debug APK:
```bash
cd client/android
./gradlew assembleDebug
```
Output: `app/build/outputs/apk/debug/app-debug.apk`

#### Release APK (Unsigned):
```bash
cd client/android
./gradlew assembleRelease
```
Output: `app/build/outputs/apk/release/app-release-unsigned.apk`

## 🔑 Signing the APK (For Production)

### Create Keystore:
```bash
keytool -genkey -v -keystore presold-crm-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias presold-crm
```

### Sign APK:
```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore presold-crm-key.jks app-release-unsigned.apk presold-crm
```

### Optimize with zipalign:
```bash
zipalign -v 4 app-release-unsigned.apk presold-crm-release.apk
```

## 📲 Installing the APK

### On Physical Device:
1. Enable **Developer Options** and **USB Debugging**
2. Connect device via USB
3. Run: `adb install app-debug.apk`

### Manual Installation:
1. Transfer APK to device
2. Open file manager and tap the APK
3. Allow installation from unknown sources if prompted

## 🐛 Troubleshooting

### Build Fails with Gradle Error:
```bash
cd client/android
./gradlew clean
./gradlew build --stacktrace
```

### Android SDK Not Found:
- Install Android SDK via Android Studio
- Set ANDROID_HOME environment variable
- Restart terminal/IDE

### JAVA_HOME Issues:
```bash
# Check Java version
java -version

# Set JAVA_HOME (Windows)
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-17.x.x"
```

### App Crashes on Launch:
- Check Android logs: `adb logcat`
- Ensure web build is up to date: `npm run build`
- Sync Capacitor: `npx cap sync android`

## 📱 Features Included

### ✅ Working Features:
- Login/Authentication
- Dashboard with stats
- Leads management
- Pipeline view
- Projects tracking
- Meetings management
- Team collaboration
- Reports and analytics
- Location tracking (GPS)
- File uploads (Camera & Gallery)
- Attendance check-in/out
- Admin location monitor
- Google Maps integration
- Mobile shortcuts

### 🔧 Native Plugins:
- `@capacitor/geolocation` - GPS tracking
- `@capacitor/camera` - Photo capture
- `@capacitor/filesystem` - File storage
- `@capacitor/network` - Network status
- `@capacitor/app` - App lifecycle
- `@capacitor/status-bar` - Status bar styling

## 🎨 Customization

### Change App Icon:
1. Create icon images (512x512, 192x192, etc.)
2. Replace files in `android/app/src/main/res/mipmap-*/ic_launcher.png`
3. Use Android Studio's Image Asset Studio: **Right-click res > New > Image Asset**

### Change App Name:
Edit `android/app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">Your App Name</string>
```

### Change Package Name:
1. Update `capacitor.config.ts`: `appId`
2. Update `android/app/build.gradle`: `applicationId`
3. Rename package folders in `android/app/src/main/java/`
4. Update `AndroidManifest.xml` package references

## 🚢 Publishing to Google Play Store

1. Build signed release APK (see above)
2. Create Google Play Console account ($25 one-time fee)
3. Create new app listing
4. Upload APK/AAB
5. Complete store listing with screenshots, description
6. Submit for review

### Build AAB (Preferred for Play Store):
```bash
cd client/android
./gradlew bundleRelease
```
Output: `app/build/outputs/bundle/release/app-release.aab`

## 📊 Version Updates

Before each release:

1. Update `versionCode` and `versionName` in `android/app/build.gradle`:
```gradle
defaultConfig {
    versionCode 2  // Increment by 1
    versionName "1.1"  // Update version
}
```

2. Rebuild web app and sync:
```bash
npm run build
npx cap sync android
```

3. Build new APK/AAB

## 🔗 Useful Commands

```bash
# Check Capacitor configuration
npx cap doctor

# List installed plugins
npx cap ls

# Update Capacitor
npm install @capacitor/core@latest @capacitor/cli@latest
npm install @capacitor/android@latest

# Run on emulator
npx cap run android

# View device logs
adb logcat | grep -i "capacitor"
```

## 📞 Support

For issues:
- Check Capacitor docs: https://capacitorjs.com/docs
- Android docs: https://developer.android.com
- Capacitor GitHub: https://github.com/ionic-team/capacitor

## ✨ Quick Start Summary

```bash
# 1. Build web app
cd client
npm run build

# 2. Sync with Android
npx cap sync android

# 3. Open Android Studio
npx cap open android

# 4. Build APK in Android Studio
# Build > Build Bundle(s) / APK(s) > Build APK(s)

# 5. APK Location
# android/app/build/outputs/apk/debug/app-debug.apk
```

---

**🎉 Your PreSold CRM Android app is ready to build!**
