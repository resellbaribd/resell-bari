'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setMessage('');
    setLoading(true);

    try {
      // ইমেইলে রিসেট লিংক পাঠানোর জন্য Supabase API
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setMessage('পাসওয়ার্ড রিসেট করার একটি লিংক আপনার ইমেইলে পাঠানো হয়েছে। অনুগ্রহ করে আপনার ইনবক্স বা স্প্যাম ফোল্ডার চেক করুন।');
    } catch (err) {
      setErrorMsg(err.message || 'রিকোয়েস্ট ব্যর্থ হয়েছে। অনুগ্রহ করে সঠিক ইমেইল দিন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans relative">
      <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-2xl rounded-3xl p-6 sm:p-10 w-full max-w-md shadow-2xl relative z-10 my-6">
        
        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <div className="flex justify-center">
            <Link href="/" className="inline-block transition-transform hover:scale-105">
              <img src="/logo.svg" alt="Resell Bari" className="h-12 w-auto object-contain cursor-pointer" />
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
            🔑 Reset Password
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            আপনার অ্যাকাউন্টের ইমেইল দিন। আমরা একটি পাসওয়ার্ড রিসেট লিংক পাঠিয়ে দেব।
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/40 text-rose-400 p-3.5 rounded-2xl text-xs font-bold text-center">
            ⚠️ {errorMsg}
          </div>
        )}

        {message && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 p-3.5 rounded-2xl text-xs font-bold text-center leading-relaxed">
            ✅ {message}
          </div>
        )}

        <form onSubmit={handleResetRequest} className="space-y-5">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black py-4 rounded-2xl text-sm uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Sending Link...' : 'Send Reset Link 📩'}
          </button>
        </form>

        <div className="text-center mt-6 text-xs sm:text-sm font-semibold text-slate-300">
          Remember your password?{' '}
          <Link href="/login" className="text-emerald-400 hover:underline font-bold">
            Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
}