'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md space-y-6 shadow-2xl">
        
        {/* 🌟 Brand Logo 🌟 */}
        <div className="flex justify-center mb-2">
          <Link href="/">
            <Image 
              src="/icon.svg" 
              alt="Resell Bari" 
              width={70} 
              height={70} 
              priority
              className="h-16 w-auto object-contain cursor-pointer transition hover:opacity-90"
            />
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