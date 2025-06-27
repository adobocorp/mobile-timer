# Mobile Timer

This is a mobile timer application built with React, TypeScript, and Capacitor.js for cross-platform mobile deployment.

# Installation

## Prerequisites

### For iOS Development (macOS only)
Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

### For Android Development
Install Android Studio and set up the Android SDK:

1. **Download Android Studio** from [https://developer.android.com/studio](https://developer.android.com/studio)
2. **Install Android Studio** and run the setup wizard
3. **Install Android SDK** - The setup wizard will guide you through installing:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (AVD)
4. **Set environment variables** (add to your shell profile):
   ```sh
   # Windows (add to System Environment Variables)
   ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
   ANDROID_SDK_ROOT=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
   ANDROID_SDK_ROOT=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
   JAVA_HOME=C:\Program Files\Java\jdk-%VERSION%
   
   # macOS/Linux (add to ~/.bashrc, ~/.zshrc, or equivalent)
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
   export JAVA_HOME=$HOME/Library/Java/JavaVirtualMachines/jdk-$VERSION.jdk/Contents/Home
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```
5. **Accept Android SDK licenses**:
   ```sh
   cd $ANDROID_HOME/tools/bin
   ./sdkmanager --licenses
   ```

### For Fastlane
For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

## Quick Start

### Using npm scripts (Recommended)
```sh
# Build for Android (includes React build + Capacitor sync + Fastlane build)
npm run build:android

# Build for iOS (includes React build + Capacitor sync + Fastlane build)
npm run build:ios
```

### Using Fastlane directly
```sh
# Cross-platform builds
fastlane build_all    # Build debug versions for both platforms
fastlane release_all  # Build release versions for both platforms
fastlane clean        # Clean all build artifacts

# Platform-specific builds
fastlane ios build           # iOS debug build
fastlane ios release         # iOS App Store build
fastlane android build       # Android debug APK
fastlane android release     # Android release AAB
fastlane android release_apk # Android release APK
```

# Build Process

The build process includes:
1. **React Build** - Compiles TypeScript and builds the web app (`npm run build`)
2. **Capacitor Sync** - Copies web assets to native projects (`npx cap sync`)
3. **Native Build** - Uses Fastlane to build platform-specific packages

# Build Artifacts

All build artifacts are saved with dynamic naming including:
- Version number (based on git commit count)
- Git commit hash
- Build timestamp
- Platform and build type

**Output locations:**
- iOS: `fastlane/build/ios/`
- Android: `fastlane/build/android/`

**Example artifact names:**
- `MobileTimer-ios-debug-v1.0.23-a1b2c3d-20250627_1430.ipa`
- `MobileTimer-android-release-v1.0.23-a1b2c3d-20250627_1430.aab`

# Available Actions

### build_all

```sh
[bundle exec] fastlane build_all
```

Build both iOS and Android apps for development

### release_all

```sh
[bundle exec] fastlane release_all
```

Build both iOS and Android apps for release

### clean

```sh
[bundle exec] fastlane clean
```

Clean all build artifacts

----


## iOS

### ios build

```sh
[bundle exec] fastlane ios build
```

Build iOS app for development

### ios release

```sh
[bundle exec] fastlane ios release
```

Build iOS app for App Store

----


## Android

### android build

```sh
[bundle exec] fastlane android build
```

Build Android APK for development

### android release

```sh
[bundle exec] fastlane android release
```

Build Android AAB for release

### android release_apk

```sh
[bundle exec] fastlane android release_apk
```

Build Android APK for release