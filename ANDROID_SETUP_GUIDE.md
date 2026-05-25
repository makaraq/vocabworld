# 🤖 Android Development Guide for Sprind Language Learning App

## ✅ Setup Complete!

Your Android project has been successfully created and configured. Here's what was done:

### 📁 Project Structure Created
- `android/` folder with complete Android Studio project
- App ID: `com.sprind.app`
- App Name: `Sprind`
- Build system: Gradle with Capacitor integration

## 🚀 Testing in Android Studio

### 1. **Open the Project**
The command `npx cap open android` should have opened Android Studio. If not:
1. Open Android Studio
2. Select "Open an existing Android Studio project"
3. Navigate to: `d:\New folder (4)\android`
4. Click "OK"

### 2. **Initial Setup in Android Studio**
1. **Gradle Sync**: Android Studio will automatically sync Gradle files
2. **SDK Setup**: Ensure you have the required Android SDK installed
3. **Device/Emulator**: Set up an Android Virtual Device (AVD) or connect a physical device

### 3. **Build and Run**
1. Click the "Build" menu → "Make Project" (or Ctrl+F9)
2. Click the "Run" button (green triangle) or press Shift+F10
3. Select your target device/emulator

## 📱 Development Workflow

### **Making Changes to Your App**
When you modify your web code, follow this workflow:

```powershell
# 1. Build the web app
npm run build

# 2. Copy changes to Android
npx cap copy android

# 3. Sync plugins (if needed)
npx cap sync android

# 4. Open in Android Studio (if not already open)
npx cap open android
```

### **Live Reload for Faster Development**
For faster development, you can use live reload:

```powershell
# Start the development server
npm run dev

# In another terminal, run the app with live reload
npx cap run android --livereload --external
```

## 🔧 Android-Specific Configurations

### **Permissions for Your Language Learning App**
Your app may need additional permissions. Add these to `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- For audio recording/playback -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

<!-- For network access (API calls) -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- For offline storage -->
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

<!-- For notifications -->
<uses-permission android:name="android.permission.VIBRATE" />
```

### **App Icon Setup**
Replace the default icons in:
- `android/app/src/main/res/mipmap-*/ic_launcher.png`
- `android/app/src/main/res/mipmap-*/ic_launcher_round.png`

### **Splash Screen**
Customize your splash screen in:
- `android/app/src/main/res/drawable/splash.xml`

## 🎵 Audio Service Configuration

Since your app uses multiple audio services, ensure these are properly configured:

### **Network Security Config**
Create `android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
    </domain-config>
</network-security-config>
```

Add to AndroidManifest.xml in `<application>` tag:
```xml
android:networkSecurityConfig="@xml/network_security_config"
```

## 🔍 Debugging

### **Chrome DevTools**
Debug your web content:
1. Connect your Android device via USB
2. Enable USB Debugging on your device
3. Open Chrome and go to `chrome://inspect`
4. Select your app's WebView

### **Android Studio Logcat**
View native Android logs:
1. Open Android Studio
2. Go to View → Tool Windows → Logcat
3. Filter by your app package: `com.sprind.app`

### **Capacitor Logs**
```powershell
npx cap run android --livereload --external
```

## 📦 Building for Release

### **Debug APK**
```powershell
cd android
./gradlew assembleDebug
```

### **Release APK** (for testing)
```powershell
cd android
./gradlew assembleRelease
```

## 🚨 Common Issues & Solutions

### **Issue: Gradle Build Fails**
- Ensure you have the correct Java version (Java 11 or 17)
- Check Android SDK is properly installed
- Run `./gradlew clean` in the android folder

### **Issue: App Crashes on Startup**
- Check Logcat for error messages
- Ensure all required permissions are added
- Verify network connectivity for API calls

### **Issue: Audio Not Working**
- Check audio permissions are granted
- Test in both emulator and real device
- Verify network access for cloud TTS services

### **Issue: White Screen**
- Check if the web build is successful (`npm run build`)
- Verify assets are copied (`npx cap copy android`)
- Check for JavaScript errors in Chrome DevTools

## 📋 Pre-Testing Checklist

Before testing your app:

- [ ] Latest web build completed (`npm run build`)
- [ ] Assets copied to Android (`npx cap copy android`)
- [ ] Android Studio project opens without errors
- [ ] Required permissions added to AndroidManifest.xml
- [ ] Audio services configured for Android
- [ ] Test device/emulator ready
- [ ] Network connectivity available for API calls

## 🎯 Testing Your Language Learning Features

### **Core Features to Test**
1. **Language Selection**: Test switching between different languages
2. **Vocabulary Loading**: Verify topics and words load correctly
3. **Audio Playback**: Test all TTS services (Alnilam, Algenib, Azure, Browser)
4. **Offline Mode**: Test vocabulary access without internet
5. **Progress Tracking**: Verify learning progress is saved
6. **Subscription**: Test payment flows (use Stripe test mode)
7. **PWA Features**: Test app installation and offline capabilities

### **Android-Specific Testing**
1. **Device Rotation**: Test portrait/landscape modes
2. **Background/Foreground**: Test app resuming from background
3. **Hardware Back Button**: Ensure proper navigation
4. **System Audio**: Test with system volume controls
5. **Notifications**: Test learning reminders (if implemented)

## 🔗 Useful Commands Reference

```powershell
# Development
npm run dev                          # Start development server
npm run build                        # Build production app
npx cap copy android                 # Copy web assets to Android
npx cap sync android                 # Sync plugins and dependencies
npx cap open android                 # Open in Android Studio
npx cap run android                  # Build and run on device/emulator

# Live reload development
npx cap run android --livereload --external

# Building
cd android && ./gradlew assembleDebug    # Build debug APK
cd android && ./gradlew assembleRelease  # Build release APK

# Debugging
npx cap doctor                       # Check Capacitor setup
adb logcat                          # View device logs
```

Your Sprind language learning app is now ready for Android testing! 🎉