'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 6) {
      setErrorMsg('পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('দুটি পাসওয়ার্ড মেলেনি!');
      return;
    }

    setLoading(true);

    try {
      // নতুন পাসওয়ার্ড আপডেট
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setErrorMsg(err.message || 'পাসওয়ার্ড আপডেট ব্যর্থ হয়েছে। অনুগ্রহ করে আবার ট্রাই করুন।');
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
            🔒 Set New Password
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            আপনার অ্যাকাউন্টের জন্য একটি নতুন পাসওয়ার্ড সেট করুন।
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/40 text-rose-400 p-3.5 rounded-2xl text-xs font-bold text-center">
            ⚠️ {errorMsg}
          </div>
        )}

        {success ? (
          <div className="space-y-4 text-center">
            <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 p-4 rounded-2xl text-xs font-bold leading-relaxed">
              🎉 পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে! আপনাকে লগইন পেজে নিয়ে যাওয়া হচ্ছে...
            </div>
            <Link
              href="/login"
              className="inline-block bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-2xl text-xs uppercase tracking-wider transition"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div className="relative">
              <label className="text-xs font-extrabold text-slate-200 block mb-1.5 uppercase tracking-wider">
                New Password <span className="text-emerald-400">*</span>
              </label>
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
                className="absolute right-4 top-10 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-200 block mb-1.5 uppercase tracking-wider">
                Confirm New Password <span className="text-emerald-400">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner font-medium"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black py-4 rounded-2xl text-sm uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password 🚀'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}