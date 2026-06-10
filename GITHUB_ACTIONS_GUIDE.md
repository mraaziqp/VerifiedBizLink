# GitHub Actions Build Guide

**Status:** ✅ **AUTOMATED BUILDS CONFIGURED**  
**iOS:** Builds on macOS via GitHub Actions  
**Android:** Builds on Ubuntu via GitHub Actions  

---

## 🚀 Quick Start

### **How It Works**

Every time you push code to the `main` branch:

1. ✅ GitHub detects the push
2. ✅ Automatically triggers build workflows
3. ✅ iOS builds on macOS runner (macOS-latest)
4. ✅ Android builds on Ubuntu runner (ubuntu-latest)
5. ✅ APK/IPA files uploaded as artifacts
6. ✅ Release created with download links

---

## 📱 iOS Build Workflow

**File:** `.github/workflows/ios-build.yml`

### **What It Does**
```
1. Checks out your code
2. Installs Node.js 18
3. Sets up latest Xcode
4. Installs npm dependencies
5. Builds Next.js app
6. Syncs iOS platform
7. Installs CocoaPods
8. Builds Xcode archive
9. Exports IPA file
10. Uploads IPA to artifacts
11. Creates GitHub release
```

### **How to Trigger**
```
Option 1: Push to main
git commit -m "your changes"
git push origin main
→ Automatically triggers iOS build

Option 2: Manual trigger
1. Go to GitHub Actions tab
2. Select "Build iOS App (IPA)"
3. Click "Run workflow"
4. Select main branch
5. Click green "Run workflow" button

Option 3: Pull Request
Create a PR to main
→ Automatically builds iOS to check for errors
```

### **Where to Get IPA**
```
After build completes:
1. Go to: github.com/mraaziqp/VerifiedBizLink/actions
2. Click latest "Build iOS App" run
3. Scroll to "Artifacts" section
4. Download "VerifiedBizLink-iOS"
5. Inside: VerifiedBizLink.ipa or App.ipa
```

### **Install IPA on Device**
```
Option 1: Transporter (Mac)
1. Download Transporter from App Store
2. Open, sign in with Apple ID
3. Drag IPA to Transporter
4. Click "Deliver"

Option 2: TestFlight (Beta)
1. Upload IPA to App Store Connect
2. Add testers' emails
3. They get TestFlight link
4. They download and test

Option 3: Xcode (Direct)
1. Connect iPhone via USB
2. Open Xcode
3. Devices and Simulators
4. Drag IPA to device

Option 4: Direct install (Jailbroken only)
Use Cydia Impactor or similar tools
```

---

## 🤖 Android Build Workflow

**File:** `.github/workflows/android-build.yml`

### **What It Does**
```
1. Checks out your code
2. Installs Node.js 18
3. Sets up Java 17 (Temurin)
4. Installs npm dependencies
5. Builds Next.js app
6. Syncs Android platform
7. Makes Gradle executable
8. Builds Debug APK
9. Builds Release APK (unsigned)
10. Uploads both APKs
11. Creates GitHub release
```

### **How to Trigger**
```
Option 1: Push to main
git commit -m "your changes"
git push origin main
→ Automatically triggers Android build

Option 2: Manual trigger
1. Go to GitHub Actions tab
2. Select "Build Android App (APK)"
3. Click "Run workflow"
4. Select main branch
5. Click green "Run workflow" button

Option 3: Pull Request
Create a PR to main
→ Automatically builds Android to check for errors
```

### **Where to Get APK**
```
After build completes:
1. Go to: github.com/mraaziqp/VerifiedBizLink/actions
2. Click latest "Build Android App" run
3. Scroll to "Artifacts" section
4. Download one of:
   - VerifiedBizLink-Debug-APK (for testing)
   - VerifiedBizLink-Release-APK (for production)
```

### **Install APK on Device**
```
Option 1: ADB (Android Debug Bridge)
adb install -r VerifiedBizLink-Release-APK/app-release-unsigned.apk

Option 2: Manual
1. Enable "Unknown Sources" in Android Settings
2. Transfer APK to phone via USB
3. Use file manager to navigate to APK
4. Tap to install
5. Follow prompts

Option 3: Android Studio
1. Open Android Studio
2. Tools → Device Manager
3. Launch emulator
4. Drag APK to emulator window
5. App installs automatically
```

---

## 📊 Build Status & Monitoring

### **View Build Progress**
```
1. Go to: github.com/mraaziqp/VerifiedBizLink
2. Click "Actions" tab
3. See all workflow runs
4. Click a run to see details
5. Watch build progress in real-time
```

### **Check Build Logs**
```
If build fails:
1. Click the failed workflow
2. Scroll down to see which step failed
3. Expand that step to see error details
4. Fix the issue locally
5. Push again to retry
```

### **Receive Notifications**
```
GitHub will notify you:
- When build starts
- When build completes
- If build fails
- You can customize notification settings
```

---

## 🔄 Automated Build Triggers

### **What Triggers Builds**

| Event | iOS | Android | Notes |
|-------|-----|---------|-------|
| Push to main | ✅ Yes | ✅ Yes | Every commit rebuilds |
| Pull Request | ✅ Yes | ✅ Yes | Verify before merge |
| Manual trigger | ✅ Yes | ✅ Yes | Actions → Run workflow |
| Schedule | ❌ No | ❌ No | Can be added |

---

## 📦 Artifacts & Releases

### **Artifacts**
```
Each build creates artifacts that live for 30 days:
- iOS: VerifiedBizLink.ipa (stored separately)
- Android: app-debug.apk + app-release-unsigned.apk

Download from GitHub Actions tab
```

### **Releases**
```
Each successful main branch push creates a GitHub Release:
- Tag: ios-build-123 or android-build-123
- Name: iOS Build 123 or Android Build 123
- Description: Build details, features, install instructions
- Downloadable: APK/IPA attached to release

View all releases at: github.com/mraaziqp/VerifiedBizLink/releases
```

---

## 🔐 Security & Signing

### **Current Setup (Unsigned)**
```
✅ Builds are unsigned (development/testing)
✅ Can be installed on devices with "Unknown Sources" enabled
❌ Cannot be published to stores yet
```

### **For App Store / Google Play**
```
iOS App Store:
1. Generate development certificate
2. Create provisioning profile
3. Update workflow to use certificate
4. Sign archive during export
5. Upload to App Store Connect

Google Play Store:
1. Generate release signing key
2. Add to GitHub Secrets
3. Update workflow to sign APK
4. Upload to Google Play Console
5. Submit for review
```

---

## 🛠️ Troubleshooting

### **iOS Build Fails**
```
Common issues:
- Xcode version incompatible: Use 'latest-stable'
- CocoaPods cache: Clear in workflow
- Certificate issues: Handled automatically
- Provisioning: Auto-signing enabled

Solution:
1. Check build log for specific error
2. Fix the issue locally
3. Push again to trigger rebuild
```

### **Android Build Fails**
```
Common issues:
- Java version mismatch: Using Java 17
- Gradle cache issues: Cached, usually helps
- SDK issues: Ubuntu has all SDKs

Solution:
1. Check build log for specific error
2. Ensure gradlew is executable
3. Push again to trigger rebuild
```

### **Artifacts Not Showing**
```
Possible causes:
- Build still running: Wait for completion
- Build failed: Check logs
- Artifacts expired: 30-day retention

Solution:
1. Check workflow status (green = success)
2. Scroll to "Artifacts" section
3. If not there, build may have failed
```

---

## 📋 Workflow Files Overview

### **iOS Workflow (.github/workflows/ios-build.yml)**
```yaml
✅ 90 lines
✅ Runs on: macos-latest
✅ Node.js 18
✅ Xcode latest-stable
✅ CocoaPods
✅ Creates release on main push
✅ 30-day artifact retention
```

### **Android Workflow (.github/workflows/android-build.yml)**
```yaml
✅ 110 lines
✅ Runs on: ubuntu-latest
✅ Node.js 18
✅ Java 17 (Temurin)
✅ Gradle (cached)
✅ Creates release on main push
✅ 30-day artifact retention
```

---

## 🚀 Example Workflow

### **Push New Marketplace Feature**
```bash
# 1. Make changes locally
code src/app/marketplace/page.tsx

# 2. Test locally
npm run build
npm run dev

# 3. Commit and push
git add src/app/marketplace/
git commit -m "feat: add price alerts to marketplace"
git push origin main

# 4. GitHub Actions automatically:
# → iOS build starts on macOS
# → Android build starts on Ubuntu
# → Both build simultaneously
# → Both complete in ~15 minutes
# → Artifacts ready to download
# → Releases created with full details
# → You get notifications when done

# 5. Download and test
# → Download IPA from iOS release
# → Download APK from Android release
# → Install on devices
# → Test new features
```

---

## 📊 Build Time Estimates

| Build | Time | Status |
|-------|------|--------|
| iOS build | 10-15 min | macOS runner (slower) |
| Android build | 5-10 min | Ubuntu runner (faster) |
| Both parallel | 10-15 min | Runs simultaneously |
| Total with upload | 15-20 min | Includes artifact upload |

---

## 💡 Pro Tips

### **Faster Iteration**
```
1. Commit small, focused changes
2. Push to trigger builds
3. Download APK/IPA immediately
4. Test on devices in parallel
5. Fix issues and re-push
```

### **Testing Multiple Versions**
```
1. Every push creates new artifacts
2. Keep multiple versions around
3. Compare versions on devices
4. See regressions quickly
5. Rollback if needed
```

### **CI/CD Best Practices**
```
1. Never push broken code to main
2. Test locally before push
3. Check build logs after push
4. Download and verify each build
5. Keep stable builds tagged
```

---

## 📞 Support

### **If Build Fails**
1. Check the error in build log
2. Fix the issue locally
3. Push again
4. Check GitHub Actions for status

### **If Artifacts Missing**
1. Verify build completed (green checkmark)
2. Scroll to Artifacts section
3. If not there, build failed - check logs

### **If IPA/APK Won't Install**
1. Verify you're using correct device
2. Check iOS/Android version compatibility
3. Try deleting app and reinstalling
4. Check device signing settings

---

## ✨ What's Automated

```
✅ Code checkout
✅ Dependencies installation
✅ Next.js build
✅ Capacitor sync
✅ iOS/Android build
✅ APK/IPA generation
✅ Artifact upload
✅ Release creation
✅ Build notifications

All completely automated on every push!
```

---

**Status:** ✅ Ready to build!

Just push code to main and GitHub Actions will automatically:
1. Build iOS IPA
2. Build Android APK
3. Upload both as artifacts
4. Create releases with download links
5. Notify you when done

No manual steps needed! 🚀

**Latest:**
- iOS Workflow: `.github/workflows/ios-build.yml` ✅
- Android Workflow: `.github/workflows/android-build.yml` ✅
- Both automated on every push ✅
