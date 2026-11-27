import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  LogOut,
  Wallet,
  UploadCloud,
  KeyRound,
  FileCode2,
  Download,
  RefreshCw,
  Users,
  Database,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Boxes,
  Loader2,
  Copy,
  Check,
  UserCog,
  Ban,
  Unlock
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { sha256 } from '../lib/core';
import { decryptText, encryptText, fetchFile, storeFile, text } from '../lib/storage';

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function truncateMiddle(str, start = 6, end = 5) {
  if (!str || str.length <= start + end + 3) return str;
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [uid, setUid] = useState(null);
  const [me, setMe] = useState(null);
  const [authError, setAuthError] = useState('');

  const [hashKey, setHashKey] = useState('');
  const [showHashKey, setShowHashKey] = useState(false);
  const [jwt, setJwt] = useState('');
  const [showJwt, setShowJwt] = useState(false);

  const [walletMsg, setWalletMsg] = useState('');
  const [fileMsg, setFileMsg] = useState('');
  const [staffMsg, setStaffMsg] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [activeBlock, setActiveBlock] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const [myFiles, setMyFiles] = useState([]);
  const [decryptedNames, setDecryptedNames] = useState({});
  const [userList, setUserList] = useState([]);
  const [adminFiles, setAdminFiles] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  const clearSensitiveState = useCallback(() => {
    setHashKey('');
    setJwt('');
    setShowHashKey(false);
    setShowJwt(false);
    setMyFiles([]);
    setDecryptedNames({});
    setUserList([]);
    setAdminFiles([]);
    setWalletMsg('');
    setFileMsg('');
    setStaffMsg('');
  }, []);

  const usersRef = useCallback(() => db.collection('users'), []);

  const showMine = useCallback(
    async currentUid => {
      const targetUid = currentUid || uid;
      if (!targetUid) return;
      const result = await usersRef().doc(targetUid).collection('myfiles').get();
      setMyFiles(result.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    },
    [uid, usersRef]
  );

  const showUsers = useCallback(async () => {
    const result = await usersRef().get();
    setUserList(result.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, [usersRef]);

  const showFiles = useCallback(async () => {
    const result = await db.collection('files').get();
    setAdminFiles(result.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, []);

  // Preserved exact auth guard & initial data loading
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async user => {
      if (!user || !user.emailVerified) {
        navigate('/login', { replace: true });
        return;
      }
      setUid(user.uid);
      try {
        const profile = (await usersRef().doc(user.uid).get()).data();
        if (!profile) throw new Error('Account details not found.');
        if (profile.blocked) throw new Error('Your account is blocked.');
        setMe(profile);
        await showMine(user.uid);
        if (profile.role === 'admin' || profile.role === 'moderator') {
          await showUsers();
        }
        if (profile.role === 'admin') {
          await showFiles();
        }
      } catch (err) {
        setAuthError(err.message);
      }
    });
    return () => unsub();
  }, [navigate, showFiles, showMine, showUsers, usersRef]);

  const handleLogout = useCallback(() => {
    clearSensitiveState();
    auth.signOut();
  }, [clearSensitiveState]);

  // Wipe sensitive state on unmount or tab close
  useEffect(() => {
    window.addEventListener('beforeunload', clearSensitiveState);
    return () => {
      window.removeEventListener('beforeunload', clearSensitiveState);
      clearSensitiveState();
    };
  }, [clearSensitiveState]);

  // Inactivity Auto-Lock: clear keys after 5 min, sign out after 15 min
  useEffect(() => {
    if (!me) return;
    let keyTimer;
    let logoutTimer;

    const resetTimers = () => {
      clearTimeout(keyTimer);
      clearTimeout(logoutTimer);
      keyTimer = setTimeout(() => {
        setHashKey(prev => {
          if (prev) setFileMsg('Security Auto-Lock: Hash Key and Pinata JWT cleared after 5 minutes of inactivity.');
          return '';
        });
        setJwt('');
        setShowHashKey(false);
        setShowJwt(false);
        setDecryptedNames({});
      }, 5 * 60 * 1000);

      logoutTimer = setTimeout(() => {
        handleLogout();
      }, 15 * 60 * 1000);
    };

    const events = ['mousemove', 'keydown', 'pointerdown', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, resetTimers, { passive: true }));
    resetTimers();

    return () => {
      clearTimeout(keyTimer);
      clearTimeout(logoutTimer);
      events.forEach(ev => window.removeEventListener(ev, resetTimers));
    };
  }, [me, handleLogout]);

  // Decrypt encrypted filenames locally when hashKey is provided
  useEffect(() => {
    let active = true;
    const clean = hashKey.trim().toLowerCase();
    if (!clean || myFiles.length === 0) {
      setDecryptedNames({});
      return;
    }
    (async () => {
      const next = {};
      for (const f of myFiles) {
        if (f.fileName?.startsWith('enc:')) {
          try {
            next[f.id] = await decryptText(clean, f.fileName);
          } catch {
            // wrong or partial key — leave hidden
          }
        }
      }
      if (active) setDecryptedNames(next);
    })();
    return () => {
      active = false;
    };
  }, [hashKey, myFiles]);

  const handleCopyText = async (value, id) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  // Preserved exact wallet connection logic
  const saveWallet = async (field, label, address) => {
    await usersRef().doc(uid).update({ [field]: address });
    setMe(prev => (prev ? { ...prev, [field]: address } : prev));
    setWalletMsg(`${label} connected: ${address}`);
  };

  const connectMetaMask = async () => {
    try {
      if (!window.ethereum) throw new Error('MetaMask not found.');
      const [address] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      await saveWallet('metamask', 'MetaMask', address);
    } catch (err) {
      setWalletMsg(err.message);
    }
  };

  const connectTronLink = async () => {
    try {
      if (!window.tronLink) throw new Error('TronLink not found.');
      const reply = await window.tronLink.request({ method: 'tron_requestAccounts' });
      const address = window.tronWeb?.defaultAddress?.base58;
      if (!address || (reply?.code && reply.code !== 200)) {
        throw new Error('Unlock TronLink, approve the request and try again.');
      }
      await saveWallet('tronlink', 'TronLink', address);
    } catch (err) {
      setWalletMsg(err.message);
    }
  };

  // Preserved exact key ownership verification
  const myKey = async () => {
    const clean = hashKey.trim().toLowerCase();
    if (!clean) throw new Error('Enter your hash key first.');
    const found = await db.collection('keys').doc(await sha256(text(clean))).get();
    if (!found.exists || found.data().uid !== uid) {
      throw new Error('That is not your hash key.');
    }
    return clean;
  };

  const progress = msg => {
    setFileMsg(msg);
    const match = msg.match(/block (\d) of 4/i);
    if (match) {
      setActiveBlock(Number(match[1]));
    } else if (msg.toLowerCase().includes('blockchain') || msg.toLowerCase().includes('stored')) {
      setActiveBlock(4);
    }
  };

  // Preserved exact upload logic
  const processFile = async file => {
    if (!file) return;
    setIsProcessing(true);
    setActiveBlock(0);
    try {
      const key = await myKey();
      const cleanJwt = jwt.trim();
      if (!cleanJwt) throw new Error('Enter your Pinata JWT.');
      const { id, parts, txHash } = await storeFile(file, key, cleanJwt, progress);
      const encryptedName = await encryptText(key, file.name);
      progress(`On the blockchain (tx ${txHash}). Saving to your list...`);
      await usersRef().doc(uid).collection('myfiles').doc(id).set({
        fileName: encryptedName,
        size: file.size,
        txHash
      });
      await db.collection('files').doc(id).set({
        uid,
        email: me.email,
        fileName: encryptedName,
        size: file.size,
        parts,
        txHash
      });
      progress(`Stored. Transaction: ${txHash}`);
      await showMine(uid);
      if (me.role === 'admin') await showFiles();
    } catch (err) {
      progress(err.shortMessage || err.message);
      setActiveBlock(0);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Preserved exact download logic + decrypted filename & object URL revocation
  const handleDownload = async f => {
    setIsProcessing(true);
    setActiveBlock(0);
    try {
      const key = await myKey();
      const blob = await fetchFile(f.id, key, progress);
      const originalName = f.fileName?.startsWith('enc:')
        ? await decryptText(key, f.fileName)
        : f.fileName;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      progress('All 4 blocks verified. File downloaded.');
    } catch (err) {
      progress(
        err.name === 'OperationError'
          ? 'Wrong key for this file.'
          : err.shortMessage || err.message
      );
      setActiveBlock(0);
    } finally {
      setIsProcessing(false);
    }
  };

  // Preserved exact user management logic
  const changeUser = async (id, data) => {
    try {
      await usersRef().doc(id).update(data);
      await showUsers();
      setStaffMsg('Saved.');
    } catch (err) {
      setStaffMsg(err.message);
    }
  };

  if (authError) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="flat-panel rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
          <p className="text-sm text-red-600">{authError}</p>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sm font-semibold text-white cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-xs font-mono text-slate-500 tracking-wider uppercase">
            Synchronizing Vault...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base tracking-tight text-slate-900">
                  BlockVault
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  v8
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                AES-256 • 4-Block IPFS • TRON Shasta
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-slate-700 font-medium">{me.email}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                  me.role === 'admin'
                    ? 'bg-slate-900 text-white'
                    : me.role === 'moderator'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                {me.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Executive Telemetry Strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            {
              label: 'Encrypted Files',
              value: String(myFiles.length),
              sub: '4-block sharded',
              accent: 'text-blue-600'
            },
            {
              label: 'Vault Volume',
              value: formatBytes(myFiles.reduce((acc, f) => acc + (f.size || 0), 0)),
              sub: 'IPFS Pinata pinned',
              accent: 'text-emerald-600'
            },
            {
              label: 'Cipher Suite',
              value: 'AES-256-GCM',
              sub: 'Zero-knowledge client',
              accent: 'text-slate-900'
            },
            {
              label: 'Settlement Layer',
              value: 'TRON Shasta',
              sub: me.tronlink ? 'TronLink linked' : 'Wallet standby',
              accent: 'text-teal-700'
            }
          ].map(stat => (
            <div key={stat.label} className="flat-panel rounded-xl px-4 py-3.5">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                {stat.label}
              </div>
              <div className={`text-lg sm:text-xl font-display font-bold mt-1 ${stat.accent}`}>
                {stat.value}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </motion.div>

        {/* Top Row: Wallets & 2D 4-Block Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Wallets Card */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="lg:col-span-5 flat-panel rounded-2xl p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                  <Wallet className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Connected Wallets</h2>
                  <p className="text-xs text-slate-500">Shasta Testnet & EVM Identity</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <button
                  onClick={connectMetaMask}
                  className="flat-card rounded-xl p-4 text-left hover:border-amber-400 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-700">MetaMask</span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        me.metamask ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                  </div>
                  <div className="text-[11px] font-mono text-slate-600 truncate">
                    {me.metamask ? truncateMiddle(me.metamask, 7, 5) : 'Click to connect'}
                  </div>
                </button>

                <button
                  onClick={connectTronLink}
                  className="flat-card rounded-xl p-4 text-left hover:border-blue-500 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-700">TronLink</span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        me.tronlink ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                  </div>
                  <div className="text-[11px] font-mono text-slate-600 truncate">
                    {me.tronlink ? truncateMiddle(me.tronlink, 7, 5) : 'Click to connect'}
                  </div>
                </button>
              </div>
            </div>

            {walletMsg && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-xs font-mono text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 break-all"
              >
                {walletMsg}
              </motion.p>
            )}
          </motion.section>

          {/* 2D Animated 4-Block Sharding Pipeline */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.06 }}
            className="lg:col-span-7 flat-panel rounded-2xl p-6 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-blue-600" />
                  4-Block Sharding Pipeline
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time status of AES-256 encrypted file shards
                </p>
              </div>
              <span
                className={`text-[11px] font-mono px-2.5 py-1 rounded-md border font-semibold ${
                  isProcessing
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {isProcessing ? `BLOCK ${activeBlock || 1}/4 ACTIVE` : 'STANDBY'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
              {[1, 2, 3, 4].map(num => {
                const lit = activeBlock >= num;
                const current = isProcessing && activeBlock === num;
                return (
                  <motion.div
                    key={num}
                    animate={{
                      scale: current ? 1.03 : 1,
                      borderColor: lit ? '#059669' : '#e2e8f0'
                    }}
                    className={`rounded-xl p-4 border text-center transition-colors ${
                      lit ? 'bg-emerald-50' : 'bg-slate-50'
                    }`}
                  >
                    <div
                      className={`mx-auto w-9 h-9 rounded-lg flex items-center justify-center mb-2 font-mono text-xs font-bold ${
                        lit
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-500'
                      }`}
                    >
                      0{num}
                    </div>
                    <div className={`text-xs font-semibold ${lit ? 'text-emerald-800' : 'text-slate-700'}`}>
                      Shard 0{num}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                      {lit ? 'VERIFIED' : 'READY'}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <motion.div
                initial={false}
                animate={{ width: `${(activeBlock / 4) * 100}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-emerald-600"
              />
            </div>
          </motion.section>
        </div>

        {/* Middle Row: Upload & Encrypt + My Files */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Encrypt & Upload Card */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="lg:col-span-5 flat-panel rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                <Lock className="w-4 h-4 text-slate-800" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Encrypt & Store File</h2>
                <p className="text-xs text-slate-500">Max 20 MB • Split into 4 IPFS blocks</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Your Hash Key
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showHashKey ? 'text' : 'password'}
                    value={hashKey}
                    onChange={e => setHashKey(e.target.value)}
                    placeholder="Encrypts and decrypts your files"
                    autoComplete="off"
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    data-lpignore="true"
                    className="flat-input w-full rounded-xl pl-10 pr-10 py-2.5 text-xs font-mono placeholder:text-slate-400 placeholder:font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowHashKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showHashKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pinata JWT (Upload Only)
                </label>
                <div className="relative">
                  <FileCode2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showJwt ? 'text' : 'password'}
                    value={jwt}
                    onChange={e => setJwt(e.target.value)}
                    placeholder="Paste Pinata JWT token"
                    autoComplete="off"
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    data-lpignore="true"
                    className="flat-input w-full rounded-xl pl-10 pr-10 py-2.5 text-xs font-mono placeholder:text-slate-400 placeholder:font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowJwt(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showJwt ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Drag & Drop File Zone */}
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDragging(false);
                if (!isProcessing && e.dataTransfer.files?.[0]) {
                  processFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-300 hover:border-blue-500 bg-slate-50'
              } ${isProcessing ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                disabled={isProcessing}
                onChange={e => processFile(e.target.files?.[0])}
              />
              {isProcessing ? (
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
              ) : (
                <UploadCloud className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              )}
              <p className="text-sm font-semibold text-slate-900">
                {isProcessing ? 'Processing Cryptographic Pipeline...' : 'Drop file or click to upload'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Encrypted locally before leaving your browser
              </p>
            </div>

            <AnimatePresence mode="wait">
              {fileMsg && (
                <motion.div
                  key={fileMsg}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg bg-blue-50 border border-blue-200 px-3.5 py-2.5 text-xs text-blue-800 font-mono break-all"
                >
                  {fileMsg}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          {/* My Files Card */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.14 }}
            className="lg:col-span-7 flat-panel rounded-2xl p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">My Encrypted Files</h2>
                  <p className="text-xs text-slate-500">
                    {myFiles.length} {myFiles.length === 1 ? 'record' : 'records'} anchored on-chain
                  </p>
                </div>
              </div>
            </div>

            {myFiles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
                <Database className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-600">No files yet.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your hash key & Pinata JWT to upload your first file.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
                {myFiles.map((f, idx) => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="flat-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-300 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-slate-900 truncate flex items-center gap-1.5">
                        {f.fileName?.startsWith('enc:') ? (
                          decryptedNames[f.id] ? (
                            decryptedNames[f.id]
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-slate-500 font-mono text-xs">
                              <Lock className="w-3.5 h-3.5 text-blue-600" />
                              [Encrypted Filename — enter hash key to reveal]
                            </span>
                          )
                        ) : (
                          f.fileName
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-mono text-slate-500">
                        <span>{formatBytes(f.size)}</span>
                        {f.txHash && (
                          <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-blue-700">
                            tx: {truncateMiddle(f.txHash, 8, 6)}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      disabled={isProcessing}
                      onClick={() => handleDownload(f)}
                      className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>
        </div>

        {/* Staff Panel: Manage Users (Admin & Moderator) */}
        {(me.role === 'admin' || me.role === 'moderator') && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.18 }}
            className="flat-panel rounded-2xl p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <Users className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Manage Users</h2>
                  <p className="text-xs text-slate-500">
                    Role governance & access control ({userList.length} accounts)
                  </p>
                </div>
              </div>
              {staffMsg && (
                <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md">
                  {staffMsg}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {userList.map(u => {
                const mayBlock = u.id !== uid && (me.role === 'admin' || u.role === 'user');
                return (
                  <div
                    key={u.id}
                    className="flat-card rounded-xl p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-slate-900 truncate">{u.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-semibold">
                            {u.role}
                          </span>
                          {u.blocked && (
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 font-semibold">
                              BLOCKED
                            </span>
                          )}
                          {u.adminRequest && u.role !== 'admin' && (
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 font-semibold">
                              ASKS FOR ADMIN
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      {(u.metamask || u.tronlink) && (
                        <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-mono text-slate-600">
                          {u.metamask && (
                            <span className="px-2 py-0.5 rounded bg-white border border-slate-200">
                              MM: {truncateMiddle(u.metamask, 5, 4)}
                            </span>
                          )}
                          {u.tronlink && (
                            <span className="px-2 py-0.5 rounded bg-white border border-slate-200">
                              TL: {truncateMiddle(u.tronlink, 5, 4)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                      {mayBlock && (
                        <button
                          onClick={() => changeUser(u.id, { blocked: !u.blocked })}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                            u.blocked
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-red-600 hover:bg-red-700 text-white'
                          }`}
                        >
                          {u.blocked ? <Unlock className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                          {u.blocked ? 'Unblock' : 'Block'}
                        </button>
                      )}
                      {me.role === 'admin' &&
                        u.id !== uid &&
                        ['user', 'moderator', 'admin']
                          .filter(r => r !== u.role)
                          .map(role => (
                            <button
                              key={role}
                              onClick={() => changeUser(u.id, { role })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
                            >
                              <UserCog className="w-3 h-3" />
                              Make {role}
                            </button>
                          ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Admin Panel: Block Records Explorer */}
        {me.role === 'admin' && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.22 }}
            className="flat-panel rounded-2xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                  <Database className="w-4 h-4 text-slate-800" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Block Records (Admin Only)</h2>
                  <p className="text-xs text-slate-500">
                    On-chain 4-block shard hashes & IPFS CIDs
                  </p>
                </div>
              </div>

              <button
                onClick={() => showFiles().catch(err => setFileMsg(err.message))}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>

            {adminFiles.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No records yet.</p>
            ) : (
              <div className="space-y-6">
                {adminFiles.map(f => {
                  let start = 0;
                  return (
                    <div key={f.id} className="flat-card rounded-xl p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                        <div>
                          <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            {f.fileName?.startsWith('enc:') ? (
                              <span className="inline-flex items-center gap-1.5 text-slate-700 font-mono text-xs">
                                <Lock className="w-3.5 h-3.5 text-blue-600" />
                                [Encrypted Filename]
                              </span>
                            ) : (
                              f.fileName
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {f.email} • {f.size} bytes • {f.parts?.length || 0} block(s)
                          </div>
                        </div>
                        {f.txHash && (
                          <button
                            onClick={() => handleCopyText(f.txHash, `tx-${f.id}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-mono text-blue-700 cursor-pointer hover:border-blue-300"
                          >
                            {copiedId === `tx-${f.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            tx: {truncateMiddle(f.txHash, 8, 6)}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {(f.parts || []).map((p, i) => {
                          const blockStart = start + 1;
                          const blockEnd = start + p.bytes;
                          start += p.bytes;
                          return (
                            <div
                              key={i}
                              className="rounded-lg bg-white border border-slate-200 p-3.5 space-y-1.5 text-[11px]"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-blue-700">Block {i + 1}</span>
                                <span className="font-mono text-slate-700 font-semibold">
                                  {((p.bytes / f.size) * 100).toFixed(2)}%
                                </span>
                              </div>
                              <div className="text-slate-700">
                                {p.bytes} bytes ({(p.bytes / 1024).toFixed(2)} KB)
                              </div>
                              <div className="text-slate-500">
                                Bytes {blockStart} to {blockEnd}
                              </div>
                              <div className="pt-1 border-t border-slate-100 font-mono text-[10px] text-slate-600 break-all">
                                <span className="text-slate-400">SHA-256:</span> {p.hash}
                              </div>
                              <div className="font-mono text-[10px] text-emerald-700 break-all">
                                <span className="text-slate-400">IPFS CID:</span>{' '}
                                {p.cid || 'not stored'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.section>
        )}
      </main>
    </div>
  );
}
