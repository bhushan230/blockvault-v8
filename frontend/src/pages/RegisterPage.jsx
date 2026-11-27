import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  Mail,
  User,
  Crown,
  UserCheck,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  EyeOff,
  ShieldAlert,
  Loader2,
  ShieldCheck,
  MailCheck,
  KeyRound
} from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { auth, db } from '../lib/firebase';
import { sha256 } from '../lib/core';

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));

export default function RegisterPage() {
  const [step, setStep] = useState('form'); // 'form' | 'verify' | 'minting' | 'tick' | 'result'
  const [type, setType] = useState('user');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const [fullKey, setFullKey] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [showFull, setShowFull] = useState(false);
  const [copied, setCopied] = useState(false);

  // Preserved exact unfinished signup resume logic
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async user => {
      unsubscribe && unsubscribe();
      if (!user) return;
      try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists && doc.data().keySet === false) {
          setStep('verify');
          setStatus({
            kind: 'info',
            text: 'Click the link in your email, then press the button.'
          });
        }
      } catch (err) {
        console.error(err);
      }
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  // Preserved exact create account logic
  const handleCreate = async e => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setStatus({ kind: 'error', text: 'Enter your name.' });
      return;
    }
    setLoading(true);
    setStatus({ kind: 'info', text: 'Creating account...' });
    try {
      const { user } = await auth.createUserWithEmailAndPassword(trimmedEmail, random());
      await db.collection('users').doc(user.uid).set({
        name: trimmedName,
        email: trimmedEmail,
        role: 'user',
        blocked: false,
        adminRequest: type === 'admin',
        keySet: false
      });
      await user.sendEmailVerification();
      setStep('verify');
      setStatus({
        kind: 'info',
        text: 'Click the link in your email, then press the button.'
      });
    } catch (err) {
      setStatus({ kind: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Preserved exact verification & key generation logic
  const handleVerified = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      await user.reload();
      if (!auth.currentUser.emailVerified) {
        setStatus({
          kind: 'warn',
          text: 'Email not verified yet. Check inbox and spam.'
        });
        setLoading(false);
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

      // Show Lottie animation with a delay, then green tick, then reveal the key
      setStep('minting');
      setStatus(null);
      await new Promise(resolve => setTimeout(resolve, 2600));
      setStep('tick');
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStep('result');
      setStatus({
        kind: 'success',
        text: 'Account ready. Copy your key now, then login.'
      });
    } catch (err) {
      setStatus({ kind: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullKey);
      setCopied(true);
      setStatus({ kind: 'success', text: 'Key copied. Save it somewhere safe.' });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setStatus({ kind: 'warn', text: 'Copy failed. Use Show and copy it by hand.' });
    }
  };

  const steps = [
    { id: 'form', num: 1, label: 'Identity' },
    { id: 'verify', num: 2, label: 'Verify Email' },
    { id: 'result', num: 3, label: 'Hash Key' }
  ];
  const currentStepIndex =
    step === 'minting' || step === 'tick'
      ? 2
      : steps.findIndex(s => s.id === step);

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-[#f8fafc]">
      {/* Left Architectural Panel */}
      <div className="hidden lg:flex lg:col-span-5 swiss-grid-dark text-white p-10 xl:p-14 flex-col justify-between border-r border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">BlockVault</span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            v8
          </span>
        </div>

        <div className="space-y-6">
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
              <div
                key={item}
                className="rounded-xl bg-slate-800/70 border border-slate-700/80 px-4 py-3 text-xs font-mono text-slate-200"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          NO PASSWORD RECOVERY • SAVE YOUR KEY SAFELY
        </div>
      </div>

      {/* Right Onboarding Stage */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg"
        >
          <div className="flat-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden">
            <div
              className={`absolute top-0 left-0 right-0 h-1 transition-colors duration-200 ${
                type === 'admin' ? 'bg-slate-900' : 'bg-blue-600'
              }`}
            />

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
                  Create Account
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Provision your personal BlockVault identity
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </div>
            </div>

            {/* 3-Step Flat Progress Stepper */}
            <div className="flex items-center justify-between mb-7">
              {steps.map((s, idx) => {
                const done = idx < currentStepIndex;
                const active = idx === currentStepIndex;
                return (
                  <div key={s.id} className="flex items-center flex-1 last:flex-none">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                          done
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : active
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}
                      >
                        {done ? <Check className="w-3.5 h-3.5" /> : s.num}
                      </div>
                      <span
                        className={`text-xs font-semibold hidden sm:inline ${
                          active ? 'text-slate-900' : done ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {idx < steps.length - 1 && (
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
              {step === 'form' && (
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
                      const active = type === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setType(tab.id)}
                          className={`relative z-10 flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                            active ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {active && (
                            <motion.div
                              layoutId="regRolePill"
                              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                              className={`absolute inset-0 rounded-lg -z-10 ${
                                tab.id === 'admin' ? 'bg-slate-900' : 'bg-blue-600'
                              }`}
                            />
                          )}
                          <tab.icon className="w-4 h-4" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Enter your full name"
                        required
                        className="flat-input w-full rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        required
                        className="flat-input w-full rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.99 }}
                    disabled={loading}
                    type="submit"
                    className={`w-full py-3.5 px-5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 mt-2 ${
                      type === 'admin'
                        ? 'bg-slate-900 hover:bg-slate-800'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </motion.form>
              )}

              {step === 'verify' && (
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
                    disabled={loading}
                    onClick={handleVerified}
                    className="w-full py-3.5 px-5 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 transition-colors"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating Hash Key...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        I have verified my email
                      </>
                    )}
                  </motion.button>
                </motion.div>
              )}

              {step === 'minting' && (
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
                  <h3 className="text-base font-display font-bold text-slate-900 mt-2">
                    Minting Your Hash Key
                  </h3>
                  <p className="text-xs font-mono text-blue-600 mt-1">
                    Sealing 256-bit cryptographic identity...
                  </p>
                </motion.div>
              )}

              {step === 'tick' && (
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
                  <h3 className="text-lg font-display font-bold text-slate-900">
                    Key Provisioned!
                  </h3>
                  <p className="text-xs text-emerald-700 font-medium mt-1">
                    Revealing your one-time hash key...
                  </p>
                </motion.div>
              )}

              {step === 'result' && (
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

                  <Link
                    to="/login"
                    className="w-full py-3.5 px-5 rounded-xl font-semibold text-sm text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                  >
                    Proceed to Login
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {status && (
                <motion.div
                  key={status.text}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className={`mt-4 rounded-xl px-4 py-3 text-xs border ${
                    status.kind === 'error'
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : status.kind === 'warn'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : status.kind === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-blue-50 border-blue-200 text-blue-700'
                  }`}
                >
                  {status.text}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 pt-5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Already have an account?</span>
              <Link
                to="/login"
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1"
              >
                Login to Vault
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
