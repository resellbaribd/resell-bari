'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    facebookPage: '',
    website: '',
    address: '',
    district: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const districts = [
    'ঢাকা',
    'চট্টগ্রাম',
    'রাজশাহী',
    'খুলনা',
    'বরিশাল',
    'রংপুর',
    'ময়মনসিংহ',
    'সিলেট',
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match!');
      return;
    }

    if (formData.phone.trim().length < 11) {
      setErrorMsg('Please enter a valid 11-digit phone number.');
      return;
    }

    if (!formData.facebookPage.trim()) {
      setErrorMsg('Facebook Page Link is required.');
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = formData.email.trim().toLowerCase();
      const isAdmin = cleanEmail === 'admin@resellbari.com' || cleanEmail === 'admin@bbc.com' || cleanEmail === 'sujanmiah.info@gmail.com';

      // ১. Supabase Auth-এ সাইন-আপ
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
        },
      });

      if (authError) throw authError;

      const userId = authData.user?.id;

      if (userId) {
        // ২. profiles টেবিলে ডাটা সংরক্ষণ (অ্যাডমিন ইমেইল হলে সরাসরি admin রোল পাবে)
        const { error: profileError } = await supabase.from('profiles').upsert([
          {
            id: userId,
            full_name: formData.fullName,
            email: cleanEmail,
            phone: formData.phone,
            shop_name: formData.facebookPage,
            website: formData.website || null,
            address: formData.address || null,
            district: formData.district || null,
            role: isAdmin ? 'admin' : 'reseller',
            plan: 'basic',
            status: 'active',
            created_at: new Date(),
          },
        ]);

        if (profileError) console.error('Profile insert warning:', profileError);
      }

      setShowSuccessModal(true);
    } catch (err) {
      setErrorMsg(err.message || err.error_description || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalOk = () => {
    setShowSuccessModal(false);
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans relative">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-2xl rounded-3xl p-6 sm:p-10 w-full max-w-2xl shadow-2xl relative z-10 my-6">
        
        {/* LOGO & HEADER */}
        <div className="text-center space-y-3 mb-8">
          <div className="flex justify-center">
            <Link href="/" className="inline-block transition-transform hover:scale-105">
              <img src="/logo.svg" alt="Resell Bari" className="h-12 w-auto object-contain cursor-pointer" />
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
            🚀 Create Reseller Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            Join our network and start selling instantly with high profit margins.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/40 text-rose-400 p-3.5 rounded-2xl text-xs font-bold text-center">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* FULL NAME */}
            <div>
              <label className="text-xs font-extrabold text-slate-200 block mb-1.5 uppercase tracking-wider">
                Full Name <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                required
                placeholder="e.g. John Ibrahim Khan"
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner font-medium"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>

            {/* EMAIL ADDRESS */}
            <div>
              <label className="text-xs font-extrabold text-slate-200 block mb-1.5 uppercase tracking-wider">
                Email Address <span className="text-emerald-400">*</span>
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="user@gmail.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner font-medium"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* PHONE NUMBER */}
            <div>
              <label className="text-xs font-extrabold text-slate-200 block mb-1.5 uppercase tracking-wider">
                Phone Number (11 Digits) <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                name="phone"
                required
                maxLength={11}
                placeholder="01XXXXXXXXX"
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner font-medium"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            {/* FACEBOOK PAGE LINK */}
            <div>
              <label className="text-xs font-extrabold text-slate-200 block mb-1.5 uppercase tracking-wider">
                Facebook Page Link <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                name="facebookPage"
                required
                placeholder="https://facebook.com/yourpage"
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner font-medium"
                value={formData.facebookPage}
                onChange={handleChange}
              />
            </div>

            {/* WEBSITE LINK */}
            <div className="sm:col-span-2">
              <label className="text-xs font-extrabold text-slate-200 block mb-1.5 uppercase tracking-wider">
                Website Link <span className="text-slate-400 text-[10px] lowercase font-normal">(optional)</span>
              </label>
              <input
                type="text"
                name="website"
                placeholder="https://yourwebsite.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner font-medium"
                value={formData.website}
                onChange={handleChange}
              />
            </div>

            {/* ADDRESS */}
            <div>
              <label className="text-xs font-extrabold text-slate-200 block mb-1.5 uppercase tracking-wider">
                Address <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                name="address"
                required
                placeholder="House, Area, Thana"
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner font-medium"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            {/* DISTRICT */}
            <div>
              <label className="text-xs font-extrabold text-slate-200 block mb-1.5 uppercase tracking-wider">
                District <span className="text-emerald-400">*</span>
              </label>
              <select
                name="district"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition shadow-inner font-medium cursor-pointer"
                value={formData.district}
                onChange={handleChange}
              >
                <option value="" disabled>Select one</option>
                {districts.map((dist) => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
            </div>

            {/* PASSWORD */}
            <div className="relative">
              <label className="text-xs font-extrabold text-slate-200 block mb-1.5 uppercase tracking-wider">
                Password <span className="text-emerald-400">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner font-medium pr-14"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-10 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {/* CONFIRM PASSWORD */}
            <div className="relative">
              <label className="text-xs font-extrabold text-slate-200 block mb-1.5 uppercase tracking-wider">
                Confirm Password <span className="text-emerald-400">*</span>
              </label>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                required
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner font-medium pr-14"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-10 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>

          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black py-4 rounded-2xl text-sm uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Register Account'}
          </button>
        </form>

        {/* FOOTER */}
        <div className="text-center mt-6 text-xs sm:text-sm font-semibold text-slate-300">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-400 hover:underline font-bold">
            Login here
          </Link>
        </div>

      </div>

      {/* MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl space-y-5">
            <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl shadow-lg shadow-emerald-500/30">
              ✓
            </div>
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Registration Successful!
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Welcome to <span className="text-emerald-400 font-bold">Resell Bari</span>. Your account is ready.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={handleModalOk}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black py-3.5 rounded-2xl text-sm uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                Continue to Login 🚀
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}