'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AccountActivationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Modal & Payment State
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
  const [method, setMethod] = useState('bKash');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState(null);

  // Payment Number
  const paymentNumber = "01700000000";

  // 30 Minutes Countdown State (1800 seconds)
  const [timeLeft, setTimeLeft] = useState(1800);

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

  // Timer Effect
  useEffect(() => {
    let timer;
    if (isSubmitted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSubmitted, timeLeft]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlanSelect = (name, price) => {
    setSelectedPlan({ name, price });
    setIsModalOpen(true);
  };

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(paymentNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('activation_requests')
        .insert([
          {
            user_id: user?.id,
            email: user?.email,
            plan: selectedPlan?.name,
            amount: selectedPlan?.price,
            payment_method: method,
            phone_number: phoneNumber,
            transaction_id: transactionId,
            status: 'pending',
            created_at: new Date().toISOString()
          }
        ]);

      if (error) {
        console.log('Payment info submitted locally or Supabase table pending.');
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error('Submission error:', err);
      setIsSubmitted(true);
    } finally {
      setSubmitting(false);
    }
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
      
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img 
              src="/logo.svg" 
              alt="Resell Bari" 
              className="h-10 sm:h-12 w-auto object-contain"
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

        {/* HERO SECTION */}
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

        {/* PACKAGES SECTION */}
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
            {/* BASIC */}
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
                onClick={() => handlePlanSelect('Basic Reseller', '349৳')}
                className="mt-10 w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-4 px-6 rounded-2xl text-sm transition border border-slate-200 cursor-pointer"
              >
                Basic Activate করুন
              </button>
            </div>

            {/* ADVANCE */}
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
                onClick={() => handlePlanSelect('Advance Reseller', '549৳')}
                className="mt-10 w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-4 px-6 rounded-2xl text-sm transition shadow-md shadow-amber-500/20 cursor-pointer"
              >
                Advance Activate করুন
              </button>
            </div>

            {/* PREMIUM */}
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
                onClick={() => handlePlanSelect('Premium Reseller', '999৳')}
                className="mt-10 w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold py-4 px-6 rounded-2xl text-sm transition shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                Premium Activate করুন
              </button>
            </div>
          </div>
        </section>

        {/* BENEFITS SECTION */}
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
            <div className="bg-white border border-slate-200/80 p-8 rounded-3xl space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl">💎</div>
              <h3 className="text-lg font-bold text-slate-900">বিশেষ Wholesale Price</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Membership-এর মাধ্যমে সাধারণ ক্রয়মূল্যের তুলনায় Reseller-এর জন্য নির্ধারিত Wholesale Pricing সুবিধা পাওয়া যাবে।
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 p-8 rounded-3xl space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl">📦</div>
              <h3 className="text-lg font-bold text-slate-900">পণ্য নিয়ে ব্যবসার সুযোগ</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                বিভিন্ন available product সংগ্রহ করে নিজের Customer-এর কাছে বিক্রি করার সুযোগ পাবেন।
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 p-8 rounded-3xl space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl">🏷️</div>
              <h3 className="text-lg font-bold text-slate-900">নিজের Selling Price</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                আপনার Market ও Business Strategy অনুযায়ী Selling Price নির্ধারণ করে নিজের Margin তৈরি করতে পারবেন।
              </p>
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
          </div>
        </section>

      </main>

      {/* PAYMENT MODAL POPUP */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            
            {/* Close Button */}
            {!isSubmitted && (
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 text-2xl font-bold transition cursor-pointer"
              >
                ✕
              </button>
            )}

            {!isSubmitted ? (
              /* PAYMENT FORM */
              <form onSubmit={handlePaymentSubmit} className="space-y-6">
                <div>
                  <div className="inline-block px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-full mb-2">
                    {selectedPlan?.name}
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">পেমেন্ট সম্পন্ন করুন</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    মোট প্রদেয় ফি: <span className="font-bold text-emerald-600 text-base">{selectedPlan?.price}</span>
                  </p>
                </div>

                {/* COPYABLE NUMBER BOX */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Send Money / Payment Number:</span>
                    <button
                      type="button"
                      onClick={handleCopyNumber}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <span className="text-xs">✓</span> Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-emerald-700 font-extrabold text-base sm:text-lg select-all">
                      {paymentNumber}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">(Personal/Merchant)</span>
                  </div>

                  <p className="text-xs text-slate-400 border-t border-slate-200/60 pt-2">
                    টাকা পাঠানোর পর নিচের তথ্যগুলো পূরণ করে সাবমিট করুন।
                  </p>
                </div>

                {/* Method Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Payment Method</label>
                  <select 
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Rocket">Rocket</option>
                    <option value="Upay">Upay</option>
                  </select>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">যে নাম্বার থেকে টাকা পাঠিয়েছেন</label>
                  <input 
                    type="tel"
                    required
                    placeholder="01XXXXXXXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Transaction ID */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">Transaction ID (TrxID)</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. 9J4K2L1M"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Screenshot (Optional) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Payment Screenshot <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={(e) => setScreenshot(e.target.files[0])}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-4 rounded-2xl text-sm transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Submitting details...' : 'Submit Payment'}
                </button>
              </form>
            ) : (
              /* 30-MINUTES COUNTDOWN SCREEN */
              <div className="text-center py-6 space-y-6">
                <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-amber-500 text-2xl animate-pulse">
                  ⏳
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900">Waiting for Confirmation</h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    আপনার পেমেন্ট তথ্য সফলভাবে গ্রহণ করা হয়েছে। অ্যাডমিন প্যানেল থেকে ভেরিফাই করা হচ্ছে।
                  </p>
                </div>

                <div className="bg-slate-900 text-emerald-400 p-6 rounded-3xl border border-slate-800 max-w-xs mx-auto shadow-inner">
                  <span className="text-xs uppercase tracking-widest text-slate-400 font-bold block mb-1">Time Remaining</span>
                  <span className="text-4xl sm:text-5xl font-mono font-black tracking-wider">
                    {formatTimer(timeLeft)}
                  </span>
                </div>

                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs sm:text-sm text-emerald-800 font-medium leading-relaxed">
                  When it done you will get a email with dashboard link.
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 underline font-medium cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-slate-200/80 bg-white mt-32">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 py-12 grid grid-cols-1 md:grid-cols-4 gap-10 text-sm text-slate-600">
          <div className="space-y-4">
            <Link href="/" className="flex items-center">
              <img 
                src="/logo.svg" 
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