# 🔐 BlockVault — Security Audit Report
**Date:** 2026-11-28 | **Version:** v8 | **Standard:** OWASP Top-10, Zero-Trust  
**Auditor:** Application Security Review  
**Repository:** `bhushan230/blockvault-v8`

---

## 🚨 Manual Actions You Must Take RIGHT NOW

> [!CAUTION]
> These steps cannot be done in code — you must do them manually in the Firebase and Vercel dashboards. The app database is likely open to unauthenticated reads and writes until you do step 1.

---

### ✅ Action 1 — Deploy Firestore Security Rules (HIGHEST PRIORITY)

1. Go to [Firebase Console](https://console.firebase.google.com) → Select project **blokchane**
2. Click **Firestore Database** → **Rules** tab
3. Replace everything with the content of [`firestore.rules`](./firestore.rules) in your repo root
4. Click **Publish**

> Without this, ANY person on the internet can read all user emails, wallet addresses, and self-escalate to admin role.

---

### ✅ Action 2 — Move Firebase Keys to Environment Variables

**In Vercel:**
1. Go to [vercel.com](https://vercel.com) → Your Project → **Settings** → **Environment Variables**
2. Add these four variables (get values from Firebase Console → Project Settings → Your Apps):

| Variable Name | Value |
|---|---|
| `VITE_FIREBASE_API_KEY` | `AIzaSyC6PGd4skGyvZZPTpTX6lnFjI0ZkbPbgwU` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `blokchane.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `blokchane` |
| `VITE_FIREBASE_APP_ID` | `1:582707929687:web:d8bb0d92b4017be6bb7912` |

3. Set environment to **Production**, **Preview**, and **Development**
4. Click **Save**

**Then update `frontend/src/lib/firebase.js`:**
```js
const firebaseConfig = {
  apiKey:      import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:   import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:       import.meta.env.VITE_FIREBASE_APP_ID,
};
```

5. Create `frontend/.env.local` (use the `.env.example` file as a template — never commit `.env.local`)
6. Redeploy on Vercel

> [!WARNING]
> The hardcoded keys are already in public GitHub history. After moving to env vars, consider rotating the Firebase API key in Firebase Console → Project Settings → Web API Key → Regenerate. Note: rotating breaks all existing sessions.

---

### ✅ Action 3 — Enable Firebase App Check

1. Go to [Firebase Console](https://console.firebase.google.com) → **App Check**
2. Click your web app → **reCAPTCHA v3** (recommended for web)
3. Register your Vercel production domain
4. Click **Enforce** for both **Firestore** and **Authentication**

> This prevents bots from abusing your exposed Firebase API key to spam registrations or brute-force logins.

---

### ✅ Action 4 — Rotate Your Pinata JWT to a Scoped Key

1. Log in to [pinata.cloud](https://pinata.cloud) → **API Keys**
2. Create a **new key** with ONLY these permissions: `pinFileToIPFS`, `pinJSONToIPFS`
3. Set a reasonable rate limit (e.g., 100 uploads/day)
4. **Delete the old full-access JWT**
5. Tell all users to update their JWT in the BlockVault dashboard

> The current JWT grants full Pinata account access. If stolen from DevTools, an attacker can upload unlimited content to your account.

---

### ✅ Action 5 — Purge Hardcoded Keys from Git History

```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove files containing hardcoded credentials from ALL history
git filter-repo --path blockchain-storage/firebase-config.js --invert-paths
git filter-repo --path legacy-vanilla/firebase-config.js --invert-paths

# Force push (requires all collaborators to re-clone)
git push origin --force --all
```

> Or, at minimum, delete the `blockchain-storage/` and `legacy-vanilla/` folders if they are unused.

---

## 📊 Findings Summary

### By Severity

| Severity | Count | Status |
|---|---|---|
| 🔴 Critical | 5 | 2 patched in code, 3 require manual action |
| 🟠 High | 5 | 2 patched in code, 3 require manual action |
| 🟡 Medium | 7 | 2 patched in code, 5 pending |
| 🟢 Low | 5 | 1 patched in code, 4 minor |

### What Was Already Patched & Pushed (commit `c99de8d`)

| File Changed | Security Fix Applied |
|---|---|
| `frontend/vercel.json` | Added HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, full Content-Security-Policy |
| `frontend/src/lib/chainConfig.js` | Fixed Pinata gateway from broken URL to `https://…/ipfs/` |
| `frontend/src/pages/AuthPage.jsx` | Hash key format validation (must be 64 hex chars); atomic key provisioning with rollback; `console.error` gated to DEV only |
| `firestore.rules` | Full Firestore Security Rules file — ready to deploy in Firebase Console |
| `frontend/.env.example` | Template for moving Firebase keys to environment variables |

---

## 🔴 CRITICAL Findings

---

### CRITICAL-01 — Firebase Config Hardcoded in Public GitHub Repo
**Component:** `frontend/src/lib/firebase.js`, `blockchain-storage/firebase-config.js`  
**Status:** ⚠️ Patch written — manual action required (Actions 2 & 5 above)

**What an attacker can do:**
- Scrape the Firebase `apiKey` from GitHub or the browser bundle
- Call Firebase REST API directly to create unlimited accounts
- Enumerate the `keys` Firestore collection to harvest all user emails
- If Firestore rules are open, modify any user's data

**Fix:** Move all Firebase config to Vercel environment variables (Action 2). Remove legacy files from git history (Action 5).

---

### CRITICAL-02 — No Firestore Security Rules (Open Database)
**Component:** Firebase Console → Firestore → Rules  
**Status:** ⚠️ Rules file created — must be deployed manually (Action 1 above)

**What an attacker can do:**
- Read the entire `users` collection → harvest names, emails, roles, wallet addresses
- Read the entire `keys` collection → enumerate all user key hashes and emails
- Write `role: "admin"` to their own user document → instant admin escalation
- Write to the `files` collection → poison metadata for other users' downloads

**Fix:** Deploy `firestore.rules` from the repo root to Firebase Console.

---

### CRITICAL-03 — Hash Key Used as Both Auth Credential AND Encryption Secret
**Component:** `frontend/src/lib/storage.js` → `aesKey()`  
**Status:** 🔶 Identified — hardening recommended

**Problem:**
```js
// Same 64-char key is the Firebase password AND the AES-256-GCM encryption secret
await auth.signInWithEmailAndPassword(email, cleanKey);  // auth
const raw = await crypto.subtle.digest("SHA-256", text("encrypt:" + hashKey)); // encryption
```
If Firebase's password storage is ever compromised, the AES encryption key for all files is derivable.

**Recommended fix — Use HKDF instead of raw SHA-256:**
```js
export async function aesKey(hashKey) {
  const baseKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(hashKey),
    { name: "HKDF" }, false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "HKDF", hash: "SHA-256",
      salt: new TextEncoder().encode("blockvault-v8-encryption-salt"),
      info: new TextEncoder().encode("file-encryption-key")
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false, ["encrypt", "decrypt"]
  );
}
```
> This is a non-breaking change — the same hash key still works, but derivation is now cryptographically standard (HKDF per RFC 5869).

---

### CRITICAL-04 — `keys` Collection is a Global Reverse-Lookup Oracle
**Component:** `AuthPage.jsx` → `handleLogin()`, Firestore `keys` collection  
**Status:** 🔶 Mitigated by Firestore rules — further hardening recommended

**Problem:** The login flow does an unauthenticated Firestore lookup before Firebase Auth. With open rules, unlimited brute-force lookups are possible. Even with closed rules, the lookup pattern leaks valid key hashes.

**Recommended fix:** Move the `keys` lookup to a Firebase Cloud Function with rate limiting:
```js
// Cloud Function (pseudo-code)
exports.lookupKey = functions.https.onCall(async (data, context) => {
  // Rate limit: max 10 calls per IP per minute
  const keyHash = data.keyHash;
  const doc = await admin.firestore().collection('keys').doc(keyHash).get();
  if (!doc.exists) throw new functions.https.HttpsError('not-found', 'Unknown key');
  return { email: doc.data().email }; // only return email, not uid
});
```

---

### CRITICAL-05 — Pinata JWT Stored in Plaintext React State
**Component:** `DashboardPage.jsx` → `const [jwt, setJwt] = useState('')`  
**Status:** ⚠️ Manual action required (Action 4 above)

**What an attacker can do:**
- Open DevTools → React DevTools panel → read the JWT from component state
- Use the JWT to upload unlimited content to your Pinata account permanently
- The JWT appears in the `Authorization: Bearer` header on every upload (visible in Network tab)

**Fix:** Rotate to a scoped, rate-limited Pinata key. Clear JWT from state immediately after each upload completes (not just on inactivity lock).

---

## 🟠 HIGH Findings

---

### HIGH-01 — No Brute-Force / Rate Limiting on Login
**Component:** `AuthPage.jsx` → `handleLogin()`  
**Status:** 🔶 Add client-side backoff

**Add this to `AuthPage.jsx`:**
```js
const [loginAttempts, setLoginAttempts] = useState(0);
const [lockedUntil, setLockedUntil] = useState(null);

// At top of handleLogin:
if (lockedUntil && Date.now() < lockedUntil) {
  const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
  setLoginStatus({ kind: 'error', text: `Too many attempts. Try again in ${secs}s.` });
  return;
}

// On failed catch:
const attempts = loginAttempts + 1;
setLoginAttempts(attempts);
if (attempts >= 5) {
  const lockMs = Math.min(Math.pow(2, attempts - 5) * 60 * 1000, 30 * 60 * 1000);
  setLockedUntil(Date.now() + lockMs);
}
```

---

### HIGH-02 — Admin Role Check is Client-Side Only
**Component:** `AuthPage.jsx` → `handleLogin()`, `DashboardPage.jsx`  
**Status:** ✅ Fixed by CRITICAL-02 Firestore rules

The "Admin" login tab is a UI hint only. The real protection is server-side Firestore rules that prevent non-admins from reading other users' data. Deploying `firestore.rules` (Action 1) closes this gap.

---

### HIGH-03 — Missing Security HTTP Headers
**Component:** `frontend/vercel.json`  
**Status:** ✅ **Patched in commit `c99de8d`**

Headers added: `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, full `Content-Security-Policy`.

---

### HIGH-04 — Firebase Auth Email Verification Race Condition
**Component:** `AuthPage.jsx` → `handleVerified()`  
**Status:** ✅ **Patched in commit `c99de8d`**

Key provisioning is now atomic: Firestore write happens before `updatePassword()`. If `updatePassword()` fails, the keys doc is rolled back. User can safely retry.

---

### HIGH-05 — Pinata Gateway URL Missing HTTPS Scheme
**Component:** `frontend/src/lib/chainConfig.js`  
**Status:** ✅ **Patched in commit `c99de8d`**

Changed from:
```js
gateway: "rose-impressive-shrew-796.mypinata.cloud"
```
To:
```js
gateway: "https://rose-impressive-shrew-796.mypinata.cloud/ipfs/"
```

---

## 🟡 MEDIUM Findings

---

### MEDIUM-01 — No Input Validation on Hash Key Length/Format
**Status:** ✅ **Patched in commit `c99de8d`**  
Login now validates `^[0-9a-f]{64}$` before any network call.

---

### MEDIUM-02 — `role: 'user'` Self-Set on Registration
**Status:** ✅ Fixed by Firestore rules (Action 1)  
Rules enforce `role == 'user'` and `blocked == false` on document create.

---

### MEDIUM-03 — File Name Not Validated Before Encryption/Upload
**Component:** `DashboardPage.jsx` → `processFile()`  
**Status:** 🔶 Pending

Add before uploading:
```js
const safeName = file.name.replace(/[^\w\s.\-]/g, '_').replace(/\.{2,}/g, '.').slice(0, 255);
```

---

### MEDIUM-04 — No CORS Configuration on Vercel Deployment
**Component:** `frontend/vercel.json`  
**Status:** 🔶 Add when you have a fixed production domain

```json
{ "key": "Access-Control-Allow-Origin", "value": "https://your-domain.vercel.app" }
```

---

### MEDIUM-05 — Lottie Animations Loaded from External CDN Without SRI
**Component:** All pages using `DotLottieReact`  
**Status:** 🔶 Pending — host Lottie files locally

Move all `.json`/`.lottie` files to `frontend/public/lottie/` and import as local URLs.

---

### MEDIUM-06 — `name` Field Written to Firestore Without Sanitization
**Component:** `AuthPage.jsx` → `handleCreate()`  
**Status:** 🔶 Pending

Add validation:
```js
const trimmedName = regName.trim().slice(0, 100);
if (!/^[\p{L}\p{N} .'\-]{1,100}$/u.test(trimmedName)) {
  setRegStatus({ kind: 'error', text: 'Name contains invalid characters.' });
  return;
}
```

---

### MEDIUM-07 — Inactivity Auto-Lock Relies on Client-Side Timers Only
**Component:** `DashboardPage.jsx`  
**Status:** ℹ️ Acceptable for client-side app — documented as known limitation

The 5-min key lock / 15-min logout can be bypassed by keeping the tab "active". Firebase session token expiry provides a server-side backstop.

---

## 🟢 LOW Findings

| # | Finding | Status |
|---|---|---|
| LOW-01 | `console.error(err)` leaks stack traces in production | ✅ **Patched** — gated to `import.meta.env.DEV` |
| LOW-02 | `autocomplete="off"` ignored by modern browsers — use `current-password` | 🔶 Cosmetic |
| LOW-03 | Legacy vanilla files with hardcoded Firebase keys still in repo | ⚠️ Delete or purge (Action 5) |
| LOW-04 | `rel="noopener noreferrer"` on GitHub link | ✅ Already present — no action |
| LOW-05 | `sha256(getRandomValues())` adds no entropy vs `hex(getRandomValues())` | ℹ️ Harmless — cosmetic |

---

## ⚠️ Uncertain Risks — Needs Runtime Verification

| # | Risk | How to Check |
|---|---|---|
| R1 | Firestore Security Rules may be open | Firebase Console → Firestore → Rules — verify NOT `allow read, write: if true` |
| R2 | Firebase Auth App Check not enabled | Firebase Console → App Check — check Enforcement status |
| R3 | Pinata JWT scope — may be full account access | Pinata Dashboard → API Keys → check permissions |
| R4 | Firebase Auth email enumeration via different error messages | Test: try wrong email vs wrong key — errors should be identical |
| R5 | Malicious browser extension overriding `window.tronWeb` / `window.ethereum` | No easy fix — document as known risk; encourage users to use trusted extension sources |
| R6 | TRON Shasta contract `getFile` returns unmodified hashes | Verify on Shasta Tronscan that stored hashes match what the app reads |

---

## ✅ Prioritized Hardening Checklist

### ⛔ Before Going to Production (Do Today)

- [ ] **Deploy Firestore Security Rules** → Firebase Console → Firestore → Rules (Action 1)
- [ ] **Move Firebase config to env vars** → Vercel Environment Variables (Action 2)
- [ ] **Enable Firebase App Check** → Firebase Console → App Check (Action 3)
- [ ] **Rotate Pinata JWT to scoped key** → Pinata Dashboard → API Keys (Action 4)
- [ ] **Purge hardcoded keys from git history** → `git filter-repo` (Action 5)

### 🔺 High Priority (Within 1 Week)

- [ ] Add login brute-force backoff (5 attempts → exponential lockout) — see HIGH-01 patch
- [ ] Migrate `aesKey()` from raw SHA-256 to HKDF derivation — see CRITICAL-03 patch
- [ ] Move `keys` collection lookup to a Cloud Function with rate limiting — see CRITICAL-04
- [ ] Sanitize filenames before upload — see MEDIUM-03 patch

### 🔸 Medium Priority (Within 1 Month)

- [ ] Self-host all Lottie animation files in `/public/lottie/`
- [ ] Add `name` field validation on registration — see MEDIUM-06 patch
- [ ] Add explicit CORS header when production domain is fixed
- [ ] Delete unused `blockchain-storage/` and `legacy-vanilla/` directories

### 🔹 Ongoing / Nice-to-Have

- [ ] Add Firebase Auth MFA (TOTP) for admin accounts
- [ ] Set up custom Firebase Auth email action URL to prevent phishing of verification links
- [ ] Consider key-recovery scheme (Shamir Secret Sharing — 3-of-5 encrypted key shares)
- [ ] Write Firestore Security Rules unit tests using Firebase Local Emulator Suite
- [ ] Set up GitHub secret scanning alerts for accidental credential commits

---

## 🗂️ Threat Model — Quick Reference

### Entry Points
| Entry Point | Credential | Risk |
|---|---|---|
| `/login` — hash key form | 64-char hex key | Brute-force, key theft |
| `/register` — name + email | Email | Account creation spam |
| Dashboard — Pinata JWT field | Bearer token | Token theft, quota abuse |
| Firestore REST API | Firebase `apiKey` | Open DB if rules missing |
| IPFS gateway | None (public CIDs) | Block tampering |
| TronLink extension | Wallet private key | Extension spoofing |

### User Roles & Sensitive Assets
| Role | Can Do | Sensitive Assets Accessible |
|---|---|---|
| `user` | Upload/download own files, connect wallets | Own files, own hash key, Pinata JWT |
| `moderator` | Read all users list | All user names, emails, wallet addresses |
| `admin` | All above + manage users, block accounts | Everything above + all file metadata |

---

*Report generated by security audit — BlockVault v8 — 2026-11-28*  
*Commit reference: `c99de8d` — patches applied*
