'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const user = data.user;

      if (user && user.email === 'admin@bbc.com') {
        alert('Admin Login Successful!');
        router.push('/admin');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, plan')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }

      if (profile && profile.role === 'admin') {
        alert('Admin Login Successful!');
        router.push('/admin'); 
      } else {
        if (!profile || !profile.plan) {
          alert('Login Successful! Please activate your membership plan.');
          router.push('/account-activation'); 
        } else {
          alert('Login Successful!');
          router.push('/reseller'); 
        }
      }

    } catch (err) {
      console.error('Login Error:', err);
      alert('Login Failed: ' + (err.message || 'Check your credentials'));
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
          <h1 className="text-2xl font-extrabold text-white">🔐 Welcome Back</h1>
          <p className="text-xs text-slate-400 mt-1">Log in to manage your orders and dashboard.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-xs transition shadow-lg shadow-emerald-500/20"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Don't have an account? <a href="/register" className="text-emerald-400 font-bold hover:underline">Register here</a>
        </p>
      </div>
    </div>
  );
}