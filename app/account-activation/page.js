'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AccountActivationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function checkUserAndMembership() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          router.push('/login');
          return;
        }

        setUser(session.user);

        const { data: profile } = await supabase
          .from('profiles')
          .select('plan, status')
          .eq('id', session.user.id)
          .single();

        if (profile && profile.plan && profile.plan.toLowerCase() !== 'basic') { 
          router.push('/reseller');
          return;
        }

      } catch (err) {
        console.error('Error checking authentication state:', err);
      } finally {
        setLoading(false);
      }
    }

    checkUserAndMembership();
  }, [router]);

  const handlePlanSelect = (planName) => {
    router.push(`/checkout?plan=${planName.toLowerCase()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center font-sans">
        <div className="text-emerald-600 animate-pulse text-base font-semibold">Loading activation details...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      
      {/* Background Glows (Light Theme) */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img 
              src="/logo.svg" 
              alt="Resell Bari" 
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <Link href="/" className="hover:text-emerald-600 transition">Home</Link>
            <Link href="#packages" className="hover:text-emerald-600 transition">Packages</Link>
            <Link href="#benefits" className="hover:text-emerald-600 transition">Benefits</Link>
            <Link href="#faq" className="hover:text-emerald-600 transition">FAQ</Link>
          </nav>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden sm:inline font-medium">{user?.email}</span>
            <button 
              onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
              className="text-sm font-semibold border border-slate-300 hover:bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 sm:px-12 py-12 sm:py-20 space-y-20 sm:space-y-32 relative z-10">

        {/* ACCOUNT ACTIVATION HERO SECTION */}
        <section className="bg-white/80 backdrop-blur-2xl border border-slate-200/80 rounded-3xl p-8 sm:p-16 shadow-sm relative overflow-hidden">
          <div className="max-w-4xl space-y-8">
            
            <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✓ Registration Completed
              </span>
              <span className="text-slate-400">→</span>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                ● Membership Activation Pending
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                আপনার Account তৈরি হয়েছে!
              </h1>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600">
                এখন আপনার Reseller সুবিধা চালু করুন
              </p>
            </div>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-3xl">
              আপনার Registration সফল হয়েছে। এখন আপনার পছন্দের একটি Membership Plan নির্বাচন করে Account Activation সম্পন্ন করুন এবং Resell Bari-এর বিশেষ Wholesale সুবিধা ব্যবহার করে আপনার Online Reselling Business শুরু করুন।
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-200 text-sm">
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-2">
                <span className="text-slate-400 block font-mono text-xs">01</span>
                <p className="font-bold text-slate-700">Account তৈরি</p>
                <span className="text-emerald-600 font-semibold block text-xs">✓ Completed</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-300 p-5 rounded-2xl space-y-2 shadow-sm">
                <span className="text-emerald-600 block font-mono text-xs font-bold">02</span>
                <p className="font-bold text-slate-900">Membership Activate</p>
                <span className="text-amber-600 font-bold block text-xs">→ You are here</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-2 opacity-60">
                <span className="text-slate-400 block font-mono text-xs">03</span>
                <p className="font-bold text-slate-500">Reselling শুরু</p>
                <span className="text-slate-400 block text-xs">○ Next Step</span>
              </div>
            </div>

          </div>
        </section>

        {/* MEMBERSHIP PLAN SECTION */}
        <section id="packages" className="space-y-12 scroll-mt-28">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              আপনার জন্য উপযুক্ত Membership Plan বেছে নিন
            </h2>
            <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
              আপনার Business-এর প্রয়োজন অনুযায়ী একটি Plan নির্বাচন করুন এবং Reseller সুবিধা চালু করুন।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            
            {/* BASIC PLAN */}
            <div className="bg-white border border-slate-200/80 hover:border-slate-300 p-8 sm:p-10 rounded-3xl shadow-sm hover:shadow-md flex flex-col justify-between transition-all">
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider">Basic Reseller</h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-slate-900">349৳</span>
                    <span className="text-xs sm:text-sm text-slate-500">/ lifetime access</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                    যারা নতুনভাবে Online Reselling শুরু করতে চান তাদের জন্য।
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm">
                  <span className="text-slate-500 block font-semibold">Wholesale Advantage:</span>
                  <strong className="text-emerald-600 font-bold mt-1 block">Standard Wholesale Price</strong>
                </div>

                <div className="space-y-3.5 text-xs sm:text-sm text-slate-600 pt-4 border-t border-slate-100">
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold text-base">✓</span> Membership Access</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold text-base">✓</span> Standard Wholesale Price</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold text-base">✓</span> Product Information</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold text-base">✓</span> Available Product Collection</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold text-base">✓</span> Reseller Support</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold text-base">✓</span> নিজের Selling Price নির্ধারণের সুবিধা</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold text-base">✓</span> Basic Business Guidance</p>
                </div>
              </div>

              <button
                onClick={() => handlePlanSelect('basic')}
                className="mt-10 w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-4 px-6 rounded-2xl text-sm transition border border-slate-200"
              >
                Basic Activate করুন
              </button>
            </div>

            {/* ADVANCE PLAN */}
            <div className="bg-white border border-amber-200/80 hover:border-amber-300 p-8 sm:p-10 rounded-3xl shadow-sm hover:shadow-md flex flex-col justify-between transition-all">
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider">Advance Reseller</h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-amber-500">549৳</span>
                    <span className="text-xs sm:text-sm text-slate-500">/ lifetime access</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                    যারা নিয়মিত Reselling করতে চান এবং আরও ভালো Wholesale সুবিধা চান তাদের জন্য।
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs sm:text-sm">
                  <span className="text-amber-700 block font-semibold">Wholesale Advantage:</span>
                  <strong className="text-amber-600 font-bold mt-1 block">Basic-এর তুলনায় 2% কম Wholesale Price</strong>
                </div>

                <div className="space-y-3.5 text-xs sm:text-sm text-slate-600 pt-4 border-t border-slate-100">
                  <p className="flex items-center gap-3"><span className="text-amber-500 font-bold text-base">✓</span> Basic-এর সব সুবিধা</p>
                  <p className="flex items-center gap-3"><span className="text-amber-500 font-bold text-base">✓</span> 2% কম Wholesale Price</p>
                  <p className="flex items-center gap-3"><span className="text-amber-500 font-bold text-base">✓</span> Regular Reseller Support</p>
                  <p className="flex items-center gap-3"><span className="text-amber-500 font-bold text-base">✓</span> New Product Information</p>
                  <p className="flex items-center gap-3"><span className="text-amber-500 font-bold text-base">✓</span> Product Selection Support</p>
                  <p className="flex items-center gap-3"><span className="text-amber-500 font-bold text-base">✓</span> Business Growth Guidance</p>
                  <p className="flex items-center gap-3"><span className="text-amber-500 font-bold text-base">✓</span> বেশি Margin তৈরির সুযোগ</p>
                </div>
              </div>

              <button
                onClick={() => handlePlanSelect('advance')}
                className="mt-10 w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-4 px-6 rounded-2xl text-sm transition shadow-md shadow-amber-500/20"
              >
                Advance Activate করুন
              </button>
            </div>

            {/* PREMIUM PLAN */}
            <div className="bg-white border-2 border-emerald-500 p-8 sm:p-10 rounded-3xl shadow-xl shadow-emerald-500/10 flex flex-col justify-between transition-all relative overflow-hidden">
              <div className="absolute top-5 right-5 bg-emerald-500 text-white text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-sm">
                Best Value
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider">Premium Reseller</h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-emerald-600">999৳</span>
                    <span className="text-xs sm:text-sm text-slate-500">/ lifetime access</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                    যারা Reselling Business-কে আরও সিরিয়াসভাবে বড় করতে চান তাদের জন্য।
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs sm:text-sm">
                  <span className="text-emerald-800 block font-semibold">Wholesale Advantage:</span>
                  <strong className="text-emerald-600 font-bold mt-1 block">Basic-এর তুলনায় 4% কম Wholesale Price</strong>
                </div>

                <div className="space-y-3.5 text-xs sm:text-sm text-slate-600 pt-4 border-t border-slate-100">
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold text-base">✓</span> Advance-এর সব সুবিধা</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold text-base">✓</span> 4% কম Wholesale Price</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold text-base">✓</span> Priority Reseller Support</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold text-base">✓</span> Priority Access to New Products</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold text-base">✓</span> Product Selection Support</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold text-base">✓</span> Business Growth Guidance</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold text-base">✓</span> বেশি Profit Margin তৈরির সুযোগ</p>
                </div>
              </div>

              <button
                onClick={() => handlePlanSelect('premium')}
                className="mt-10 w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold py-4 px-6 rounded-2xl text-sm transition shadow-lg shadow-emerald-500/25"
              >
                Premium Activate করুন
              </button>
            </div>

          </div>
        </section>

        {/* MEMBERSHIP BENEFITS SECTION */}
        <section id="benefits" className="space-y-12 scroll-mt-28">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              Membership নিলে আপনি কী কী সুবিধা পাবেন?
            </h2>
            <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
              আপনার অনলাইন রিসেলিং ব্যবসা সফল করতে প্রয়োজনীয় সকল সুবিধা এক প্ল্যাটফর্মে।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            
            <div className="bg-white border border-slate-200/80 p-8 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl">💎</div>
              <h3 className="text-lg font-bold text-slate-900">বিশেষ Wholesale Price</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Membership-এর মাধ্যমে সাধারণ ক্রয়মূল্যের তুলনায় Reseller-এর জন্য নির্ধারিত Wholesale Pricing সুবিধা পাওয়া যাবে।
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 p-8 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl">📦</div>
              <h3 className="text-lg font-bold text-slate-900">পণ্য নিয়ে ব্যবসার সুযোগ</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                বিভিন্ন available product সংগ্রহ করে নিজের Customer-এর কাছে বিক্রি করার সুযোগ পাবেন।
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 p-8 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl">🏷️</div>
              <h3 className="text-lg font-bold text-slate-900">নিজের Selling Price</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                আপনার Market ও Business Strategy অনুযায়ী Selling Price নির্ধারণ করে নিজের Margin তৈরি করতে পারবেন।
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 p-8 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl">🤝</div>
              <h3 className="text-lg font-bold text-slate-900">Reseller Support</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Product ও Reselling সংক্রান্ত প্রয়োজনীয় বিষয়ে নির্ধারিত Support সুবিধা পাবেন।
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 p-8 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl">📈</div>
              <h3 className="text-lg font-bold text-slate-900">Business Growth</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Customer এবং Order বাড়ার সঙ্গে সঙ্গে আপনার Reselling Business ধীরে ধীরে Scale করার সুযোগ থাকবে।
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 p-8 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl">🌐</div>
              <h3 className="text-lg font-bold text-slate-900">একাধিক Business Channel</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Facebook Page, Website, TikTok, WhatsApp এবং অন্যান্য Online Channel ব্যবহার করে Product বিক্রি করতে পারবেন।
              </p>
            </div>

          </div>
        </section>

        {/* WHY ACTIVATE NOW SECTION */}
        <section className="bg-white/80 border border-slate-200/80 rounded-3xl p-8 sm:p-12 space-y-8 shadow-sm">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Registration শেষ হয়েছে, এবার Business শুরু করার পালা
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              আপনার Account ইতোমধ্যেই তৈরি হয়েছে। Membership Activation সম্পন্ন করলেই আপনি আপনার নির্বাচিত Plan অনুযায়ী Reseller সুবিধা ব্যবহার করতে পারবেন।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="font-mono text-slate-400 text-xs">01</span>
              <p className="font-bold text-slate-900 text-base">Account তৈরি করুন</p>
              <span className="text-emerald-600 font-semibold block text-xs">✓ Completed</span>
            </div>
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3 shadow-sm">
              <span className="font-mono text-emerald-600 text-xs font-bold">02</span>
              <p className="font-bold text-slate-900 text-base">Membership Activate করুন</p>
              <span className="text-amber-600 font-semibold block text-xs">→ You are here</span>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-3 opacity-60">
              <span className="font-mono text-slate-400 text-xs">03</span>
              <p className="font-bold text-slate-600 text-base">Wholesale Price-এ Product নিয়ে Reselling শুরু করুন</p>
              <span className="text-slate-400 font-semibold block text-xs">○ Next Step</span>
            </div>
          </div>
        </section>

        {/* CUSTOMER REVIEWS SECTION */}
        <section className="space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              আমাদের Reseller-দের অভিজ্ঞতা
            </h2>
            <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
              যারা Resell Bari-এর সাথে কাজ করছেন, তাদের অভিজ্ঞতা তুলে ধরুন।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="bg-white border border-slate-200/80 p-8 rounded-3xl flex flex-col justify-between space-y-6 shadow-sm hover:shadow-md transition">
              <div className="space-y-4">
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full font-medium inline-block">
                  Sample Review — Replace with real customer review.
                </span>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed italic">
                  "Resell Bari-এর মাধ্যমে প্রডাক্ট সংগ্রহ করা খুবই সহজ হয়েছে। Wholesale প্রাইস ভালো থাকায় ভালো প্রফিট মার্জিন রাখা যায়।"
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100 flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sm text-emerald-600">
                  RA
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Rahim Ahmed</h4>
                  <p className="text-xs text-slate-500">Online Fashion Page Owner</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-8 rounded-3xl flex flex-col justify-between space-y-6 shadow-sm hover:shadow-md transition">
              <div className="space-y-4">
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full font-medium inline-block">
                  Sample Review — Replace with real customer review.
                </span>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed italic">
                  "এডভান্স প্ল্যান নিয়ে কাজ শুরু করেছি। নিয়মিত রিসেলার সাপোর্ট এবং সঠিক সময়ে প্রডাক্ট ডেলিভারি পাওয়াতে ব্যবসা বাড়াতে সুবিধা হচ্ছে।"
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100 flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sm text-emerald-600">
                  SN
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Sultana Nahid</h4>
                  <p className="text-xs text-slate-500">F-Commerce Entrepreneur</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-8 rounded-3xl flex flex-col justify-between space-y-6 shadow-sm hover:shadow-md transition">
              <div className="space-y-4">
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full font-medium inline-block">
                  Sample Review — Replace with real customer review.
                </span>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed italic">
                  "নিজের মতো করে সেলিং প্রাইস সেট করতে পারার সুবিধাটা দারুণ। নতুনদের জন্য বেসিক বা এডভান্স প্ল্যান খুবই চমৎকার অপশন।"
                </p>
              </div>
              <div className="pt-6 border-t border-slate-100 flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sm text-emerald-600">
                  MI
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Mahmudul Islam</h4>
                  <p className="text-xs text-slate-500">Reseller & Marketer</p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="space-y-12 scroll-mt-28 max-w-4xl mx-auto">
          <div className="text-center space-y-4">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              Membership নিয়ে সাধারণ প্রশ্ন
            </h2>
            <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
              আপনার মনে থাকা বিভিন্ন প্রশ্নের উত্তর জেনে নিন।
            </p>
          </div>

          <div className="space-y-4 text-sm sm:text-base">
            
            <details className="group bg-white border border-slate-200/80 rounded-2xl p-6 [&_summary::-webkit-details-marker]:hidden cursor-pointer shadow-sm">
              <summary className="flex items-center justify-between font-bold text-slate-900">
                Registration করলেই কি Reseller Account Activate হবে?
                <span className="transition group-open:rotate-180 text-emerald-600 text-lg">▼</span>
              </summary>
              <p className="mt-4 text-slate-600 leading-relaxed border-t border-slate-100 pt-4 text-sm">
                Registration সম্পন্ন হলে আপনার Account তৈরি হবে। Reseller সুবিধা ব্যবহার করতে একটি Membership Plan নির্বাচন করে Activation সম্পন্ন করতে হবে।
              </p>
            </details>

            <details className="group bg-white border border-slate-200/80 rounded-2xl p-6 [&_summary::-webkit-details-marker]:hidden cursor-pointer shadow-lg">
              <summary className="flex items-center justify-between font-bold text-slate-900">
                Membership Plan কত টাকা?
                <span className="transition group-open:rotate-180 text-emerald-600 text-lg">▼</span>
              </summary>
              <p className="mt-4 text-slate-600 leading-relaxed border-t border-slate-100 pt-4 text-sm">
                বর্তমানে Basic 349৳, Advance 549৳ এবং Premium 999৳—এই তিনটি Membership Plan রয়েছে।
              </p>
            </details>

            <details className="group bg-white border border-slate-200/80 rounded-2xl p-6 [&_summary::-webkit-details-marker]:hidden cursor-pointer shadow-sm">
              <summary className="flex items-center justify-between font-bold text-slate-900">
                কোন Plan-এ সবচেয়ে কম Wholesale Price পাওয়া যাবে?
                <span className="transition group-open:rotate-180 text-emerald-600 text-lg">▼</span>
              </summary>
              <p className="mt-4 text-slate-600 leading-relaxed border-t border-slate-100 pt-4 text-sm">
                Premium Plan-এ Basic Plan-এর তুলনায় সর্বোচ্চ 4% কম Wholesale Price-এর সুবিধা থাকবে।
              </p>
            </details>

            <details className="group bg-white border border-slate-200/80 rounded-2xl p-6 [&_summary::-webkit-details-marker]:hidden cursor-pointer shadow-sm">
              <summary className="flex items-center justify-between font-bold text-slate-900">
                Membership Fee দেওয়ার পর কি Product ফ্রি পাওয়া যাবে?
                <span className="transition group-open:rotate-180 text-emerald-600 text-lg">▼</span>
              </summary>
              <p className="mt-4 text-slate-600 leading-relaxed border-t border-slate-100 pt-4 text-sm">
                না। Membership Fee মূলত Reseller সুবিধা ও নির্ধারিত Wholesale Pricing Access-এর জন্য। Product-এর মূল্য আলাদাভাবে প্রযোজ্য।
              </p>
            </details>

            <details className="group bg-white border border-slate-200/80 rounded-2xl p-6 [&_summary::-webkit-details-marker]:hidden cursor-pointer shadow-sm">
              <summary className="flex items-center justify-between font-bold text-slate-900">
                আমি কি নিজের Selling Price নির্ধারণ করতে পারব?
                <span className="transition group-open:rotate-180 text-emerald-600 text-lg">▼</span>
              </summary>
              <p className="mt-4 text-slate-600 leading-relaxed border-t border-slate-100 pt-4 text-sm">
                হ্যাঁ। আপনার Market ও Business Strategy অনুযায়ী Selling Price নির্ধারণ করতে পারবেন, তবে Resell Bari-এর প্রযোজ্য Pricing বা Promotion Policy অনুসরণ করতে হবে।
              </p>
            </details>

            <details className="group bg-white border border-slate-200/80 rounded-2xl p-6 [&_summary::-webkit-details-marker]:hidden cursor-pointer shadow-sm">
              <summary className="flex items-center justify-between font-bold text-slate-900">
                নতুন Reseller হলে কোন Plan নেওয়া ভালো?
                <span className="transition group-open:rotate-180 text-emerald-600 text-lg">▼</span>
              </summary>
              <p className="mt-4 text-slate-600 leading-relaxed border-t border-slate-100 pt-4 text-sm">
                প্রথমবার শুরু করলে Basic দিয়ে শুরু করতে পারেন। নিয়মিত Reselling করার পরিকল্পনা থাকলে Advance বা Premium আপনার Business-এর জন্য বেশি সুবিধাজনক হতে পারে।
              </p>
            </details>

            <details className="group bg-white border border-slate-200/80 rounded-2xl p-6 [&_summary::-webkit-details-marker]:hidden cursor-pointer shadow-sm">
              <summary className="flex items-center justify-between font-bold text-slate-900">
                Membership নেওয়ার পর কি নিয়মিত Product কিনতে হবে?
                <span className="transition group-open:rotate-180 text-emerald-600 text-lg">▼</span>
              </summary>
              <p className="mt-4 text-slate-600 leading-relaxed border-t border-slate-100 pt-4 text-sm">
                এটি Resell Bari-এর বর্তমান Membership Policy অনুযায়ী নির্ধারিত হবে। Website-এ শুধুমাত্র actual business policy অনুযায়ী তথ্য দেখাতে হবে।
              </p>
            </details>

          </div>
        </section>

        {/* FINAL CTA SECTION */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/90 rounded-3xl p-10 sm:p-16 text-center space-y-8 shadow-xl text-white relative overflow-hidden">
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
              আপনার Account প্রস্তুত—এবার Reseller সুবিধা চালু করুন
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              আপনার প্রয়োজন অনুযায়ী Basic, Advance অথবা Premium Membership বেছে নিন এবং Resell Bari-এর Wholesale সুবিধা নিয়ে আপনার Online Reselling Journey শুরু করুন।
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => {
                const element = document.getElementById('packages');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-8 py-4 rounded-2xl text-sm transition shadow-lg shadow-emerald-500/20"
            >
              Membership Activate করুন
            </button>
            <button
              onClick={() => {
                const element = document.getElementById('packages');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="border border-slate-700 hover:bg-slate-800 text-slate-200 font-semibold px-8 py-4 rounded-2xl text-sm transition"
            >
              Plan তুলনা করুন
            </button>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/80 bg-white mt-32">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 py-12 grid grid-cols-1 md:grid-cols-4 gap-10 text-sm text-slate-600">
          
          <div className="space-y-4">
            <Link href="/" className="flex items-center">
              <img 
                src="/icon.svg" 
                alt="Resell Bari" 
                className="h-9 w-auto object-contain"
              />
            </Link>
            <p className="leading-relaxed text-xs sm:text-sm text-slate-500">
              বাংলাদেশের আধুনিক অনলাইন রিসেলিং প্ল্যাটফর্ম। Wholesale মূল্যে পণ্য সংগ্রহ করে আপনার নিজস্ব অনলাইন ব্যবসা পরিচালনা করুন।
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-slate-900 font-bold text-base">Quick Links</h4>
            <div className="flex flex-col space-y-2 text-xs sm:text-sm">
              <Link href="#packages" className="hover:text-emerald-600 transition">Membership Plans</Link>
              <Link href="#benefits" className="hover:text-emerald-600 transition">Benefits</Link>
              <Link href="#faq" className="hover:text-emerald-600 transition">FAQ</Link>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-slate-900 font-bold text-base">Legal & Policies</h4>
            <div className="flex flex-col space-y-2 text-xs sm:text-sm">
              <Link href="/terms" className="hover:text-emerald-600 transition">Terms & Conditions</Link>
              <Link href="/privacy" className="hover:text-emerald-600 transition">Privacy Policy</Link>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-slate-900 font-bold text-base">Account</h4>
            <div className="flex flex-col space-y-2 text-xs sm:text-sm">
              <Link href="/reseller" className="hover:text-emerald-600 transition">Dashboard</Link>
              <Link href="/login" className="hover:text-emerald-600 transition">Login</Link>
            </div>
          </div>

        </div>

        <div className="border-t border-slate-100 py-8 text-center text-xs sm:text-sm text-slate-400">
          &copy; {new Date().getFullYear()} Resell Bari. All rights reserved.
        </div>
      </footer>

    </div>
  );
}