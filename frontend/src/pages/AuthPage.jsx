import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Lock,
  Cpu,
  Layers,
  UserCheck,
  Crown,
  AlertCircle,
  Loader2,
  Fingerprint,
  Database,
  UserPlus,
  Mail,
  User,
  CheckCircle2,
  Copy,
  Check,
  ShieldAlert,
  MailCheck,
  FileText,
  X,
  Shield,
  Server,
  EyeOff as EyeOffIcon,
  Clock,
  Globe,
  Info
} from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { auth, db } from '../lib/firebase';
import { sha256 } from '../lib/core';

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));

/* ─── Privacy Policy Modal ─────────────────────────────────────────── */
function PrivacyModal({ onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Privacy Policy</h2>
                <p className="text-[11px] text-slate-500">BlockVault v8 · Last updated Nov 2025</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto text-sm text-slate-700 leading-relaxed">

            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex gap-3">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                BlockVault is a <strong>zero-knowledge</strong> decentralized storage system. We never see your files, keys, or passwords.
              </p>
            </div>

            {[
              {
                icon: EyeOffIcon,
                title: '1. No Data Collection',
                body: 'BlockVault never collects, stores, or transmits your personal files, encryption keys, or hash credentials to any central server. All cryptographic operations happen exclusively in your browser using the Web Crypto API.'
              },
              {
                icon: KeyRound,
                title: '2. Your Master Hash Key',
                body: 'Your master hash key is a randomly generated 256-bit secret. It is shown to you exactly once at account creation. BlockVault cannot recover it if lost. We store only an SHA-256 hash of your key — never the key itself.'
              },
              {
                icon: Shield,
                title: '3. Authentication Data',
                body: 'We use Firebase Authentication to manage account sessions. Firebase stores your email address and a salted/hashed password derived from your hash key. No plaintext passwords are ever stored.'
              },
              {
                icon: Server,
                title: '4. File Storage',
                body: 'Files are split into 4 encrypted shards (AES-256-GCM) before leaving your device. Shards are pinned to IPFS via Pinata, and CIDs are anchored on the TRON Shasta smart contract. BlockVault has no ability to read your files.'
              },
              {
                icon: Globe,
                title: '5. Third-Party Services',
                body: 'We integrate with Firebase (Google), Pinata (IPFS), and TRON Shasta testnet. Each service has its own privacy policy. Lottie animations are loaded from lottie.host. No tracking or analytics SDKs are included.'
              },
              {
                icon: Clock,
                title: '6. Session Security',
                body: 'Your session auto-locks after 5 minutes of inactivity (key cleared from memory) and auto-signs-out after 15 minutes. Clipboard is wiped 60 seconds after copying a hash key.'
              },
              {
                icon: Lock,
                title: '7. Cookies & Local Storage',
                body: 'BlockVault stores only Firebase session tokens in browser storage for authentication continuity. No advertising cookies, fingerprinting scripts, or analytics trackers are used.'
              }
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-3">
                <div className="h-7 w-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 mb-1">{title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800 block mb-1">Contact</strong>
              For questions about this policy, open an issue on the{' '}
              <a
                href="https://github.com/bhushan230/blockvault-v8"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                BlockVault GitHub repository
              </a>
              .
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">By using BlockVault you agree to this policy.</span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Trust Badge Row ───────────────────────────────────────────────── */
function TrustBadges({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 flex-wrap ${className}`}>
      {[
        { icon: ShieldCheck, label: 'AES-256-GCM' },
        { icon: Lock, label: 'Zero-Knowledge' },
        { icon: Globe, label: 'TRON Shasta' }
      ].map(({ icon: Icon, label }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1"
        >
          <Icon className="w-3 h-3 text-blue-500" />
          {label}
        </span>
      ))}
    </div>
  );
}

/* ─── Main AuthPage ─────────────────────────────────────────────────── */
export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isRegister = location.pathname === '/register';

  const [showPrivacy, setShowPrivacy] = useState(false);

  // --- Login State ---
  const [loginType, setLoginType] = useState('user');
  const [loginKey, setLoginKey] = useState('');
  const [showLoginKey, setShowLoginKey] = useState(false);
  const [fingerprint, setFingerprint] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginStatus, setLoginStatus] = useState(null);

  // --- Register State ---
  const [regStep, setRegStep] = useState('form'); // 'form' | 'verify' | 'minting' | 'tick' | 'result'
  const [regType, setRegType] = useState('user');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regStatus, setRegStatus] = useState(null);
  const [agreedPolicy, setAgreedPolicy] = useState(false);
  const [fullKey, setFullKey] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [showFull, setShowFull] = useState(false);
  const [copied, setCopied] = useState(false);
  const clipboardTimerRef = useRef(null);

  // Clear sensitive key material from memory on unmount / tab close / route switch
  useEffect(() => {
    const wipeKeys = () => {
      setLoginKey('');
      setFullKey('');
      setMaskedKey('');
    };
    window.addEventListener('beforeunload', wipeKeys);
    return () => {
      window.removeEventListener('beforeunload', wipeKeys);
      if (clipboardTimerRef.current) clearTimeout(clipboardTimerRef.current);
      wipeKeys();
    };
  }, []);

  useEffect(() => {
    setLoginKey('');
    setShowLoginKey(false);
  }, [isRegister]);

  // Live SHA-256 fingerprint preview on login key input
  useEffect(() => {
    let active = true;
    const trimmed = loginKey.trim().toLowerCase();
    if (!trimmed) {
      setFingerprint('');
      return;
    }
    sha256(new TextEncoder().encode(trimmed)).then(hash => {
      if (active) setFingerprint(hash.slice(0, 8) + '...' + hash.slice(-6));
    });
    return () => { active = false; };
  }, [loginKey]);

  // Preserved exact unfinished signup resume logic
  useEffect(() => {
    if (!isRegister) return;
    const unsubscribe = auth.onAuthStateChanged(async user => {
      unsubscribe && unsubscribe();
      if (!user) return;
      try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists && doc.data().keySet === false) {
          setRegStep('verify');
          setRegStatus({ kind: 'info', text: 'Click the link in your email, then press the button.' });
        }
      } catch (err) { console.error(err); }
    });
    return () => unsubscribe && unsubscribe();
  }, [isRegister]);

  // Preserved exact login logic with 3000ms delay for Lottie animation
  const handleLogin = async e => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginStatus({ kind: 'info', text: 'Checking...' });
    try {
      const minDelay = new Promise(resolve => setTimeout(resolve, 3000));
      const cleanKey = loginKey.trim().toLowerCase();
      const id = await sha256(new TextEncoder().encode(cleanKey));
      const found = await db.collection('keys').doc(id).get();
      if (!found.exists) throw new Error('Unknown key');
      const { user } = await auth.signInWithEmailAndPassword(found.data().email, cleanKey);
      if (!user.emailVerified) {
        await user.sendEmailVerification().catch(() => {});
        await auth.signOut();
        setLoginStatus({ kind: 'warn', text: 'Verify your email first. Check your inbox and spam folder.' });
        setLoginLoading(false);
        return;
      }
      if (loginType === 'admin') {
        const me = (await db.collection('users').doc(user.uid).get()).data();
        if (me?.role !== 'admin') {
          await auth.signOut();
          setLoginStatus({ kind: 'error', text: 'This account is not an approved admin.' });
          setLoginLoading(false);
          return;
        }
      }
      await minDelay;
      setLoginKey('');
      navigate('/');
    } catch {
      setLoginStatus({ kind: 'error', text: 'Login failed. Check your hash key.' });
      setLoginLoading(false);
    }
  };

  // Preserved exact create account logic
  const handleCreate = async e => {
    e.preventDefault();
    if (!agreedPolicy) {
      setRegStatus({ kind: 'error', text: 'Please agree to the Privacy Policy to continue.' });
      return;
    }
    const trimmedName = regName.trim();
    const trimmedEmail = regEmail.trim();
    if (!trimmedName) {
      setRegStatus({ kind: 'error', text: 'Enter your name.' });
      return;
    }
    setRegLoading(true);
    setRegStatus({ kind: 'info', text: 'Creating account...' });
    try {
      const { user } = await auth.createUserWithEmailAndPassword(trimmedEmail, random());
      await db.collection('users').doc(user.uid).set({
        name: trimmedName,
        email: trimmedEmail,
        role: 'user',
        blocked: false,
        adminRequest: regType === 'admin',
        keySet: false
      });
      await user.sendEmailVerification();
      setRegStep('verify');
      setRegStatus({ kind: 'info', text: 'Click the link in your email, then press the button.' });
    } catch (err) {
      setRegStatus({ kind: 'error', text: err.message });
    } finally {
      setRegLoading(false);
    }
  };

  // Preserved exact verification & key generation logic + Lottie -> Green Tick -> Key Reveal
  const handleVerified = async () => {
    setRegLoading(true);
    try {
      const user = auth.currentUser;
      await user.reload();
      if (!auth.currentUser.emailVerified) {
        setRegStatus({ kind: 'warn', text: 'Email not verified yet. Check inbox and spam.' });
        setRegLoading(false);
        return;
      }
      await user.getIdToken(true);
      const key = await sha256(crypto.getRandomValues(new Uint8Array(32)));
      const masked = key.slice(0, 6) + '*'.repeat(20) + key.slice(-4);
      const id = await sha256(new TextEncoder().encode(key));
      await db.collection('keys').doc(id).set({ uid: user.uid, email: user.email });
      await user.updatePassword(key);
      setFullKey(key);
      setMaskedKey(masked);
      await db.collection('users').doc(user.uid).update({ keySet: true });
      await auth.signOut();
      setRegStep('minting');
      setRegStatus(null);
      await new Promise(resolve => setTimeout(resolve, 2600));
      setRegStep('tick');
      await new Promise(resolve => setTimeout(resolve, 1000));
      setRegStep('result');
      setRegStatus({ kind: 'success', text: 'Account ready. Copy your key now, then login.' });
    } catch (err) {
      setRegStatus({ kind: 'error', text: err.message });
    } finally {
      setRegLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullKey);
      setCopied(true);
      setRegStatus({ kind: 'success', text: 'Key copied. Clipboard will auto-clear in 60s.' });
      if (clipboardTimerRef.current) clearTimeout(clipboardTimerRef.current);
      clipboardTimerRef.current = setTimeout(() => {
        navigator.clipboard.writeText('').catch(() => {});
      }, 60000);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setRegStatus({ kind: 'warn', text: 'Copy failed. Use Show and copy it by hand.' });
    }
  };

  const regSteps = [
    { id: 'form', num: 1, label: 'Identity' },
    { id: 'verify', num: 2, label: 'Verify Email' },
    { id: 'result', num: 3, label: 'Hash Key' }
  ];
  const currentStepIndex =
    regStep === 'minting' || regStep === 'tick'
      ? 2
      : regSteps.findIndex(s => s.id === regStep);

  const springTransition = { type: 'spring', stiffness: 250, damping: 28 };

  return (
    <>
      {/* Privacy Policy Modal */}
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}

      <div className="min-h-screen w-full bg-[#f8fafc] relative overflow-hidden flex flex-col lg:block">

        {/* MOBILE HEADER */}
        <div className="flex lg:hidden items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-base text-slate-900">BlockVault</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">v8</span>
          </div>
          <button
            type="button"
            onClick={() => navigate(isRegister ? '/login' : '/register')}
            className="text-xs font-semibold text-blue-600 cursor-pointer"
          >
            {isRegister ? 'Sign In' : 'Create Account'}
          </button>
        </div>

        {/* SLIDING FORM STAGE */}
        <motion.div
          initial={false}
          animate={{ x: isRegister ? '0%' : '100%' }}
          transition={springTransition}
          className="w-full lg:w-1/2 lg:absolute lg:inset-y-0 lg:left-0 flex items-center justify-center p-6 sm:p-10 z-10 bg-[#f8fafc] max-lg:!transform-none"
        >
          <div className="w-full max-w-md">
            <AnimatePresence mode="wait">

              {/* ───── LOGIN CARD ───── */}
              {!isRegister ? (
                <motion.div
                  key="login-card"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25 }}
                  className="flat-panel rounded-2xl relative overflow-hidden shadow-sm"
                >
                  {/* Lottie Login Loading Overlay */}
                  <AnimatePresence>
                    {loginLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 z-30 bg-white flex flex-col items-center justify-center p-6 text-center"
                      >
                        <div className="w-64 h-64 sm:w-72 sm:h-72">
                          <DotLottieReact
                            src="https://lottie.host/15babeb1-fbd3-47c2-bedc-a07f04f1ab69/XbDZGWiXo8.lottie"
                            loop
                            autoplay
                          />
                        </div>
                        <p className="text-sm font-display font-bold text-slate-900 mt-2">Verifying Cryptographic Key</p>
                        <p className="text-xs font-mono text-blue-600 mt-1">Authenticating with Vault...</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Top accent bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 transition-colors duration-200 ${loginType === 'admin' ? 'bg-slate-900' : 'bg-blue-600'}`} />

                  <div className="p-6 sm:p-8">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                            <ShieldCheck className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-display font-bold text-sm text-slate-900">BlockVault</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">v8</span>
                        </div>
                        <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Sign in to Vault</h2>
                        <p className="text-xs text-slate-500 mt-1">Enter your 64-character cryptographic hash key</p>
                      </div>
                    </div>

                    {/* Role Switcher */}
                    <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 border border-slate-200 mb-5 relative">
                      {[
                        { id: 'user', label: 'User Login', icon: UserCheck },
                        { id: 'admin', label: 'Admin Login', icon: Crown }
                      ].map(tab => {
                        const active = loginType === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setLoginType(tab.id)}
                            className={`relative z-10 flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${active ? 'text-white' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            {active && (
                              <motion.div
                                layoutId="loginRolePill"
                                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                                className={`absolute inset-0 rounded-lg -z-10 ${tab.id === 'admin' ? 'bg-slate-900' : 'bg-blue-600'}`}
                              />
                            )}
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label htmlFor="hash-key" className="text-xs font-semibold text-slate-700">
                            Cryptographic Hash Key
                          </label>
                          {fingerprint && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                              <Fingerprint className="w-3 h-3" />
                              {fingerprint}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            id="hash-key"
                            type={showLoginKey ? 'text' : 'password'}
                            value={loginKey}
                            onChange={e => setLoginKey(e.target.value)}
                            placeholder="Paste your 64-character hash key"
                            autoComplete="off"
                            spellCheck={false}
                            autoCorrect="off"
                            autoCapitalize="off"
                            data-lpignore="true"
                            required
                            className="flat-input w-full rounded-xl pl-10 pr-11 py-3 text-sm font-mono placeholder:text-slate-400 placeholder:font-sans"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginKey(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                            aria-label={showLoginKey ? 'Hide hash key' : 'Show hash key'}
                          >
                            {showLoginKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.99 }}
                        disabled={loginLoading}
                        type="submit"
                        className={`w-full py-3.5 px-5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 ${loginType === 'admin' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-blue-600 hover:bg-blue-700'}`}
                      >
                        {loginLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />Verifying Key...</>
                        ) : (
                          <>Unlock Vault<ArrowRight className="w-4 h-4" /></>
                        )}
                      </motion.button>
                    </form>

                    <AnimatePresence mode="wait">
                      {loginStatus && (
                        <motion.div
                          key={loginStatus.text}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className={`mt-4 rounded-xl px-4 py-3 text-xs flex items-start gap-2.5 border ${loginStatus.kind === 'error' ? 'bg-red-50 border-red-200 text-red-700' : loginStatus.kind === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-700'}`}
                        >
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{loginStatus.text}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Trust badges */}
                    <TrustBadges className="mt-5 justify-center" />

                    {/* Footer */}
                    <div className="mt-5 pt-5 border-t border-slate-200 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>New to BlockVault?</span>
                        <button
                          type="button"
                          onClick={() => navigate('/register')}
                          className="font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          Create a new account<ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                        <Lock className="w-3 h-3" />
                        <span>Protected by zero-knowledge cryptography ·</span>
                        <button
                          type="button"
                          onClick={() => setShowPrivacy(true)}
                          className="text-blue-500 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                        >
                          Privacy Policy
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>

              ) : (
                /* ───── REGISTER CARD ───── */
                <motion.div
                  key="register-card"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.25 }}
                  className="flat-panel rounded-2xl relative overflow-hidden shadow-sm"
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 transition-colors duration-200 ${regType === 'admin' ? 'bg-slate-900' : 'bg-blue-600'}`} />

                  <div className="p-6 sm:p-8">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                            <ShieldCheck className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-display font-bold text-sm text-slate-900">BlockVault</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">v8</span>
                        </div>
                        <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Create Account</h2>
                        <p className="text-xs text-slate-500 mt-1">Provision your personal BlockVault identity</p>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        <UserPlus className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>

                    {/* 3-Step Flat Progress Stepper */}
                    <div className="flex items-center justify-between mb-7">
                      {regSteps.map((s, idx) => {
                        const done = idx < currentStepIndex;
                        const active = idx === currentStepIndex;
                        return (
                          <div key={s.id} className="flex items-center flex-1 last:flex-none">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${done ? 'bg-emerald-600 border-emerald-600 text-white' : active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                                {done ? <Check className="w-3.5 h-3.5" /> : s.num}
                              </div>
                              <span className={`text-xs font-semibold hidden sm:inline ${active ? 'text-slate-900' : done ? 'text-emerald-700' : 'text-slate-400'}`}>
                                {s.label}
                              </span>
                            </div>
                            {idx < regSteps.length - 1 && (
                              <div className="flex-1 h-[2px] mx-3 bg-slate-200 rounded-full overflow-hidden">
                                <motion.div
                                  initial={false}
                                  animate={{ width: done ? '100%' : '0%' }}
                                  className="h-full bg-emerald-600"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <AnimatePresence mode="wait">
                      {/* STEP 1: Identity Form */}
                      {regStep === 'form' && (
                        <motion.form
                          key="step-form"
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 12 }}
                          transition={{ duration: 0.25 }}
                          onSubmit={handleCreate}
                          className="space-y-4"
                        >
                          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 border border-slate-200 relative">
                            {[
                              { id: 'user', label: 'User Account', icon: UserCheck },
                              { id: 'admin', label: 'Admin Account', icon: Crown }
                            ].map(tab => {
                              const active = regType === tab.id;
                              return (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => setRegType(tab.id)}
                                  className={`relative z-10 flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${active ? 'text-white' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                  {active && (
                                    <motion.div
                                      layoutId="regRolePill"
                                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                                      className={`absolute inset-0 rounded-lg -z-10 ${tab.id === 'admin' ? 'bg-slate-900' : 'bg-blue-600'}`}
                                    />
                                  )}
                                  <tab.icon className="w-4 h-4" />
                                  {tab.label}
                                </button>
                              );
                            })}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
                            <div className="relative">
                              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={regName}
                                onChange={e => setRegName(e.target.value)}
                                placeholder="Enter your full name"
                                required
                                className="flat-input w-full rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-slate-400"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                            <div className="relative">
                              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="email"
                                value={regEmail}
                                onChange={e => setRegEmail(e.target.value)}
                                placeholder="you@domain.com"
                                required
                                className="flat-input w-full rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-slate-400"
                              />
                            </div>
                          </div>

                          {/* Privacy Policy Checkbox */}
                          <div className="flex items-start gap-2.5 pt-1">
                            <input
                              id="agree-policy"
                              type="checkbox"
                              checked={agreedPolicy}
                              onChange={e => setAgreedPolicy(e.target.checked)}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 cursor-pointer accent-blue-600 shrink-0"
                            />
                            <label htmlFor="agree-policy" className="text-xs text-slate-600 leading-relaxed cursor-pointer select-none">
                              I have read and agree to the{' '}
                              <button
                                type="button"
                                onClick={() => setShowPrivacy(true)}
                                className="text-blue-600 hover:text-blue-700 hover:underline font-semibold cursor-pointer"
                              >
                                Privacy Policy
                              </button>
                              . I understand my hash key cannot be recovered if lost.
                            </label>
                          </div>

                          <motion.button
                            whileTap={{ scale: 0.99 }}
                            disabled={regLoading}
                            type="submit"
                            className={`w-full py-3.5 px-5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 mt-1 ${regType === 'admin' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-blue-600 hover:bg-blue-700'}`}
                          >
                            {regLoading ? (
                              <><Loader2 className="w-4 h-4 animate-spin" />Creating Account...</>
                            ) : (
                              <>Create Account<ArrowRight className="w-4 h-4" /></>
                            )}
                          </motion.button>
                        </motion.form>
                      )}

                      {/* STEP 2: Email Verify */}
                      {regStep === 'verify' && (
                        <motion.div
                          key="step-verify"
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          transition={{ duration: 0.25 }}
                          className="text-center space-y-5 py-2"
                        >
                          <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center">
                            <MailCheck className="w-7 h-7 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900">Verify Your Email</h3>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-sm mx-auto">
                              Click the verification link sent to your inbox (and check spam), then press the button below to generate your hash key.
                            </p>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.99 }}
                            disabled={regLoading}
                            onClick={handleVerified}
                            className="w-full py-3.5 px-5 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 transition-colors"
                          >
                            {regLoading ? (
                              <><Loader2 className="w-4 h-4 animate-spin" />Generating Hash Key...</>
                            ) : (
                              <><CheckCircle2 className="w-4 h-4" />I have verified my email</>
                            )}
                          </motion.button>
                        </motion.div>
                      )}

                      {/* Minting Lottie */}
                      {regStep === 'minting' && (
                        <motion.div
                          key="step-minting"
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ duration: 0.25 }}
                          className="flex flex-col items-center justify-center py-6 text-center"
                        >
                          <div className="w-56 h-56 sm:w-64 sm:h-64">
                            <DotLottieReact
                              src="https://lottie.host/2b6703a9-aa2c-4652-9bfa-7f1fb79304a2/DbQRzMZbIV.json"
                              loop
                              autoplay
                            />
                          </div>
                          <h3 className="text-base font-display font-bold text-slate-900 mt-2">Minting Your Hash Key</h3>
                          <p className="text-xs font-mono text-blue-600 mt-1">Sealing 256-bit cryptographic identity...</p>
                        </motion.div>
                      )}

                      {/* Green Tick */}
                      {regStep === 'tick' && (
                        <motion.div
                          key="step-tick"
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 360, damping: 24 }}
                          className="flex flex-col items-center justify-center py-14 text-center"
                        >
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                            className="w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center mb-4"
                          >
                            <Check className="w-10 h-10 text-white stroke-[3]" />
                          </motion.div>
                          <h3 className="text-lg font-display font-bold text-slate-900">Key Provisioned!</h3>
                          <p className="text-xs text-emerald-700 font-medium mt-1">Revealing your one-time hash key...</p>
                        </motion.div>
                      )}

                      {/* STEP 3: Key Result */}
                      {regStep === 'result' && (
                        <motion.div
                          key="step-result"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-4"
                        >
                          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-3">
                            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-900 leading-relaxed">
                              <span className="font-semibold">Save your hash key now!</span> It is shown only once and cannot be recovered if lost.
                            </div>
                          </div>

                          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                              <span className="flex items-center gap-1.5 text-slate-800">
                                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                                Your Master Hash Key
                              </span>
                              <span>SHA-256</span>
                            </div>
                            <code className="block w-full break-all font-mono text-xs sm:text-sm text-slate-900 bg-white rounded-lg p-3 border border-slate-200 select-all">
                              {showFull ? fullKey : maskedKey}
                            </code>
                            <div className="grid grid-cols-2 gap-2.5">
                              <button
                                type="button"
                                onClick={handleCopy}
                                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                              >
                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? 'Copied!' : 'Copy full key'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowFull(v => !v)}
                                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                              >
                                {showFull ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                {showFull ? 'Hide' : 'Show'}
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="w-full py-3.5 px-5 rounded-xl font-semibold text-sm text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                          >
                            Proceed to Login<ArrowRight className="w-4 h-4" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                      {regStatus && (
                        <motion.div
                          key={regStatus.text}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className={`mt-4 rounded-xl px-4 py-3 text-xs border ${regStatus.kind === 'error' ? 'bg-red-50 border-red-200 text-red-700' : regStatus.kind === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-800' : regStatus.kind === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-blue-50 border-blue-200 text-blue-700'}`}
                        >
                          {regStatus.text}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Trust badges */}
                    {regStep === 'form' && <TrustBadges className="mt-5 justify-center" />}

                    {/* Footer */}
                    <div className="mt-5 pt-5 border-t border-slate-200 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Already have an account?</span>
                        <button
                          type="button"
                          onClick={() => navigate('/login')}
                          className="font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          Login to Vault<ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                        <Lock className="w-3 h-3" />
                        <span>Zero-knowledge · No password storage ·</span>
                        <button
                          type="button"
                          onClick={() => setShowPrivacy(true)}
                          className="text-blue-500 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                        >
                          Privacy Policy
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* SLIDING ARCHITECTURAL DARK PANEL */}
        <motion.div
          initial={false}
          animate={{ x: isRegister ? '100%' : '0%' }}
          transition={springTransition}
          className="hidden lg:flex lg:w-1/2 lg:absolute lg:inset-y-0 lg:left-0 swiss-grid-dark text-white p-12 xl:p-16 flex-col justify-between border-x border-slate-800 z-20"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">BlockVault</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">v8</span>
          </div>

          <AnimatePresence mode="wait">
            {!isRegister ? (
              <motion.div
                key="info-login"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-800/90 border border-slate-700 text-xs font-mono text-blue-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    TRON SHASTA • ZERO-KNOWLEDGE
                  </div>
                  <h1 className="text-4xl font-display font-bold leading-[1.15] tracking-tight">
                    Decentralized 4-Block Encrypted Storage.
                  </h1>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-md">
                    Every file is split into four equal shards, sealed client-side with AES-256-GCM, pinned to IPFS via Pinata, and anchored on the TRON Shasta smart contract.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Layers, title: '01. 4-Block Split', desc: 'Deterministic sharding' },
                    { icon: Lock, title: '02. AES-256-GCM', desc: 'Client-side encryption' },
                    { icon: Database, title: '03. IPFS Pinata', desc: 'Distributed block CIDs' },
                    { icon: Cpu, title: '04. TRON Shasta', desc: 'Immutable hash registry' }
                  ].map(item => (
                    <div key={item.title} className="rounded-xl bg-slate-800/70 border border-slate-700/80 p-4">
                      <item.icon className="w-4 h-4 text-blue-400 mb-2" />
                      <div className="text-xs font-semibold text-white">{item.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="info-register"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-800/90 border border-slate-700 text-xs font-mono text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  256-BIT KEY PROVISIONING
                </div>
                <h1 className="text-4xl font-display font-bold leading-[1.15] tracking-tight">
                  One-Time Master Hash Key Provisioning.
                </h1>
                <p className="text-sm text-slate-400 leading-relaxed max-w-md">
                  Your account generates a unique 256-bit cryptographic key after email verification. It serves as both your login credential and your AES-256-GCM encryption secret.
                </p>
                <div className="space-y-3 pt-2">
                  {[
                    '1. Register name, email & requested role',
                    '2. Verify ownership via email confirmation link',
                    '3. Mint & securely store your one-time hash key'
                  ].map(item => (
                    <div key={item} className="rounded-xl bg-slate-800/70 border border-slate-700/80 px-4 py-3 text-xs font-mono text-slate-200">
                      {item}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            <div className="text-xs text-slate-500 font-mono">
              {isRegister
                ? 'NO PASSWORD RECOVERY • SAVE YOUR KEY SAFELY'
                : 'SHA-256 KEY AUTHENTICATION • CLIENT-SIDE CRYPTOGRAPHY'}
            </div>
            <button
              type="button"
              onClick={() => setShowPrivacy(true)}
              className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <FileText className="w-3 h-3" />
              Privacy Policy & Terms
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}
