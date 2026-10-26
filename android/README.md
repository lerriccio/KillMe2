# Android build

Offline Android shell for KillMe2: Forge Survivors. Application ID `it.lerriccio.killme2`, minSdk 26, target/compileSdk 36. Java 17, Gradle 8.13, Android Gradle Plugin 8.13.2. No network or storage permission, advertising SDK, native library or account system. The JavaScript bridge only exports JSON through Android's document picker. Imported files also use the system picker.

1. Install JDK 17 and Android SDK platform 36 plus build-tools 35.0.0 (or open this folder in Android Studio and install its requested components).
2. Set `ANDROID_HOME` to the SDK path or put `sdk.dir=C:/path/to/Android/Sdk` in local.properties.
3. From the repository root run `node tools/package-android.cjs`.
4. In this folder run Gradle 8.13: `gradle assembleDebug bundleRelease`.

Windows alternative from the repository root: `powershell -NoProfile -ExecutionPolicy Bypass -File tools/bootstrap-android.ps1 -InstallSdk -Build`. It downloads JDK 17, Gradle and the SDK tools under `.tools/`, without a global installation. SDK installation displays Google's license for the owner to review and accept. Refusing or skipping the license prevents compilation. The Gradle and Android tool archives are verified against published SHA-256 checksums.

Debug APK: `app/build/outputs/apk/debug/app-debug.apk`. Release AAB: `app/build/outputs/bundle/release/app-release.aab`.

The SDK license was accepted with the owner's explicit authorization on 26 October 2026. Both artifacts have been built locally; convenient copies are in `release-build/KillMe2-debug.apk` and `release-build/KillMe2-release-unsigned.aab`. Generated binaries, SDKs and caches are excluded from Git. These are build checks, not a substitute for testing the game on Android devices.

The release bundle is unsigned unless these environment variables are supplied: `KILLME2_KEYSTORE`, `KILLME2_STORE_PASSWORD`, `KILLME2_KEY_ALIAS`, `KILLME2_KEY_PASSWORD`. Keep the upload key and passwords outside Git and back them up. Configure Play App Signing in the owner's Play Console. Debug and release have separate app IDs and therefore separate saves; use the game's JSON export/import to transfer progress.

Before uploading, verify on Android devices: background/process kill and resume, rotation and display cutouts, file export/import, airplane mode, volume interruption, Android Back, WebView updates, and sustained boss fights on low-memory devices. Browser emulation does not certify these behaviors.

Project versions and requirements were checked on 26 October 2026 against [AGP documentation](https://developer.android.com/build/releases/agp-8-13-0-release-notes) and [Google Play target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878).
