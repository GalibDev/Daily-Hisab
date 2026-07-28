# Daily Hisab Android — গুরুত্বপূর্ণ ফাইল

এই ফাইলটি native Kotlin/Jetpack Compose Android app-এর গুরুত্বপূর্ণ source, login configuration এবং build output-এর সংক্ষিপ্ত মানচিত্র।

## মূল app source

### `app/src/main/java/com/dailyhisab/nativeapp/MainActivity.kt`

App-এর প্রধান UI ও navigation এখানে আছে।

- Firebase Email/Password login
- নতুন account তৈরি
- Gmail/email verification link এবং verification gate
- Google sign-in
- Forgot password
- Login session ধরে রাখা
- Profile থেকে logout
- Home, Reports, Analytics ও Add Expense
- All Expenses, Category, Budget ও Calendar
- Profile, Settings, Receipt, Notes, Reminder ও Backup
- Calculator এবং expense edit/delete flow

Login screen-এর প্রধান composable: `AuthScreen`

Email verification screen-এর composable: `EmailVerificationScreen`

App entry point: `MainActivity`

Main navigation enum: `Screen`

### `app/src/main/java/com/dailyhisab/nativeapp/data/FinanceDatabase.kt`

Room local database এবং app-এর data model/DAO এখানে আছে।

- Transaction/expense
- Category
- Recurring expense
- Reminder
- Note
- Receipt

বর্তমানে হিসাবের data device-এর local Room database-এ থাকে। Firebase শুধু authentication-এর জন্য ব্যবহৃত হচ্ছে; account অনুযায়ী cloud data sync এখনো যোগ করা হয়নি।

### `app/src/main/java/com/dailyhisab/nativeapp/notifications/ReminderWorker.kt`

Expense reminder/notification schedule ও background worker।

## Firebase login configuration

### `app/google-services.json`

Firebase project এবং Android app-এর generated configuration।

- Firebase project: `daily-hisab-ead32`
- Android package: `com.dailyhisab.nativeapp`
- এই ফাইল ছাড়া Firebase login build/configuration কাজ করবে না।
- Package name পরিবর্তন করলে Firebase Console-এ নতুন Android app register করে নতুন `google-services.json` নিতে হবে।
- Play Store release-এর আগে release/upload/app-signing SHA-1 ও SHA-256 Firebase Console-এ যোগ করে ফাইলটি আবার download করতে হবে।

### `app/build.gradle.kts`

Android app module configuration:

- Application ID/package
- Minimum ও target Android SDK
- Compose, Room এবং WorkManager dependencies
- Firebase Authentication
- Google sign-in
- Google Services Gradle plugin

### `build.gradle.kts`

Project-level Android, Kotlin, Compose, KAPT এবং Google Services plugin version।

## Android system configuration

### `app/src/main/AndroidManifest.xml`

- App name ও icon
- Launcher activity
- Notification permission
- Android application settings

### `app/src/main/res/drawable/ic_daily_hisab.xml`

Daily Hisab Android app icon।

### `app/src/main/res/values/styles.xml`

App ও splash-screen theme।

## Gradle project files

- `settings.gradle.kts` — project/module এবং repository configuration
- `gradle.properties` — Gradle/Android build settings
- `gradle/wrapper/gradle-wrapper.properties` — Gradle wrapper version
- `gradlew.bat` — Windows থেকে build command

## Build ও APK

Windows PowerShell/Terminal:

```powershell
cd "D:\PROJECTS\Daily Hisab\native-android"
.\gradlew.bat assembleDebug
```

Debug APK:

```text
D:\PROJECTS\Daily Hisab\native-android\app\build\outputs\apk\debug\app-debug.apk
```

Android Studio-তে সরাসরি খুলতে হবে:

```text
D:\PROJECTS\Daily Hisab\native-android
```

## Login system যাচাই

Firebase Console → Authentication → Sign-in method:

- Email/Password: Enabled
- Google: Enabled

Firebase Console → Project settings → Android app:

- Package: `com.dailyhisab.nativeapp`
- Development/debug keystore-এর SHA fingerprint যুক্ত থাকতে হবে।

## নিরাপদে সংরক্ষণ

- Debug/release keystore, keystore password এবং Play Console service-account key কখনো Git-এ commit করা যাবে না।
- Release signing key হারালে app update প্রকাশ করা কঠিন হতে পারে; encrypted backup রাখতে হবে।
- `google-services.json` client configuration; এটিকে server admin credential হিসেবে ব্যবহার করা যাবে না।
