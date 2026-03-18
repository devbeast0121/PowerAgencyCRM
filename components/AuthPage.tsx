import React, { useState, useEffect } from 'react';
import { Layout, Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  auth,
  signInWithGoogle,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  db, appId, collection, doc, updateDoc
} from '../firebase';
import { updateProfile } from 'firebase/auth';

export const AuthPage = ({ onGoogleLogin }: { onGoogleLogin?: (accessToken: string) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invite token state
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteUid, setInviteUid] = useState<string | null>(null);
  const [inviteMid, setInviteMid] = useState<string | null>(null);
  const [inviteEmailLocked, setInviteEmailLocked] = useState(false);

  // On mount, check for ?invite=TOKEN&uid=UID&mid=MID in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    const uid = params.get('uid');
    const mid = params.get('mid');
    if (token && uid && mid) {
      setInviteToken(token);
      setInviteUid(uid);
      setInviteMid(mid);
      setIsLogin(false); // Switch to signup
      setInviteEmailLocked(true);
      // Try to pre-fill email from localStorage if set
      const savedEmail = localStorage.getItem(`invite_email_${token}`);
      if (savedEmail) setEmail(savedEmail);
    }
  }, []);

  const markInviteAccepted = async (acceptedByEmail: string) => {
    if (!inviteUid || !inviteMid) return;
    try {
      await updateDoc(
        doc(db, 'artifacts', appId, 'users', inviteUid, 'team_members', inviteMid),
        { inviteStatus: 'accepted', acceptedAt: new Date().toISOString(), acceptedByEmail }
      );
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } catch (e) { console.error('Failed to mark invite accepted', e); }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (!isLogin && !fullName) return;

    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        // If logging in via invite link, still mark accepted
        if (inviteToken) await markInviteAccepted(email);
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        if (user && fullName && user.updateProfile) {
            await user.updateProfile({ displayName: fullName });
        } else if (user && fullName) {
            user.displayName = fullName;
        }
        // Mark invite accepted
        if (inviteToken) {
          await markInviteAccepted(email);
        } else {
          // Send welcome email only for non-invite signups
          fetch('https://zoom-proxy.illia-2de.workers.dev', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'sendWelcomeEmail', toEmail: email, toName: fullName })
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use. Please log in instead.');
        setIsLogin(true);
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError('Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (providerFn: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await providerFn();
      if (result?.credential?.accessToken && onGoogleLogin) {
        onGoogleLogin(result.credential.accessToken);
      }
      if (inviteToken && result?.user?.email) {
        await markInviteAccepted(result.user.email);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with the same email address but different sign-in credentials.');
      } else {
        setError('Social login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 mb-4 shadow-lg ring-1 ring-white/10">
            <Layout className="w-6 h-6 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">SimpleCRM</h1>
          <p className="text-slate-400 text-sm">Manage your relationships simply and efficiently.</p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {/* Invite banner */}
          {inviteToken && (
            <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
              <span>You've been invited to SimpleCRM. Create your account below to accept.</span>
            </div>
          )}

          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-slate-800">{isLogin ? 'Welcome back' : 'Create an account'}</h2>
            <p className="text-slate-500 text-sm mt-1">
              {isLogin ? 'Enter your details to access your account' : 'Start your 14-day free trial today'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Social Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleSocialLogin(signInWithGoogle)}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all focus:ring-2 focus:ring-slate-200 outline-none"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">Or with email</span></div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => !inviteEmailLocked && setEmail(e.target.value)}
                  readOnly={inviteEmailLocked}
                  className={`w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${inviteEmailLocked ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                  placeholder="name@company.com"
                />
              </div>
              {inviteEmailLocked && <p className="text-xs text-slate-400 mt-1">Email pre-filled from your invite link.</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : (inviteToken ? 'Accept & Create Account' : 'Create Account')}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Login/Signup */}
          {!inviteToken && (
            <div className="mt-6 text-center text-sm text-slate-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(null); }}
                className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-slate-400">
        <p>&copy; {new Date().getFullYear()} SimpleCRM. All rights reserved.</p>
      </div>
    </div>
  );
};
