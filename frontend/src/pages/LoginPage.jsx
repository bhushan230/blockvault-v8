import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Database
} from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { auth, db } from '../lib/firebase';
import { sha256 } from '../lib/core';

export default function LoginPage() {
  const navigate = useNavigate();
  const [type, setType] = useState('user');
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [fingerprint, setFingerprint] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let active = true;
    const trimmed = key.trim().toLowerCase();
    if (!trimmed) {
      setFingerprint('');
      return;
    }
    sha256(new TextEncoder().encode(trimmed)).then(hash => {
      if (active) setFingerprint(hash.slice(0, 8) + '...' + hash.slice(-6));
    });
    return () => {
      active = false;
    };
  }, [key]);

  // Preserved exact login logic with 3000ms minimum delay for Lottie animation
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setStatus({ kind: 'info', text: 'Checking...' });
    try {
      const minDelay = new Promise(resolve => setTimeout(resolve, 3000));
      const cleanKey = key.trim().toLowerCase();
      const id = await sha256(new TextEncoder().encode(cleanKey));
      const found = await db.collection('keys').doc(id).get();
      if (!found.exists) throw new Error('Unknown key');
      const { user } = await auth.signInWithEmailAndPassword(found.data().email, cleanKey);
      if (!user.emailVerified) {
        await user.sendEmailVerification().catch(() => {});
        await auth.signOut();
        setStatus({
          kind: 'warn',
          text: 'Verify your email first. Check your inbox and spam folder.'
        });
        setLoading(false);
        return;
      }
      if (type === 'admin') {
        const me = (await db.collection('users').doc(user.uid).get()).data();
        if (me?.role !== 'admin') {
          await auth.signOut();
          setStatus({ kind: 'error', text: 'This account is not an approved admin.' });
          setLoading(false);
          return;
        }
      }
      await minDelay;
      navigate('/');
    } catch (err) {
      setStatus({ kind: 'error', text: 'Login failed. Check your hash key.' });
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-[#f8fafc]">
      {/* Left Architectural Panel (Dark Slate Flat) */}
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

        <div className="space-y-8">
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

          {/* 4-Step Flat Pipeline Graphic */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Layers, title: '01. 4-Block Split', desc: 'Deterministic sharding' },
              { icon: Lock, title: '02. AES-256-GCM', desc: 'Client-side encryption' },
              { icon: Database, title: '03. IPFS Pinata', desc: 'Distributed block CIDs' },
              { icon: Cpu, title: '04. TRON Shasta', desc: 'Immutable hash registry' }
            ].map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + idx * 0.08 }}
                className="rounded-xl bg-slate-800/70 border border-slate-700/80 p-4"
              >
                <item.icon className="w-4 h-4 text-blue-400 mb-2" />
                <div className="text-xs font-semibold text-white">{item.title}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          SHA-256 KEY AUTHENTICATION • CLIENT-SIDE CRYPTOGRAPHY
        </div>
      </div>

      {/* Right Form Stage (Crisp Light Flat) */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile Brand Header */}
          <div className="flex lg:hidden items-center gap-2.5 mb-6">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-slate-900">BlockVault v8</span>
          </div>

          <div className="flat-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden">
            {/* Flat Design Lottie Loading Overlay after login attempt */}
            <AnimatePresence>
              {loading && (
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
                  <p className="text-sm font-display font-bold text-slate-900 mt-2">
                    Verifying Cryptographic Key
                  </p>
                  <p className="text-xs font-mono text-blue-600 mt-1">
                    Authenticating with Vault...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top Solid Accent Bar */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 transition-colors duration-200 ${
                type === 'admin' ? 'bg-slate-900' : 'bg-blue-600'
              }`}
            />

            <div className="mb-6">
              <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
                Sign in to Vault
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your 64-character cryptographic hash key to continue
              </p>
            </div>

            {/* Flat Role Switcher */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 border border-slate-200 mb-6 relative">
              {[
                { id: 'user', label: 'User Login', icon: UserCheck },
                { id: 'admin', label: 'Admin Login', icon: Crown }
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
                        layoutId="loginRolePill"
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

            <form onSubmit={handleSubmit} className="space-y-5">
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
                    type={showKey ? 'text' : 'password'}
                    value={key}
                    onChange={e => setKey(e.target.value)}
                    placeholder="Paste your 64-character hash key"
                    required
                    className="flat-input w-full rounded-xl pl-10 pr-11 py-3 text-sm font-mono placeholder:text-slate-400 placeholder:font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                    aria-label={showKey ? 'Hide hash key' : 'Show hash key'}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.99 }}
                disabled={loading}
                type="submit"
                className={`w-full py-3.5 px-5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 ${
                  type === 'admin'
                    ? 'bg-slate-900 hover:bg-slate-800'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying Key...
                  </>
                ) : (
                  <>
                    Unlock Vault
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            <AnimatePresence mode="wait">
              {status && (
                <motion.div
                  key={status.text}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className={`mt-4 rounded-xl px-4 py-3 text-xs flex items-start gap-2.5 border ${
                    status.kind === 'error'
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : status.kind === 'warn'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-blue-50 border-blue-200 text-blue-700'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{status.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 pt-5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>New to BlockVault?</span>
              <Link
                to="/register"
                className="font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1"
              >
                Create a new account
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
