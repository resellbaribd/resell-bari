'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      const user = data?.user;

      if (user) {
        const { error: profileError } = await supabase.from('profiles').upsert([
          {
            id: user.id,
            full_name: fullName,
            email: email,
            plan: null,
          }
        ]);

        if (profileError) {
          console.error('Profile insertion error:', profileError.message);
        }
      }

      alert('Registration successful! Please log in to your account.');
      router.push('/login');
      
    } catch (err) {
      console.error('Detailed Registration Error:', err);
      alert('Registration Failed: ' + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md space-y-6 shadow-2xl relative">
        
        {/* 🌟 Premium White-Background Rounded Logo 🌟 */}
        <div className="flex justify-center -mt-2 mb-2">
          <Link href="/" className="group inline-block">
            <div className="bg-white p-3.5 rounded-2xl shadow-xl shadow-emerald-500/10 border border-slate-100 flex items-center justify-center transition-all duration-300 transform group-hover:scale-105">
              <Image 
                src="/logo.svg" 
                alt="Resell Bari" 
                width={140} 
                height={55} 
                priority
                className="h-12 md:h-14 w-auto object-contain"
              />
            </div>
          </Link>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-white">🚀 Create Reseller Account</h1>
          <p className="text-xs text-slate-400 mt-1">Join our network and start selling instantly.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Shop / Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. John Ibrahim Khan"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="user@gmail.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 pr-10 text-xs text-white focus:outline-none focus:border-emerald-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
              >
                {showPassword ? (
                  /* Eye Slash Icon (Hide) */
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  /* Eye Icon (Show) */
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-xs transition shadow-lg shadow-emerald-500/20"
          >
            {loading ? 'Processing...' : 'Register Account'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Already have an account? <a href="/login" className="text-emerald-400 font-bold hover:underline">Login here</a>
        </p>
      </div>
    </div>
  );
}