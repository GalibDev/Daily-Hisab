# Daily Hisab Firebase Email ও Custom Domain সেটআপ

এই ডকুমেন্টে `dailyhisab.xyz` domain ব্যবহার করে Firebase verification email পাঠানো, custom sender domain যাচাই এবং clickable email action page তৈরির সম্পূর্ণ প্রক্রিয়া বাংলায় লেখা হয়েছে।

## সমস্যাটি কী ছিল

Firebase-এর default verification email-এ:

- App-এর নামের জায়গায় `project-18709848069` দেখা যাচ্ছিল।
- Sender ছিল `noreply@daily-hisab-ead32.firebaseapp.com`।
- Verification link-এ Firebase-এর domain দেখা যাচ্ছিল।
- Gmail email-টিকে Spam হিসেবে ধরেছিল।
- কিছু email-এ link সাধারণ text-এর মতো দেখা যাচ্ছিল।

এগুলো Firebase-এর default email template ও default sender domain ব্যবহারের কারণে হয়েছিল।

## যে সমাধান করা হয়েছে

### ১. Website-এ custom action page তৈরি

File:

```text
app/auth/action/page.tsx
```

Live URL:

```text
https://dailyhisab.xyz/auth/action
```

এই page Firebase email থেকে আসা নিচের query parameter গ্রহণ করে:

- `mode`
- `oobCode`

Page-টি Firebase SDK ব্যবহার করে নিচের কাজগুলো সম্পন্ন করে:

- Email verification
- Password reset
- Email recovery
- Verify and change email

Verification সফল হলে user-কে Daily Hisab app-এ ফিরে গিয়ে:

```text
I've verified — continue
```

button চাপতে বলা হয়।

Password reset link হলে একই page-এ নতুন password দেওয়ার form দেখায়।

## ২. Firebase Android verification flow

Android source:

```text
native-android/app/src/main/java/com/dailyhisab/nativeapp/MainActivity.kt
```

নতুন Email/Password account তৈরি হলে:

1. Firebase account তৈরি হয়।
2. `sendEmailVerification()` দিয়ে verification email পাঠানো হয়।
3. User verified না হওয়া পর্যন্ত main app খোলে না।
4. `EmailVerificationScreen` দেখানো হয়।
5. User email-এর link খোলার পর `I've verified — continue` চাপলে `user.reload()` দিয়ে Firebase status পরীক্ষা করা হয়।

Google account Firebase-এর কাছে আগে থেকেই verified থাকে, তাই Google sign-in-এর ক্ষেত্রে আলাদা verification email লাগে না।

## ৩. বারবার email পাঠানোর সমস্যা প্রতিরোধ

Firebase একই device থেকে অল্প সময়ে অনেক verification request পেলে সাময়িকভাবে request বন্ধ করতে পারে।

এই সমস্যা ঠেকাতে Android app-এ:

- প্রথম email-এর পর ৬০ সেকেন্ড resend cooldown
- Firebase rate-limit করলে ১২০ সেকেন্ড cooldown
- পরিষ্কার error message
- Resend button সাময়িকভাবে disabled রাখা

যোগ করা হয়েছে।

## ৪. Firebase custom sender domain

Firebase Console-এ:

```text
Authentication
→ Templates
→ Email address verification
→ Edit template
→ Customise domain
```

Domain হিসেবে দেওয়া হয়েছে:

```text
dailyhisab.xyz
```

Firebase domain যাচাই করার জন্য Namecheap DNS-এ কয়েকটি record চেয়েছে।

## ৫. Namecheap DNS records

Namecheap:

```text
Domain List
→ dailyhisab.xyz
→ Advanced DNS
→ Host Records
```

নিচের records যোগ করা হয়েছে।

### Firebase domain ownership

| Type | Host | Value |
|---|---|---|
| TXT | `@` | `firebase=daily-hisab-ead32` |

### Firebase email SPF

| Type | Host | Value |
|---|---|---|
| TXT | `@` | `v=spf1 include:_spf.firebasemail.com ~all` |

### Firebase DKIM 1

| Type | Host | Value |
|---|---|---|
| CNAME | `firebase1._domainkey` | `mail-dailyhisab-xyz.dkim1._domainkey.firebasemail.com.` |

### Firebase DKIM 2

| Type | Host | Value |
|---|---|---|
| CNAME | `firebase2._domainkey` | `mail-dailyhisab-xyz.dkim2._domainkey.firebasemail.com.` |

TTL হিসেবে `Automatic` ব্যবহার করা হয়েছে।

## ৬. SPF conflict কীভাবে ঠিক করা হয়েছে

Namecheap Email Forwarding আগে নিজস্ব SPF record তৈরি করেছিল:

```text
v=spf1 include:spf.efwd.registrar-servers.com ~all
```

একই domain-এ একাধিক SPF record রাখা ঠিক নয়। এতে email authentication ব্যর্থ হতে পারে।

তাই:

1. Mail Settings থেকে অপ্রয়োজনীয় Namecheap Email Forwarding বন্ধ করা হয়েছে।
2. পুরোনো forwarding SPF সরানো হয়েছে।
3. Firebase-এর প্রয়োজনীয় SPF record রাখা হয়েছে।

বর্তমানে ব্যবহারযোগ্য SPF:

```text
v=spf1 include:_spf.firebasemail.com ~all
```

ভবিষ্যতে অন্য email provider ব্যবহার করলে আলাদা SPF record তৈরি না করে সব provider-কে একটি SPF record-এর মধ্যে যোগ করতে হবে।

## ৭. Firebase verification request

DNS records যোগ করার পর Firebase Console-এ:

```text
Customise domain
→ dailyhisab.xyz
→ Continue
→ Verify
```

দিয়ে verification request পাঠানো হয়েছে।

Firebase Console সফলভাবে দেখিয়েছে:

```text
Verification request sent
```

DNS ও DKIM verification সম্পন্ন হতে কয়েক মিনিট থেকে সর্বোচ্চ ৪৮ ঘণ্টা লাগতে পারে।

## ৮. Firebase email template branding

Domain verified হওয়ার পর template-এ নিচের মান ব্যবহার করতে হবে:

Sender name:

```text
Daily Hisab
```

Subject:

```text
Verify your Daily Hisab account
```

Custom action URL:

```text
https://dailyhisab.xyz/auth/action
```

Firebase email message-এর `%LINK%` এই URL এবং Firebase-এর secure parameters ব্যবহার করবে।

## ৯. নতুন email দিয়ে পরীক্ষা

আগে পাঠানো verification email পরিবর্তন হবে না। Domain verification শেষ হলে নতুন verification email পাঠিয়ে পরীক্ষা করতে হবে।

পরীক্ষার ধাপ:

1. নতুন Email/Password account তৈরি করুন।
2. Gmail Inbox এবং Spam folder দেখুন।
3. Sender ও subject-এ Daily Hisab branding দেখুন।
4. Verification link চাপুন।
5. `dailyhisab.xyz/auth/action` page সফল হয়েছে কি না দেখুন।
6. Android app-এ ফিরে `I've verified — continue` চাপুন।

## ১০. গুরুত্বপূর্ণ সতর্কতা

- DNS record অকারণে delete বা পরিবর্তন করবেন না।
- একই domain-এ একাধিক SPF record রাখবেন না।
- Firebase project ID বা Android package পরিবর্তন করলে নতুন configuration লাগতে পারে।
- Play Store release-এর আগে release/app-signing SHA-1 ও SHA-256 Firebase-এ যোগ করতে হবে।
- Gmail Spam status সঙ্গে সঙ্গে ঠিক নাও হতে পারে; domain reputation তৈরি হতে কিছু সময় লাগে।
- Firebase domain verified হওয়ার আগে sender এখনও `firebaseapp.com` দেখাতে পারে।

## সম্পর্কিত গুরুত্বপূর্ণ ফাইল

```text
app/auth/action/page.tsx
native-android/app/src/main/java/com/dailyhisab/nativeapp/MainActivity.kt
native-android/app/google-services.json
native-android/IMPORTANT_FILES.md
```

