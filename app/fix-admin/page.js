'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function FixAdminPage() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFix = async () => {
    setLoading(true);
    setStatus('Processing sync...');

    const email = 'admin@resellbari.com';
    const password = 'Admin@ResellBari2026';

    try {
      // ১. ক্লায়েন্ট SDK দিয়ে সাইন-আপ বা রিকনফার্ম
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: 'Resell Bari Admin' }
        }
      });

      if (error && !error.message.includes('already registered')) {
        throw error;
      }

      // ২. প্রোফাইলে রোল নিশ্চিত করা
      const userId = data?.user?.id;
      if (userId) {
        await supabase.from('profiles').upsert({
          id: userId,
          email,
          full_name: 'Resell Bari Admin',
          role: 'admin',
          status: 'active'
        });
      }

      setStatus('✅ Success! Admin credentials synchronized. You can now login.');
    } catch (err) {
      setStatus('❌ Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full text-center space-y-6">
        <h2 className="text-xl font-bold">🛡️ Fix Admin Authentication</h2>
        <p className="text-xs text-slate-400">
          Click below to sync <span className="text-emerald-400 font-mono">admin@resellbari.com</span> with password <span className="text-emerald-400 font-mono">Admin@ResellBari2026</span>
        </p>

        {status && (
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold">
            {status}
          </div>
        )}

        <button
          onClick={handleFix}
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Syncing...' : 'Sync Admin Credentials'}
        </button>

        <div className="pt-2">
          <Link href="/login" className="text-xs text-slate-400 hover:text-white underline">
            Go to Login Page →
          </Link>
        </div>
      </div>
    </div>
  );
}