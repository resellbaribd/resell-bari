'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successModal, setSuccessModal] = useState({ show: false, targetUrl: '' });

  // অ্যাডমিন ইমেইল তালিকা (admin@resellbari.com সহ)
  const ADMIN_EMAILS = [
    'admin@resellbari.com',
    'admin@bbc.com',
    'sujanmiah.info@gmail.com',
    'info.resellbari@gmail.com',
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        throw new Error(error.message || 'Invalid login credentials');
      }

      const user = data.user;
      const userEmail = (user?.email || cleanEmail).toLowerCase();

      // ১. ইমেইল তালিকা থেকে অ্যাডমিন চেক
      if (ADMIN_EMAILS.includes(userEmail)) {
        setSuccessModal({ show: true, targetUrl: '/admin' });
        return;
      }

      // ২. প্রোফাইল থেকে role ও ban স্ট্যাটাস চেক
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, is_banned, ban_reason')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData?.is_banned) {
        await supabase.auth.signOut();
        throw new Error(`Your account has been banned. Reason: ${profileData.ban_reason || 'Violation of terms'}`);
      }

      if (profileData?.role?.toLowerCase() === 'admin') {
        setSuccessModal({ show: true, targetUrl: '/admin' });
        return;
      }

      // ৩. সাধারণ রিসেলার ইউজার
      setSuccessModal({ show: true, targetUrl: '/reseller' });
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    const destination = successModal.targetUrl || '/reseller';
    setSuccessModal({ show: false, targetUrl: '' });
    window.location.href = destination;
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans relative">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-2xl rounded-3xl p-6 sm:p-10 w-full max-w-lg shadow-2xl relative z-10 my-6">
        
        {/* LOGO & HEADER */}
        <div className="text-center space-y-3 mb-8">
          <div className="flex justify-center">
            <Link href="/" className="inline-block transition-transform hover:scale-105">
              <img src="/logo.svg" alt="Resell Bari" className="h-12 w-auto object-contain cursor-pointer" />
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
            🔐 Welcome Back
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            Log in to manage your orders and dashboard.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/40 text-rose-400 p-3.5 rounded-2xl text-xs font-bold text-center">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          
          {/* Email Address */}
          <div>
            <label className="text-xs font-extrabold text-slate-200 block mb-1.5 uppercase tracking-wider">
              Email Address <span className="text-emerald-400">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="user@gmail.com"
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner font-medium"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                Password <span className="text-emerald-400">*</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-bold text-slate-400 hover:text-emerald-400 transition"
              >
                Forgot Password?
              </Link>
            </div>
            
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner font-medium pr-14"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black py-4 rounded-2xl text-sm uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Footer Register Link */}
        <div className="text-center mt-6 text-xs sm:text-sm font-semibold text-slate-300">
          Don't have an account?{' '}
          <Link href="/register" className="text-emerald-400 hover:underline font-bold">
            Register here
          </Link>
        </div>

      </div>

      {/* SUCCESS MODAL */}
      {successModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl space-y-5">
            
            <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl shadow-lg shadow-emerald-500/30">
              ✓
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Login Successful!
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {successModal.targetUrl === '/admin'
                  ? 'Welcome Admin! Redirecting to Control Hub...'
                  : 'Welcome to Resell Bari! Redirecting to Dashboard...'}
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleContinue}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black py-3.5 rounded-2xl text-sm uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                {successModal.targetUrl === '/admin' ? 'Go to Admin Panel 🛡️' : 'Go to Dashboard 🚀'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}