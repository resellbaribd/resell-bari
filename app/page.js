"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Gem,
  Rocket,
  Package,
  Handshake,
  Tag,
  TrendingUp,
  Menu,
  X,
  Check,
} from "lucide-react";

const FONT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Tiro+Bangla&family=Hind+Siliguri:wght@400;500;600;700&display=swap');
  .font-display { font-family: 'Tiro Bangla', 'Noto Serif Bengali', serif; }
  .font-body { font-family: 'Hind Siliguri', 'Noto Sans Bengali', sans-serif; }
`;

function Ticket({ children, className = "" }) {
  return (
    <div
      className={
        "relative border border-dashed border-stone-300 rounded-md px-5 py-3 " +
        className
      }
    >
      <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-stone-50 border border-dashed border-stone-300" />
      <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-stone-50 border border-dashed border-stone-300" />
      {children}
    </div>
  );
}

function PackageIllustration() {
  return (
    <svg viewBox="0 0 380 340" className="w-full max-w-sm mx-auto" role="img" aria-label="Wholesale package illustration">
      <rect x="40" y="150" width="130" height="110" rx="6" fill="#065f46" opacity="0.12" />
      <rect x="40" y="150" width="130" height="110" rx="6" fill="none" stroke="#065f46" strokeWidth="2" />
      <line x1="105" y1="150" x2="105" y2="260" stroke="#065f46" strokeWidth="2" />
      <line x1="40" y1="200" x2="170" y2="200" stroke="#065f46" strokeWidth="2" opacity="0.4" />

      <rect x="180" y="110" width="150" height="150" rx="6" fill="#065f46" opacity="0.9" />
      <line x1="255" y1="110" x2="255" y2="260" stroke="#f5f5f4" strokeWidth="2" opacity="0.5" />
      <line x1="180" y1="185" x2="330" y2="185" stroke="#f5f5f4" strokeWidth="2" opacity="0.5" />

      <rect x="150" y="60" width="90" height="70" rx="6" fill="#d97706" opacity="0.9" />
      <line x1="195" y1="60" x2="195" y2="130" stroke="#fffbeb" strokeWidth="2" opacity="0.6" />

      <g transform="translate(276 44) rotate(18)">
        <path d="M0 10 Q0 0 10 0 H50 Q60 0 60 10 V38 Q60 48 50 48 H10 Q0 48 0 38 Z" fill="#fef3c7" stroke="#d97706" strokeWidth="2" />
        <circle cx="16" cy="14" r="4" fill="none" stroke="#d97706" strokeWidth="2" />
        <line x1="16" y1="18" x2="16" y2="40" stroke="#d97706" strokeWidth="1.5" strokeDasharray="2 3" />
        <text x="30" y="30" fontSize="14" fontWeight="700" fill="#92400e" textAnchor="middle">৳</text>
      </g>

      <circle cx="330" cy="270" r="26" fill="none" stroke="#d97706" strokeWidth="2" strokeDasharray="3 3" />
      <text x="330" y="275" fontSize="11" fill="#92400e" textAnchor="middle" fontWeight="600">Wholesale</text>

      <line x1="40" y1="272" x2="330" y2="272" stroke="#a8a29e" strokeWidth="1.5" strokeDasharray="4 4" />
    </svg>
  );
}

function FlowDiagram() {
  const steps = ["Source", "Sell", "Profit"];
  return (
    <div className="flex items-center justify-between gap-2 max-w-sm mx-auto py-6">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2 flex-1">
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-14 h-14 rounded-full border-2 border-emerald-900 flex items-center justify-center bg-white">
              <span className="font-display text-emerald-900 text-sm">{i + 1}</span>
            </div>
            <span className="font-body text-sm text-stone-600 text-center">{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="h-px flex-1 bg-emerald-900/30 -mt-6" />
          )}
        </div>
      ))}
    </div>
  );
}

const FEATURES = [
  { icon: Gem, title: "Reseller-এর জন্য বিশেষ Price", desc: "সাধারণ ক্রেতার দামের পরিবর্তে Reseller সদস্যরা বিশেষ Wholesale Pricing সুবিধা পাবেন।" },
  { icon: Rocket, title: "কম পুঁজিতে শুরু", desc: "বড় Stock নিয়ে শুরু করার চাপ ছাড়াই আপনার প্রয়োজন অনুযায়ী Reselling Business শুরু করতে পারবেন।" },
  { icon: Package, title: "বিভিন্ন Product-এর Access", desc: "আপনার Customer-এর চাহিদা অনুযায়ী available product থেকে পছন্দের পণ্য বেছে নিতে পারবেন।" },
  { icon: Handshake, title: "Reseller Support", desc: "Product, Order এবং Reselling সংক্রান্ত প্রয়োজনীয় বিষয়ে আমাদের নির্ধারিত Support সুবিধা পাবেন।" },
  { icon: Tag, title: "নিজের Selling Price", desc: "আপনার Market ও Business Strategy অনুযায়ী Selling Price নির্ধারণ করে নিজের Profit Margin তৈরি করতে পারবেন।" },
  { icon: TrendingUp, title: "Business Growth-এর সুযোগ", desc: "Customer ও Order বাড়ার সঙ্গে সঙ্গে Product Selection এবং Business Scale আরও বাড়ানোর সুযোগ থাকবে।" },
];

const STEPS = [
  { n: "০১", title: "Membership নিন", desc: "আপনার প্রয়োজন অনুযায়ী Basic, Advance অথবা Premium Plan নির্বাচন করুন।" },
  { n: "০২", title: "পণ্য নির্বাচন করুন", desc: "Available Product Collection থেকে আপনার প্রয়োজনীয় পণ্য বেছে নিন।" },
  { n: "০৩", title: "Customer তৈরি করুন", desc: "Facebook Page, Website, TikTok, WhatsApp বা অন্যান্য মাধ্যমে Product প্রচার করুন।" },
  { n: "০৪", title: "Order সংগ্রহ করুন", desc: "Customer-এর কাছ থেকে Order নিয়ে Resell Bari-এর নিয়ম অনুযায়ী Product Order করুন।" },
  { n: "০৫", title: "Profit Margin তৈরি করুন", desc: "Wholesale Cost এবং আপনার Selling Price-এর পার্থক্য থেকেই আপনার Business Margin তৈরি হবে।" },
];

const PLANS = [
  {
    name: "Basic Reseller",
    price: "৩৪৯৳",
    period: "lifetime",
    tagline: "যারা নতুনভাবে Reselling Business শুরু করতে চান তাদের জন্য।",
    advantage: "Standard Wholesale Price",
    features: [
      "Membership Access",
      "Standard Wholesale Price",
      "Available Product Collection",
      "Product Information",
      "Reseller Support",
      "নিজের Selling Price নির্ধারণের সুবিধা",
      "Basic Business Guidance",
    ],
    cta: "Basic দিয়ে শুরু করুন",
    color: "sky",
    featured: false,
  },
  {
    name: "Advance Reseller",
    price: "৫৪৯৳",
    period: "lifetime",
    tagline: "যারা নিয়মিত Reselling করতে চান এবং আরও ভালো Wholesale সুবিধা চান তাদের জন্য।",
    advantage: "Basic-এর তুলনায় ২% কম Wholesale Price",
    features: [
      "Basic-এর সব সুবিধা",
      "Basic-এর তুলনায় ২% কম Wholesale Price",
      "Regular Reseller Support",
      "New Product Information",
      "Business Growth Guidance",
      "Product Selection Support",
      "বেশি Margin তৈরির সুযোগ",
    ],
    cta: "Advance বেছে নিন",
    color: "amber",
    featured: false,
  },
  {
    name: "Premium Reseller",
    price: "৯৯৯৳",
    period: "lifetime",
    tagline: "যারা Reselling Business-কে আরও সিরিয়াসভাবে বড় করতে চান তাদের জন্য।",
    advantage: "Basic-এর তুলনায় ৪% কম Wholesale Price",
    features: [
      "Advance-এর সব সুবিধা",
      "Basic-এর তুলনায় ৪% কম Wholesale Price",
      "Priority Reseller Support",
      "New Product Information-এর Priority Access",
      "Product Selection Support",
      "Business Growth Guidance",
      "বেশি Profit Margin তৈরির সুযোগ",
    ],
    cta: "Premium দিয়ে Business Grow করুন",
    color: "emerald",
    featured: true,
  },
];

const ACCENTS = {
  sky: {
    bar: "bg-sky-500",
    price: "text-sky-700",
    chip: "bg-sky-50 border-sky-200 text-sky-700",
    check: "text-sky-600",
    cta: "bg-sky-600 hover:bg-sky-700 text-white",
  },
  amber: {
    bar: "bg-amber-500",
    price: "text-amber-700",
    chip: "bg-amber-50 border-amber-200 text-amber-700",
    check: "text-amber-600",
    cta: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  emerald: {
    bar: "bg-emerald-600",
  },
};

function NavLink({ href, children, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="font-body text-base text-stone-700 hover:text-emerald-900 transition-colors"
    >
      {children}
    </Link>
  );
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setProducts(data);
        const uniqueCats = ["All", ...new Set(data.map((item) => item.category).filter(Boolean))];
        setCategories(uniqueCats);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts =
    selectedCategory === "All" ? products : products.filter((p) => p.category === selectedCategory);

  const navItems = [
    { href: "#how-it-works", label: "How It Works" },
    { href: "#packages", label: "Packages" },
    { href: "#products", label: "Products" },
    { href: "#why-choose", label: "Why Us" },
  ];

  return (
    <div className="font-body bg-stone-50 text-stone-800 min-h-screen">
      <style>{FONT_STYLES}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-stone-50/95 backdrop-blur border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Resell Bari" className="h-11 sm:h-12 w-auto object-contain" />
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {navItems.map((n) => (
              <NavLink key={n.href} href={n.href}>{n.label}</NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="font-body text-base text-stone-700 hover:text-emerald-900 transition-colors">Login</Link>
            <Link
              href="/register"
              className="font-body text-base bg-emerald-950 text-stone-50 px-4 py-2.5 rounded-md hover:bg-emerald-900 transition-colors"
            >
              Become a Reseller
            </Link>
          </div>

          <button
            className="md:hidden p-2 text-stone-700"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-stone-200 bg-stone-50 px-5 py-4 flex flex-col gap-4">
            {navItems.map((n) => (
              <NavLink key={n.href} href={n.href} onClick={() => setMenuOpen(false)}>{n.label}</NavLink>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-stone-200">
              <Link href="/login" className="font-body text-base text-stone-700">Login</Link>
              <Link href="/register" className="font-body text-base bg-emerald-950 text-stone-50 px-4 py-2.5 rounded-md text-center">
                Become a Reseller
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="bg-emerald-950 text-stone-50">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.25rem] leading-tight text-stone-50">
              পণ্য আমাদের, ব্যবসা আপনার—Wholesale সুবিধা সহ Resell Bari-এর!
            </h1>
            <p className="mt-5 text-emerald-100/90 text-lg sm:text-xl leading-relaxed max-w-md">
              কম পুঁজি দিয়ে শুরু করুন নিজের Online Reselling Business। আমাদের কাছ থেকে Wholesale Price-এ পণ্য সংগ্রহ করুন, নিজের Customer তৈরি করুন এবং ধীরে ধীরে গড়ে তুলুন আপনার ব্যবসা।
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="bg-amber-500 text-emerald-950 font-medium text-base sm:text-lg px-7 py-3.5 rounded-md hover:bg-amber-400 transition-colors">
                Reseller হিসেবে শুরু করুন
              </Link>
              <Link href="#packages" className="border border-stone-50/30 text-stone-50 text-base sm:text-lg px-7 py-3.5 rounded-md hover:bg-stone-50/10 transition-colors">
                Package দেখুন
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Ticket className="border-stone-50/25">
                <span className="text-sm text-stone-50/90">৩টি Membership Plan</span>
              </Ticket>
              <Ticket className="border-stone-50/25">
                <span className="text-sm text-stone-50/90">Special Wholesale Price</span>
              </Ticket>
              <Ticket className="border-stone-50/25">
                <span className="text-sm text-stone-50/90">Reseller Support</span>
              </Ticket>
            </div>
          </div>

          <div className="bg-stone-50 rounded-xl p-6">
            <PackageIllustration />
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl text-emerald-950">
            Online Reselling Business শুরু করা এখন আরও সহজ
          </h2>
          <p className="mt-4 text-base sm:text-lg text-stone-600 leading-relaxed">
            অনলাইনে ব্যবসা শুরু করতে সবসময় বড় অংকের বিনিয়োগ বা বিশাল Stock প্রয়োজন হয় না।
          </p>
          <p className="mt-3 text-base sm:text-lg text-stone-600 leading-relaxed">
            Resell Bari আপনাকে দিচ্ছে একটি সহজ Reselling System—যেখানে আপনি আমাদের কাছ থেকে Wholesale Price-এ পণ্য সংগ্রহ করে Facebook, Website, TikTok, WhatsApp কিংবা অন্যান্য মাধ্যমে বিক্রি করতে পারবেন।
          </p>
          <p className="mt-3 text-base sm:text-lg text-stone-600 leading-relaxed">
            আপনার মূল কাজ হবে Customer তৈরি করা ও বিক্রি করা। আর Product sourcing এবং Reseller সুবিধার জন্য থাকছে Resell Bari-এর সহযোগিতা।
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl">
          <FlowDiagram />
        </div>
      </section>

      {/* Why Choose */}
      <section id="why-choose" className="bg-white border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <h2 className="font-display text-3xl sm:text-4xl text-emerald-950">কেন Resell Bari?</h2>
          <p className="mt-3 text-base sm:text-lg text-stone-600 max-w-lg">
            একটি সফল অনলাইন রিসেলিং ব্যবসা পরিচালনার জন্য প্রয়োজনীয় সকল সুযোগ-সুবিধা।
          </p>

          <div className="mt-10 grid md:grid-cols-2 border-t border-stone-200">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                className={
                  "flex gap-4 py-6 px-2 border-b border-stone-200" +
                  (i % 2 === 0 ? " md:border-r" : "")
                }
              >
                <div className="w-10 h-10 shrink-0 rounded-md bg-emerald-950 text-stone-50 flex items-center justify-center">
                  <Icon size={18} />
                </div>
                <div>
                  <h3 className="font-body font-semibold text-lg text-stone-900">{title}</h3>
                  <p className="mt-1 text-base text-stone-600 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-stone-50">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <h2 className="font-display text-3xl sm:text-4xl text-emerald-950">
            Resell Bari-এর সাথে কীভাবে কাজ করবেন?
          </h2>
          <p className="mt-3 text-base sm:text-lg text-stone-600 max-w-lg">
            সহজ ৫টি ধাপে শুরু করুন আপনার রিসেলিং জার্নি।
          </p>

          <div className="mt-10 relative">
            <div className="hidden sm:block absolute left-6 top-2 bottom-2 w-px bg-emerald-900/20" />
            <div className="flex flex-col gap-8">
              {STEPS.map((s) => (
                <div key={s.n} className="flex gap-5 items-start relative">
                  <div className="w-12 h-12 shrink-0 rounded-full bg-emerald-950 text-stone-50 flex items-center justify-center font-display text-sm z-10">
                    {s.n}
                  </div>
                  <div className="pt-1.5">
                    <h3 className="font-body font-semibold text-lg text-stone-900">{s.title}</h3>
                    <p className="mt-1 text-base text-stone-600 leading-relaxed max-w-md">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="bg-white border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <h2 className="font-display text-3xl sm:text-4xl text-emerald-950">
            আপনার জন্য উপযুক্ত Membership Plan বেছে নিন
          </h2>
          <p className="mt-3 text-base sm:text-lg text-stone-600 max-w-lg">
            আপনার প্রয়োজন অনুযায়ী যেকোনো একটি প্ল্যান সিলেক্ট করে আজই রিসেলিং শুরু করুন।
          </p>

          <div className="mt-10 grid sm:grid-cols-3 gap-6">
            {PLANS.map((p) => {
              const accent = ACCENTS[p.color];
              return (
                <div
                  key={p.name}
                  className={
                    "rounded-xl overflow-hidden border flex flex-col " +
                    (p.featured ? "border-emerald-900 bg-emerald-950 text-stone-50" : "border-stone-200 bg-white")
                  }
                >
                  <div className={"h-2 " + accent.bar} />
                  <div className="p-6 flex flex-col flex-1 relative">
                    {p.featured && (
                      <span className="absolute top-5 right-5 bg-amber-500 text-emerald-950 text-xs font-medium px-3 py-1 rounded-full">
                        Best Value
                      </span>
                    )}

                    <h3 className="font-display text-2xl">{p.name}</h3>
                    <div className="mt-3 flex items-baseline gap-1.5">
                      <span className={"font-display text-4xl " + (p.featured ? "text-stone-50" : accent.price)}>
                        {p.price}
                      </span>
                      <span className={"text-sm " + (p.featured ? "text-emerald-200" : "text-stone-500")}>
                        / {p.period}
                      </span>
                    </div>
                    <p className={"mt-2 text-base leading-relaxed " + (p.featured ? "text-emerald-100/80" : "text-stone-500")}>
                      {p.tagline}
                    </p>

                    <div
                      className={
                        "mt-4 rounded-md border px-3.5 py-2.5 text-sm font-medium " +
                        (p.featured ? "bg-emerald-900/50 border-emerald-800 text-amber-300" : accent.chip)
                      }
                    >
                      {p.advantage}
                    </div>

                    <ul className="mt-5 flex flex-col gap-3 flex-1">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-base">
                          <Check size={18} className={"shrink-0 mt-0.5 " + (p.featured ? "text-amber-400" : accent.check)} />
                          <span className={p.featured ? "text-stone-100" : "text-stone-700"}>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/register"
                      className={
                        "mt-6 text-center font-medium text-base px-5 py-3.5 rounded-md transition-colors " +
                        (p.featured ? "bg-amber-500 text-emerald-950 hover:bg-amber-400" : accent.cta)
                      }
                    >
                      {p.cta}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="bg-stone-50">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <span className="text-sm font-medium text-amber-700">Top Trending Products</span>
          <h2 className="font-display text-3xl sm:text-4xl text-emerald-950 mt-2">
            আমাদের প্রোডাক্ট কালেকশন
          </h2>
          <p className="mt-3 text-base sm:text-lg text-stone-600 max-w-lg">
            ক্যাটাগরি অনুযায়ী ট্রেন্ডিং প্রোডাক্টগুলো দেখুন এবং রিসেলিং শুরু করতে রেজিস্টার করুন।
          </p>

          {categories.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={
                    "px-4 py-2 rounded-full text-sm font-medium border transition-colors " +
                    (selectedCategory === cat
                      ? "bg-emerald-950 border-emerald-950 text-stone-50"
                      : "bg-white border-stone-300 text-stone-600 hover:border-emerald-900 hover:text-emerald-900")
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white border border-stone-200 rounded-lg h-52 animate-pulse" />
                ))
              : filteredProducts.map((p) => (
                  <div key={p.id} className="bg-white border border-stone-200 rounded-lg overflow-hidden flex flex-col">
                    <div className="h-28 sm:h-32 bg-emerald-950/5 flex items-center justify-center overflow-hidden">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image_url} alt={p.title || p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={26} className="text-emerald-900/40" />
                      )}
                    </div>
                    <div className="p-3.5 sm:p-4 flex flex-col flex-1">
                      {p.category && <span className="text-sm text-stone-500">{p.category}</span>}
                      <h3 className="font-body font-semibold text-base sm:text-lg text-stone-900 mt-0.5 line-clamp-2">
                        {p.title || p.name}
                      </h3>
                      <p className="mt-2.5 text-sm text-stone-500 flex-1">হোলসেল রেট দেখতে রেজিস্টার করুন</p>
                      <Link
                        href="/register"
                        className="mt-3 text-center text-sm font-medium bg-emerald-950 text-stone-50 py-2.5 rounded-md hover:bg-emerald-900 transition-colors"
                      >
                        Register Now
                      </Link>
                    </div>
                  </div>
                ))}
          </div>

          {!loading && filteredProducts.length === 0 && (
            <p className="mt-10 text-center text-stone-500 text-base">
              এই ক্যাটাগরিতে বর্তমানে কোনো Product নেই।
            </p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-emerald-950 text-stone-50">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 grid grid-cols-1 sm:grid-cols-4 gap-10">
          <div>
            <span className="font-display text-xl">Resell Bari</span>
            <p className="mt-3 text-base text-emerald-100/70 leading-relaxed">
              বাংলাদেশের আধুনিক অনলাইন রিসেলিং প্ল্যাটফর্ম। Wholesale মূল্যে পণ্য সংগ্রহ করে আপনার নিজস্ব অনলাইন ব্যবসা পরিচালনা করুন।
            </p>
          </div>

          <div>
            <h4 className="font-body font-semibold text-base">Quick Links</h4>
            <div className="mt-3 flex flex-col gap-2 text-base text-emerald-100/70">
              <Link href="#packages" className="hover:text-amber-400 transition-colors">Packages</Link>
              <Link href="#products" className="hover:text-amber-400 transition-colors">Products</Link>
              <Link href="#how-it-works" className="hover:text-amber-400 transition-colors">How It Works</Link>
              <Link href="#why-choose" className="hover:text-amber-400 transition-colors">Why Us</Link>
            </div>
          </div>

          <div>
            <h4 className="font-body font-semibold text-base">Legal & Policies</h4>
            <div className="mt-3 flex flex-col gap-2 text-base text-emerald-100/70">
              <Link href="/terms" className="hover:text-amber-400 transition-colors">Terms & Conditions</Link>
              <Link href="/privacy" className="hover:text-amber-400 transition-colors">Privacy Policy</Link>
            </div>
          </div>

          <div>
            <h4 className="font-body font-semibold text-base">Account</h4>
            <div className="mt-3 flex flex-col gap-2 text-base text-emerald-100/70">
              <Link href="/login" className="hover:text-amber-400 transition-colors">Login</Link>
              <Link href="/reseller" className="hover:text-amber-400 transition-colors">Reseller Dashboard</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-stone-50/10 py-6 text-center text-sm text-emerald-100/50">
          &copy; {new Date().getFullYear()} Resell Bari. All rights reserved.
        </div>
      </footer>
    </div>
  );
}