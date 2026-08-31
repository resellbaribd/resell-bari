'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setProducts(data);
        const uniqueCats = ['All', ...new Set(data.map((item) => item.category).filter(Boolean))];
        setCategories(uniqueCats);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter((p) => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      
      {/* Background Soft Glows (Light Theme) */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-12 h-20 flex items-center justify-between gap-2">
          
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0">
            <img 
              src="/logo.svg" 
              alt="Resell Bari" 
              className="h-12 sm:h-14 w-auto object-contain cursor-pointer"
            />
          </Link>

          {/* Desktop Menu */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <Link href="#how-it-works" className="hover:text-emerald-600 transition">How It Works</Link>
            <Link href="#packages" className="hover:text-emerald-600 transition">Packages</Link>
            <Link href="#products" className="hover:text-emerald-600 transition">Products</Link>
            <Link href="#why-choose" className="hover:text-emerald-600 transition">Why Us</Link>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link 
              href="/login"
              className="text-xs sm:text-sm font-bold border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition whitespace-nowrap"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="text-xs sm:text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl transition shadow-md shadow-emerald-500/20 whitespace-nowrap"
            >
              Become a Reseller
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-12 py-10 sm:py-20 space-y-20 sm:space-y-36 relative z-10">

        {/* HERO SECTION */}
        <section className="text-center max-w-4xl mx-auto space-y-8 pt-4 sm:pt-6">
          <div className="inline-flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-full text-xs sm:text-sm font-medium text-slate-700 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            ৩টি Membership Plan • Special Wholesale Price • Reseller Support
          </div>
          
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            পণ্য আমাদের, ব্যবসা আপনার—Wholesale সুবিধা সহ Resell Bari-এর!
          </h1>
          
          <p className="text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            কম পুঁজি দিয়ে শুরু করুন নিজের Online Reselling Business। আমাদের কাছ থেকে Wholesale Price-এ পণ্য সংগ্রহ করুন, নিজের Customer তৈরি করুন এবং ধীরে ধীরে গড়ে তুলুন আপনার ব্যবসা।
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/register"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold px-8 py-4 rounded-2xl text-sm transition shadow-lg shadow-emerald-500/20"
            >
              Reseller হিসেবে শুরু করুন
            </Link>
            <Link
              href="#packages"
              className="border border-slate-300 hover:bg-white bg-white/60 text-slate-700 font-semibold px-8 py-4 rounded-2xl text-sm transition shadow-sm"
            >
              Package দেখুন
            </Link>
          </div>
        </section>

        {/* INTRODUCTION SECTION */}
        <section className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 sm:p-14 shadow-sm">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              Online Reselling Business শুরু করা এখন আরও সহজ
            </h2>
            <div className="text-sm sm:text-base text-slate-600 space-y-4 leading-relaxed">
              <p>
                অনলাইনে ব্যবসা শুরু করতে সবসময় বড় অংকের বিনিয়োগ বা বিশাল Stock প্রয়োজন হয় না।
              </p>
              <p>
                Resell Bari আপনাকে দিচ্ছে একটি সহজ Reselling System—যেখানে আপনি আমাদের কাছ থেকে Wholesale Price-এ পণ্য সংগ্রহ করে Facebook, Website, TikTok, WhatsApp কিংবা অন্যান্য মাধ্যমে বিক্রি করতে পারবেন।
              </p>
              <p className="font-semibold text-emerald-600">
                আপনার মূল কাজ হবে Customer তৈরি করা ও বিক্রি করা। আর Product sourcing এবং Reseller সুবিধার জন্য থাকছে Resell Bari-এর সহযোগিতা।
              </p>
            </div>
          </div>
        </section>

        {/* WHY CHOOSE */}
        <section id="why-choose" className="space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">কেন Resell Bari?</h2>
            <p className="text-sm sm:text-base text-slate-500">একটি সফল অনলাইন রিসেলিং ব্যবসা পরিচালনার জন্য প্রয়োজনীয় সকল সুযোগ-সুবিধা।</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-white border border-slate-200/80 p-6 sm:p-8 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl">💎</div>
              <h3 className="text-lg font-bold text-slate-900">Reseller-এর জন্য বিশেষ Price</h3>
              <p className="text-sm text-slate-600 leading-relaxed">সাধারণ ক্রেতার দামের পরিবর্তে Reseller সদস্যরা বিশেষ Wholesale Pricing সুবিধা পাবেন।</p>
            </div>

            <div className="bg-white border border-slate-200/80 p-6 sm:p-8 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl">🚀</div>
              <h3 className="text-lg font-bold text-slate-900">কম পুঁজিতে শুরু</h3>
              <p className="text-sm text-slate-600 leading-relaxed">বড় Stock নিয়ে শুরু করার চাপ ছাড়াই আপনার প্রয়োজন অনুযায়ী Reselling Business শুরু করতে পারবেন।</p>
            </div>

            <div className="bg-white border border-slate-200/80 p-6 sm:p-8 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl">📦</div>
              <h3 className="text-lg font-bold text-slate-900">বিভিন্ন Product-এর Access</h3>
              <p className="text-sm text-slate-600 leading-relaxed">আপনার Customer-এর চাহিদা অনুযায়ী available product থেকে পছন্দের পণ্য বেছে নিতে পারবেন।</p>
            </div>

            <div className="bg-white border border-slate-200/80 p-6 sm:p-8 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl">🤝</div>
              <h3 className="text-lg font-bold text-slate-900">Reseller Support</h3>
              <p className="text-sm text-slate-600 leading-relaxed">Product, Order এবং Reselling সংক্রান্ত প্রয়োজনীয় বিষয়ে আমাদের নির্ধারিত Support সুবিধা পাবেন।</p>
            </div>

            <div className="bg-white border border-slate-200/80 p-6 sm:p-8 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl">🏷️</div>
              <h3 className="text-lg font-bold text-slate-900">নিজের Selling Price</h3>
              <p className="text-sm text-slate-600 leading-relaxed">আপনার Market ও Business Strategy অনুযায়ী Selling Price নির্ধারণ করে নিজের Profit Margin তৈরি করতে পারবেন।</p>
            </div>

            <div className="bg-white border border-slate-200/80 p-6 sm:p-8 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl">📈</div>
              <h3 className="text-lg font-bold text-slate-900">Business Growth-এর সুযোগ</h3>
              <p className="text-sm text-slate-600 leading-relaxed">Customer ও Order বাড়ার সঙ্গে সঙ্গে Product Selection এবং Business Scale আরও বাড়ানোর সুযোগ থাকবে।</p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="space-y-12 scroll-mt-28">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">Resell Bari-এর সাথে কীভাবে কাজ করবেন?</h2>
            <p className="text-sm sm:text-base text-slate-500">সহজ ৫টি ধাপে শুরু করুন আপনার রিসেলিং জার্নি।</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-white border border-slate-200/80 p-6 rounded-3xl space-y-3 shadow-sm">
              <span className="text-xs font-mono text-emerald-600 font-bold">STEP 01</span>
              <h3 className="text-base font-bold text-slate-900">Membership নিন</h3>
              <p className="text-xs text-slate-500 leading-relaxed">আপনার প্রয়োজন অনুযায়ী Basic, Advance অথবা Premium Plan নির্বাচন করুন।</p>
            </div>

            <div className="bg-white border border-slate-200/80 p-6 rounded-3xl space-y-3 shadow-sm">
              <span className="text-xs font-mono text-emerald-600 font-bold">STEP 02</span>
              <h3 className="text-base font-bold text-slate-900">পণ্য নির্বাচন করুন</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Available Product Collection থেকে আপনার প্রয়োজনীয় পণ্য বেছে নিন।</p>
            </div>

            <div className="bg-white border border-slate-200/80 p-6 rounded-3xl space-y-3 shadow-sm">
              <span className="text-xs font-mono text-emerald-600 font-bold">STEP 03</span>
              <h3 className="text-base font-bold text-slate-900">Customer তৈরি করুন</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Facebook Page, Website, TikTok, WhatsApp বা অন্যান্য মাধ্যমে Product প্রচার করুন।</p>
            </div>

            <div className="bg-white border border-slate-200/80 p-6 rounded-3xl space-y-3 shadow-sm">
              <span className="text-xs font-mono text-emerald-600 font-bold">STEP 04</span>
              <h3 className="text-base font-bold text-slate-900">Order সংগ্রহ করুন</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Customer-এর কাছ থেকে Order নিয়ে Resell Bari-এর নিয়ম অনুযায়ী Product Order করুন।</p>
            </div>

            <div className="bg-white border border-slate-200/80 p-6 rounded-3xl space-y-3 shadow-sm">
              <span className="text-xs font-mono text-emerald-600 font-bold">STEP 05</span>
              <h3 className="text-base font-bold text-slate-900">Profit Margin তৈরি করুন</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Wholesale Cost এবং আপনার Selling Price-এর পার্থক্য থেকেই আপনার Business Margin তৈরি হবে।</p>
            </div>
          </div>
        </section>

        {/* PACKAGES */}
        <section id="packages" className="space-y-12 scroll-mt-28">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">আপনার জন্য উপযুক্ত Membership Plan বেছে নিন</h2>
            <p className="text-sm sm:text-base text-slate-500">আপনার প্রয়োজন অনুযায়ী যেকোনো একটি প্ল্যান সিলেক্ট করে আজই রিসেলিং শুরু করুন।</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* BASIC */}
            <div className="bg-white border border-slate-200/80 p-8 sm:p-10 rounded-3xl shadow-sm hover:shadow-md flex flex-col justify-between transition">
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider">Basic Reseller</h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-slate-900">349৳</span>
                    <span className="text-xs sm:text-sm text-slate-500">/ lifetime</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-4 leading-relaxed">যারা নতুনভাবে Reselling Business শুরু করতে চান তাদের জন্য।</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm">
                  <span className="text-slate-500 block font-semibold">Wholesale Advantage:</span>
                  <strong className="text-emerald-600 font-bold mt-1 block">Standard Wholesale Price</strong>
                </div>
                <div className="space-y-3.5 text-xs sm:text-sm text-slate-600 pt-4 border-t border-slate-100">
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold">✓</span> Membership Access</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold">✓</span> Standard Wholesale Price</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold">✓</span> Available Product Collection</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold">✓</span> Product Information</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold">✓</span> Reseller Support</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold">✓</span> নিজের Selling Price নির্ধারণের সুবিধা</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold">✓</span> Basic Business Guidance</p>
                </div>
              </div>
              <Link href="/register" className="mt-10 w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-4 px-6 rounded-2xl text-sm text-center transition border border-slate-200 block">
                Basic দিয়ে শুরু করুন
              </Link>
            </div>

            {/* ADVANCE */}
            <div className="bg-white border border-amber-200/80 p-8 sm:p-10 rounded-3xl shadow-sm hover:shadow-md flex flex-col justify-between transition">
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider">Advance Reseller</h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-amber-500">549৳</span>
                    <span className="text-xs sm:text-sm text-slate-500">/ lifetime</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-4 leading-relaxed">যারা নিয়মিত Reselling করতে চান এবং আরও ভালো Wholesale সুবিধা চান তাদের জন্য।</p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs sm:text-sm">
                  <span className="text-amber-700 block font-semibold">Wholesale Advantage:</span>
                  <strong className="text-amber-600 font-bold mt-1 block">Basic-এর তুলনায় 2% কম Wholesale Price</strong>
                </div>
                <div className="space-y-3.5 text-xs sm:text-sm text-slate-600 pt-4 border-t border-slate-100">
                  <p className="flex items-center gap-3"><span className="text-amber-500 font-bold">✓</span> Basic-এর সব সুবিধা</p>
                  <p className="flex items-center gap-3"><span className="text-amber-500 font-bold">✓</span> Basic-এর তুলনায় 2% কম Wholesale Price</p>
                  <p className="flex items-center gap-3"><span className="text-amber-500 font-bold">✓</span> Regular Reseller Support</p>
                  <p className="flex items-center gap-3"><span className="text-amber-500 font-bold">✓</span> New Product Information</p>
                  <p className="flex items-center gap-3"><span className="text-amber-500 font-bold">✓</span> Business Growth Guidance</p>
                  <p className="flex items-center gap-3"><span className="text-amber-500 font-bold">✓</span> Product Selection Support</p>
                  <p className="flex items-center gap-3"><span className="text-amber-500 font-bold">✓</span> বেশি Margin তৈরির সুযোগ</p>
                </div>
              </div>
              <Link href="/register" className="mt-10 w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-4 px-6 rounded-2xl text-sm text-center transition shadow-md shadow-amber-500/20 block">
                Advance বেছে নিন
              </Link>
            </div>

            {/* PREMIUM */}
            <div className="bg-white border-2 border-emerald-500 p-8 sm:p-10 rounded-3xl shadow-xl shadow-emerald-500/10 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-5 right-5 bg-emerald-500 text-white text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-sm">
                Best Value
              </div>
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 uppercase tracking-wider">Premium Reseller</h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-emerald-600">999৳</span>
                    <span className="text-xs sm:text-sm text-slate-500">/ lifetime</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-4 leading-relaxed">যারা Reselling Business-কে আরও সিরিয়াসভাবে বড় করতে চান তাদের জন্য।</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs sm:text-sm">
                  <span className="text-emerald-800 block font-semibold">Wholesale Advantage:</span>
                  <strong className="text-emerald-600 font-bold mt-1 block">Basic-এর তুলনায় 4% কম Wholesale Price</strong>
                </div>
                <div className="space-y-3.5 text-xs sm:text-sm text-slate-600 pt-4 border-t border-slate-100">
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold">✓</span> Advance-এর সব সুবিধা</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold">✓</span> Basic-এর তুলনায় 4% কম Wholesale Price</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold">✓</span> Priority Reseller Support</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold">✓</span> New Product Information-এর Priority Access</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold">✓</span> Product Selection Support</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold">✓</span> Business Growth Guidance</p>
                  <p className="flex items-center gap-3"><span className="text-emerald-500 font-bold">✓</span> বেশি Profit Margin তৈরির সুযোগ</p>
                </div>
              </div>
              <Link href="/register" className="mt-10 w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold py-4 px-6 rounded-2xl text-sm text-center transition shadow-lg shadow-emerald-500/25 block">
                Premium দিয়ে Business Grow করুন
              </Link>
            </div>
          </div>
        </section>

        {/* 🛍️ PRODUCTS SHOWCASE SECTION (MOBILE 2-COLUMNS & BLINKING REGISTER BUTTON) 🛍️ */}
        <section id="products" className="space-y-8 sm:space-y-12 scroll-mt-28">
          <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-full text-xs font-bold text-emerald-700 shadow-sm">
              ✨ Top Trending Products
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900">
              আমাদের প্রোডাক্ট কালেকশন
            </h2>
            <p className="text-xs sm:text-base text-slate-500">
              ক্যাটাগরি অনুযায়ী ট্রেন্ডিং প্রোডাক্টগুলো দেখুন এবং রিসেলিং শুরু করতে রেজিস্টার করুন।
            </p>
          </div>

          {/* CATEGORY FILTER BUTTONS */}
          {categories.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 sm:gap-3 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 sm:px-5 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-105'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 shadow-sm'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* PRODUCTS GRID (MOBILE 2 COLUMNS: grid-cols-2) */}
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-sm font-semibold">
              লোড হচ্ছে...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm font-semibold bg-white rounded-3xl border border-slate-200 shadow-sm">
              এই ক্যাটাগরিতে বর্তমানে কোনো প্রোডাক্ট নেই।
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-emerald-500/5 group"
                >
                  <div>
                    {/* Product Image */}
                    <div className="w-full h-36 sm:h-52 bg-slate-100 rounded-xl sm:rounded-2xl overflow-hidden mb-2.5 sm:mb-4 border border-slate-100 flex items-center justify-center relative">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title || product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <span className="text-slate-400 text-xs font-semibold">No Image</span>
                      )}
                      {product.category && (
                        <span className="absolute top-1.5 sm:top-2.5 left-1.5 sm:left-2.5 bg-white/90 backdrop-blur-md border border-slate-200 text-slate-700 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                          {product.category}
                        </span>
                      )}
                    </div>

                    {/* Product Title */}
                    <h3 className="text-xs sm:text-base font-bold text-slate-900 mb-2 line-clamp-2 leading-snug">
                      {product.title || product.name}
                    </h3>
                  </div>

                  {/* Details Call-to-Action & Blinking Register Button */}
                  <div className="mt-1 pt-2 sm:pt-3 border-t border-slate-100 flex flex-col gap-2">
                    <p className="text-[11px] sm:text-xs text-slate-600 font-semibold leading-relaxed text-center">
                      হোলসেল রেট ও স্টক দেখতে রেজিস্টার করুন
                    </p>
                    
                    {/* 🌟 BLINKING REGISTER BUTTON 🌟 */}
                    <Link
                      href="/register"
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm text-center transition shadow-md shadow-emerald-500/30 animate-pulse hover:animate-none"
                    >
                      Register Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/80 bg-white mt-20 sm:mt-32">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 py-12 grid grid-cols-1 md:grid-cols-4 gap-10 text-sm text-slate-600">
          <div className="space-y-4">
            <div className="flex items-center">
              <img 
                src="/logo.svg" 
                alt="Resell Bari" 
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="leading-relaxed text-xs sm:text-sm text-slate-500">
              বাংলাদেশের আধুনিক অনলাইন রিসেলিং প্ল্যাটফর্ম। Wholesale মূল্যে পণ্য সংগ্রহ করে আপনার নিজস্ব অনলাইন ব্যবসা পরিচালনা করুন।
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-slate-900 font-bold text-base">Quick Links</h4>
            <div className="flex flex-col space-y-2 text-xs sm:text-sm">
              <Link href="#packages" className="hover:text-emerald-600 transition">Packages</Link>
              <Link href="#products" className="hover:text-emerald-600 transition">Products</Link>
              <Link href="#how-it-works" className="hover:text-emerald-600 transition">How It Works</Link>
              <Link href="#why-choose" className="hover:text-emerald-600 transition">Why Us</Link>
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
              <Link href="/login" className="hover:text-emerald-600 transition">Login</Link>
              <Link href="/reseller" className="hover:text-emerald-600 transition">Reseller Dashboard</Link>
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