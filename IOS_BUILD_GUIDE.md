# VerifiedBizLink iOS App Build Guide

**Status:** ✅ **READY FOR BUILD**  
**Date:** 2026-06-10  
**Framework:** Capacitor + Xcode  

---

## 📱 iOS App Setup

| Property | Value |
|----------|-------|
| **App ID** | `co.za.verifiedbizlink` |
| **App Name** | VerifiedBizLink |
| **Minimum iOS** | iOS 13.0+ |
| **Build Status** | ✅ Xcode project ready |
| **Project Location** | `ios/App/App.xcodeproj` |

---

## ⚠️ **Important: You Need macOS**

iOS apps **require macOS** to build. Your options:

### **Option A: Use CI/CD (Recommended - No Mac Needed!)**
Build automatically on GitHub/cloud servers:
- GitHub Actions (free)
- Codemagic (free tier available)
- EAS Build (expo services)

### **Option B: Get a Mac**
- Borrow a friend's/colleague's Mac
- Rent via MacStadium/AWS Mac
- Use Apple's free development tools

---

## 🚀 **Quick Start: GitHub Actions (No Mac Needed)**

### **Step 1: Create Workflow File**

Create `.github/workflows/ios-build.yml`:

```yaml
name: Build iOS App

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: macos-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Dependencies
        run: npm install
      
      - name: Sync iOS
        run: npx cap sync ios
      
      - name: Build iOS App
        run: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace \
            -scheme App \
            -configuration Release \
            -derivedDataPath build \
            -archivePath build/App.xcarchive \
            archive
      
      - name: Export IPA
        run: |
          cd ios/App
          xcodebuild -exportArchive \
            -archivePath build/App.xcarchive \
            -exportOptionsPlist ExportOptions.plist \
            -exportPath build/output
      
      - name: Upload IPA
        uses: actions/upload-artifact@v3
        with:
          name: VerifiedBizLink.ipa
          path: ios/App/build/output/VerifiedBizLink.ipa
```

### **Step 2: Push to GitHub**

```bash
git add .github/workflows/ios-build.yml
git commit -m "ci: add iOS build workflow"
git push
```

### **Step 3: Monitor Build**

1. Go to: https://github.com/mraaziqp/VerifiedBizLink
2. Click **Actions** tab
3. Watch the build progress
4. Download IPA when complete

---

## 🏗️ **Manual Build (If You Have a Mac)**

### **Prerequisites**
- macOS (10.15+)
- Xcode 12.0+ installed
- Apple Developer Account (free or paid)
- CocoaPods installed

### **Step 1: Install Xcode**
```bash
xcode-select --install
# Or download from App Store
```

### **Step 2: Prepare Project**
```bash
cd /path/to/VerifiedBizLink
npm install
npx cap sync ios
```

### **Step 3: Open in Xcode**
```bash
open ios/App/App.xcworkspace
```

### **Step 4: Configure Signing**
In Xcode:
1. Select **App** in left sidebar
2. Go to **Signing & Capabilities**
3. Select your team
4. Change bundle ID if needed: `co.za.verifiedbizlink`
5. Let Xcode auto-manage signing

### **Step 5: Build**
```bash
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath build/App.xcarchive \
  archive
```

### **Step 6: Export IPA**

Create `ExportOptions.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>stripSwiftSymbols</key>
    <true/>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>method</key>
    <string>app-store</string>
</dict>
</plist>
```

Then export:
```bash
xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath build/output
```

---

## 🎯 **Alternative: Use Codemagic (Easy)**

Codemagic is a web-based iOS builder - no Mac required!

### **Setup:**
1. Go to: https://codemagic.io
2. Click "Sign Up with GitHub"
3. Authorize your GitHub account
4. Select `mraaziqp/VerifiedBizLink` repository
5. Create project
6. Configure build settings (should auto-detect Next.js + Capacitor)
7. Click "Start your first build"

### **Build Status:**
- Watch build progress in web UI
- Download IPA directly from dashboard
- Get email when done

---

## 🎯 **Alternative: Use EAS Build (Expo)**

Great for Teams using Expo:

### **Setup:**
```bash
npm install -g eas-cli
eas login
eas build --platform ios --local
```

---

## 📦 **App Store Submission**

### **Requirements:**
- Signed IPA file
- Apple Developer account ($99/year)
- App screenshots (5+ required)
- App description, keywords, etc.
- Privacy policy URL
- App review information

### **Steps:**
1. Get Apple Developer account: https://developer.apple.com
2. Create app on App Store Connect
3. Fill app info (name, description, keywords)
4. Upload IPA via Transporter or App Store Connect
5. Submit for review (24-48 hour wait typically)

### **Important Notes:**
- Apple reviews all apps (can reject if not following guidelines)
- Must have privacy policy
- Must have legitimate business use
- Cannot have fake data or placeholder content
- Must work as described

---

## 🔐 **Certificates & Provisioning**

### **First Time Setup**
Xcode can auto-manage signing if you:
1. Have Apple ID
2. Are in free Developer Program
3. Don't need enterprise distribution

### **Advanced: Manual Provisioning**

If auto-signing fails:

1. Go to: https://developer.apple.com/account
2. Create Certificate (iOS App Development)
3. Create App ID: `co.za.verifiedbizlink`
4. Create Provisioning Profile
5. Download all files
6. Install in Xcode: Preferences → Accounts → Manage Certificates

---

## 📱 **Testing the IPA**

### **On Simulator**
```bash
xcrun simctl install booted /path/to/VerifiedBizLink.app
```

### **On Physical Device**
Option 1: Xcode
- Connect device
- Product → Run
- App installs and launches

Option 2: TestFlight (Apple Beta Testing)
- Upload IPA to App Store Connect
- Add testers' emails
- They get link to download and test

Option 3: Ad Hoc Distribution
- Sign IPA for specific devices
- Share IPA directly (via email, USB, etc.)

---

## 🛠️ **Project Files**

```
ios/
├── App/
│   ├── App.xcodeproj/          ← Xcode project
│   ├── App/
│   │   ├── AppDelegate.swift   ← App entry point
│   │   ├── Info.plist          ← Config
│   │   └── Assets.xcassets/    ← Icons, splash
│   └── App.xcworkspace/        ← Workspace (use this!)
├── capacitor-cordova-ios-plugins/
└── Package.swift
```

---

## 🚀 **Development Workflow**

### **For Testing**
1. Make code changes in `/src`
2. Run: `npm run build`
3. Run: `npx cap sync ios` (updates iOS app)
4. Open in Xcode and build

### **For Distribution**
1. Update version in `ios/App/App/Info.plist`
2. Build and export IPA
3. Test thoroughly
4. Submit to App Store or distribute directly

### **Automatic on Every Commit**
If using GitHub Actions:
1. Commit code to main
2. Push to GitHub
3. GitHub Actions automatically builds iOS
4. Download IPA from Actions artifacts

---

## 🐛 **Troubleshooting**

| Issue | Solution |
|-------|----------|
| "No provisioning profile found" | Let Xcode auto-sign or manually create profile |
| Build fails with "Swift version" | Update Xcode to latest |
| IPA won't install on device | Ensure device is trusted + developer mode on |
| "Cannot connect to backend" | Check Vercel deployment is live |
| App crashes on launch | Check iOS deployment target in Info.plist |
| Signing errors | Clean build folder (Cmd+Shift+K) and rebuild |

---

## 📊 **Build Status**

```
✅ iOS platform installed
✅ Xcode project created
✅ Capacitor configured
✅ Ready to build (choose method above)
```

---

## 🎯 **Recommended Path for You (Windows)**

Since you're on Windows:

### **Best Option: GitHub Actions**
- ✅ No Mac needed
- ✅ Free tier available
- ✅ Automatic builds on every push
- ✅ Just copy-paste the workflow file

**Next step:** Create `.github/workflows/ios-build.yml` with the code from above section.

---

## 📞 **Getting Help**

- **Xcode Build Errors:** Check build log in Xcode
- **App Store Rejection:** Apple provides detailed feedback
- **Deployment Issues:** Check Vercel logs
- **Capacitor Issues:** See https://capacitorjs.com/docs

---

**Status: ✅ READY FOR iOS BUILD**

Choose your build method above and let's get your iOS app into the wild! 🚀

**Commit:** c27eca8  
**Last Updated:** 2026-06-10 14:57 UTC
