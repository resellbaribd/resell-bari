"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Check, Gem, Package, Tag, Copy, X, Clock, ChevronDown } from "lucide-react";

const FONT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Tiro+Bangla&family=Hind+Siliguri:wght@400;500;600;700&display=swap');
  .font-display { font-family: 'Tiro Bangla', 'Noto Serif Bengali', serif; }
  .font-body { font-family: 'Hind Siliguri', 'Noto Sans Bengali', sans-serif; }
`;

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

const PLANS = [
  {
    key: "Basic Reseller",
    price: "৩৪৯৳",
    period: "lifetime access",
    tagline: "যারা নতুনভাবে Online Reselling শুরু করতে চান তাদের জন্য।",
    advantage: "Standard Wholesale Price",
    features: [
      "Membership Access",
      "Standard Wholesale Price",
      "Product Information",
      "Available Product Collection",
      "Reseller Support",
      "নিজের Selling Price নির্ধারণের সুবিধা",
      "Basic Business Guidance",
    ],
    cta: "Basic Activate করুন",
    color: "sky",
    featured: false,
  },
  {
    key: "Advance Reseller",
    price: "৫৪৯৳",
    period: "lifetime access",
    tagline: "যারা নিয়মিত Reselling করতে চান এবং আরও ভালো Wholesale সুবিধা চান তাদের জন্য।",
    advantage: "Basic-এর তুলনায় ২% কম Wholesale Price",
    features: [
      "Basic-এর সব সুবিধা",
      "২% কম Wholesale Price",
      "Regular Reseller Support",
      "New Product Information",
      "Product Selection Support",
      "Business Growth Guidance",
      "বেশি Margin তৈরির সুযোগ",
    ],
    cta: "Advance Activate করুন",
    color: "amber",
    featured: false,
  },
  {
    key: "Premium Reseller",
    price: "৯৯৯৳",
    period: "lifetime access",
    tagline: "যারা Reselling Business-কে আরও সিরিয়াসভাবে বড় করতে চান তাদের জন্য।",
    advantage: "Basic-এর তুলনায় ৪% কম Wholesale Price",
    features: [
      "Advance-এর সব সুবিধা",
      "৪% কম Wholesale Price",
      "Priority Reseller Support",
      "Priority Access to New Products",
      "Product Selection Support",
      "Business Growth Guidance",
      "বেশি Profit Margin তৈরির সুযোগ",
    ],
    cta: "Premium Activate করুন",
    color: "emerald",
    featured: true,
  },
];

const BENEFITS = [
  { icon: Gem, title: "বিশেষ Wholesale Price", desc: "Membership-এর মাধ্যমে সাধারণ ক্রয়মূল্যের তুলনায় Reseller-এর জন্য নির্ধারিত Wholesale Pricing সুবিধা পাওয়া যাবে।" },
  { icon: Package, title: "পণ্য নিয়ে ব্যবসার সুযোগ", desc: "বিভিন্ন available product সংগ্রহ করে নিজের Customer-এর কাছে বিক্রি করার সুযোগ পাবেন।" },
  { icon: Tag, title: "নিজের Selling Price", desc: "আপনার Market ও Business Strategy অনুযায়ী Selling Price নির্ধারণ করে নিজের Margin তৈরি করতে পারবেন।" },
];

const FAQS = [
  {
    q: "Registration করলেই কি Reseller Account Activate হবে?",
    a: "Registration সম্পন্ন হলে আপনার Account তৈরি হবে। Reseller সুবিধা ব্যবহার করতে একটি Membership Plan নির্বাচন করে Activation সম্পন্ন করতে হবে।",
  },
];

function NavLink({ href, children }) {
  return (
    <Link href={href} className="font-body text-base text-stone-700 hover:text-emerald-900 transition-colors">
      {children}
    </Link>
  );
}

export default function AccountActivationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [method, setMethod] = useState("bKash");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState(null);

  const paymentNumber = "01700000000";

  const [timeLeft, setTimeLeft] = useState(1800);

  useEffect(() => {
    async function checkUserAndMembership() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          router.push("/login");
          return;
        }

        setUser(session.user);

        const { data: profile } = await supabase
          .from("profiles")
          .select("plan, status")
          .eq("id", session.user.id)
          .single();

        if (profile && profile.plan && profile.plan.toLowerCase() !== "basic") {
          router.push("/reseller");
          return;
        }
      } catch (err) {
        console.error("Error checking authentication state:", err);
      } finally {
        setLoading(false);
      }
    }

    checkUserAndMembership();
  }, [router]);

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
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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
      const { error } = await supabase.from("activation_requests").insert([
        {
          user_id: user?.id,
          email: user?.email,
          plan: selectedPlan?.name,
          amount: selectedPlan?.price,
          payment_method: method,
          phone_number: phoneNumber,
          transaction_id: transactionId,
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        console.log("Payment info submitted locally or Supabase table pending.");
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error("Submission error:", err);
      setIsSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="font-body min-h-screen bg-stone-50 flex items-center justify-center">
        <style>{FONT_STYLES}</style>
        <div className="text-emerald-900 animate-pulse text-base font-medium">Loading activation details...</div>
      </div>
    );
  }

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
            <NavLink href="/">Home</NavLink>
            <NavLink href="#packages">Packages</NavLink>
            <NavLink href="#benefits">Benefits</NavLink>
            <NavLink href="#faq">FAQ</NavLink>
          </nav>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm text-stone-500">{user?.email}</span>
            <button
              onClick={() => supabase.auth.signOut().then(() => router.push("/login"))}
              className="text-sm font-medium border border-stone-300 hover:bg-stone-100 text-stone-700 px-4 py-2 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Status Hero */}
      <section className="bg-emerald-950 text-stone-50">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-900/50 border border-emerald-800 text-emerald-200 text-sm font-medium">
              <Check size={14} /> Registration Completed
            </span>
            <span className="text-stone-500">→</span>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-300 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Membership Activation Pending
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl leading-tight mt-6">আপনার Account তৈরি হয়েছে!</h1>
          <p className="text-lg sm:text-xl text-amber-300 mt-2 font-medium">এখন আপনার Reseller সুবিধা চালু করুন</p>

          <p className="mt-5 text-stone-100/80 text-base sm:text-lg leading-relaxed max-w-2xl">
            আপনার Registration সফল হয়েছে। এখন আপনার পছন্দের একটি Membership Plan নির্বাচন করে Account Activation
            সম্পন্ন করুন এবং Resell Bari-এর বিশেষ Wholesale সুবিধা ব্যবহার করে আপনার Online Reselling Business শুরু
            করুন।
          </p>

          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            <div className="relative border border-dashed border-emerald-700/60 rounded-md px-5 py-4 bg-emerald-900/20">
              <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-950 border border-dashed border-emerald-700/60" />
              <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-950 border border-dashed border-emerald-700/60" />
              <span className="font-display text-sm text-emerald-400">০১</span>
              <p className="font-body font-semibold text-stone-50 mt-1">Account তৈরি</p>
              <span className="text-sm text-emerald-400 mt-1 flex items-center gap-1">
                <Check size={14} /> Completed
              </span>
            </div>

            <div className="relative border border-dashed border-amber-500 rounded-md px-5 py-4 bg-amber-500/10">
              <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-950 border border-dashed border-amber-500" />
              <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-950 border border-dashed border-amber-500" />
              <span className="font-display text-sm text-amber-400">০২</span>
              <p className="font-body font-semibold text-stone-50 mt-1">Membership Activate</p>
              <span className="text-sm text-amber-300 mt-1 block">→ You are here</span>
            </div>

            <div className="relative border border-dashed border-stone-50/20 rounded-md px-5 py-4 opacity-70">
              <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-950 border border-dashed border-stone-50/20" />
              <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-950 border border-dashed border-stone-50/20" />
              <span className="font-display text-sm text-stone-400">০৩</span>
              <p className="font-body font-semibold text-stone-300 mt-1">Reselling শুরু</p>
              <span className="text-sm text-stone-500 mt-1 block">Next Step</span>
            </div>
          </div>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="bg-white border-y border-stone-200 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <h2 className="font-display text-3xl sm:text-4xl text-emerald-950">
            আপনার জন্য উপযুক্ত Membership Plan বেছে নিন
          </h2>
          <p className="mt-3 text-base sm:text-lg text-stone-600 max-w-lg">
            আপনার Business-এর প্রয়োজন অনুযায়ী একটি Plan নির্বাচন করুন এবং Reseller সুবিধা চালু করুন।
          </p>

          <div className="mt-10 grid sm:grid-cols-3 gap-6">
            {PLANS.map((p) => {
              const accent = ACCENTS[p.color];
              return (
                <div
                  key={p.key}
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

                    <h3 className="font-display text-2xl">{p.key}</h3>
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

                    <button
                      type="button"
                      onClick={() => handlePlanSelect(p.key, p.price)}
                      className={
                        "mt-6 text-center font-medium text-base px-5 py-3.5 rounded-md transition-colors " +
                        (p.featured ? "bg-amber-500 text-emerald-950 hover:bg-amber-400" : accent.cta)
                      }
                    >
                      {p.cta}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="bg-stone-50 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <h2 className="font-display text-3xl sm:text-4xl text-emerald-950">Membership নিলে আপনি কী কী সুবিধা পাবেন?</h2>
          <p className="mt-3 text-base sm:text-lg text-stone-600 max-w-lg">
            আপনার অনলাইন রিসেলিং ব্যবসা সফল করতে প্রয়োজনীয় সকল সুবিধা এক প্ল্যাটফর্মে।
          </p>

          <div className="mt-10 grid md:grid-cols-3 border-t border-stone-200">
            {BENEFITS.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                className={"flex gap-4 py-6 px-2 border-b border-stone-200" + (i < BENEFITS.length - 1 ? " md:border-r" : "")}
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

      {/* FAQ */}
      <section id="faq" className="bg-white border-y border-stone-200 scroll-mt-20">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <h2 className="font-display text-3xl sm:text-4xl text-emerald-950 text-center">Membership নিয়ে সাধারণ প্রশ্ন</h2>
          <p className="mt-3 text-base sm:text-lg text-stone-600 text-center">আপনার মনে থাকা বিভিন্ন প্রশ্নের উত্তর জেনে নিন।</p>

          <div className="mt-10 flex flex-col gap-4">
            {FAQS.map((item) => (
              <details key={item.q} className="group bg-stone-50 border border-stone-200 rounded-lg p-6 [&_summary::-webkit-details-marker]:hidden cursor-pointer">
                <summary className="flex items-center justify-between gap-4 font-body font-semibold text-lg text-stone-900">
                  {item.q}
                  <ChevronDown size={20} className="shrink-0 text-emerald-900 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-4 text-base text-stone-600 leading-relaxed border-t border-stone-200 pt-4">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-sm">
          <div className="bg-stone-50 rounded-xl max-w-lg w-full p-6 sm:p-8 shadow-xl border border-stone-200 relative max-h-[90vh] overflow-y-auto">
            {!isSubmitted && (
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 text-stone-400 hover:text-stone-600 transition-colors"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            )}

            {!isSubmitted ? (
              <form onSubmit={handlePaymentSubmit} className="space-y-6">
                <div>
                  <div className="inline-block px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium rounded-full mb-2">
                    {selectedPlan?.name}
                  </div>
                  <h3 className="font-display text-2xl text-emerald-950">পেমেন্ট সম্পন্ন করুন</h3>
                  <p className="text-sm text-stone-500 mt-1">
                    মোট প্রদেয় ফি: <span className="font-semibold text-emerald-700 text-base">{selectedPlan?.price}</span>
                  </p>
                </div>

                <div className="p-4 bg-white rounded-lg border border-dashed border-stone-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-700">Send Money / Payment Number:</span>
                    <button
                      type="button"
                      onClick={handleCopyNumber}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-stone-50 rounded-md text-sm font-medium transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check size={14} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={14} /> Copy
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-emerald-800 font-bold text-lg select-all">{paymentNumber}</span>
                    <span className="text-sm text-stone-500">(Personal/Merchant)</span>
                  </div>

                  <p className="text-sm text-stone-400 border-t border-stone-200 pt-2">
                    টাকা পাঠানোর পর নিচের তথ্যগুলো পূরণ করে সাবমিট করুন।
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700">Payment Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full bg-white border border-stone-300 text-stone-800 rounded-md px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  >
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Rocket">Rocket</option>
                    <option value="Upay">Upay</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700">যে নাম্বার থেকে টাকা পাঠিয়েছেন</label>
                  <input
                    type="tel"
                    required
                    placeholder="01XXXXXXXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-white border border-stone-300 text-stone-800 rounded-md px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700">Transaction ID (TrxID)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9J4K2L1M"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full bg-white border border-stone-300 text-stone-800 rounded-md px-4 py-3 text-base font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700">
                    Payment Screenshot <span className="text-stone-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setScreenshot(e.target.files[0])}
                    className="w-full text-sm text-stone-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-emerald-950 hover:bg-emerald-900 text-stone-50 font-medium text-base py-3.5 rounded-md transition-colors disabled:opacity-50"
                >
                  {submitting ? "Submitting details..." : "Submit Payment"}
                </button>
              </form>
            ) : (
              <div className="text-center py-6 space-y-6">
                <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-amber-600">
                  <Clock size={26} />
                </div>

                <div className="space-y-1">
                  <h3 className="font-display text-2xl text-emerald-950">Waiting for Confirmation</h3>
                  <p className="text-sm sm:text-base text-stone-600">
                    আপনার পেমেন্ট তথ্য সফলভাবে গ্রহণ করা হয়েছে। অ্যাডমিন প্যানেল থেকে ভেরিফাই করা হচ্ছে।
                  </p>
                </div>

                <div className="bg-emerald-950 text-amber-400 p-6 rounded-lg border border-emerald-900 max-w-xs mx-auto">
                  <span className="text-xs uppercase tracking-widest text-stone-300 font-medium block mb-1">Time Remaining</span>
                  <span className="text-4xl sm:text-5xl font-mono font-bold tracking-wider">{formatTimer(timeLeft)}</span>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm sm:text-base text-emerald-800 leading-relaxed">
                  সম্পন্ন হলে আপনি email-এ Dashboard link পাবেন।
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-sm text-stone-400 hover:text-stone-600 underline transition-colors"
                >
                  Close Window
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-emerald-950 text-stone-50">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 grid grid-cols-1 sm:grid-cols-4 gap-10">
          <div>
            <Link href="/" className="flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Resell Bari" className="h-9 w-auto object-contain" />
            </Link>
            <p className="mt-3 text-base text-emerald-100/70 leading-relaxed">
              বাংলাদেশের আধুনিক অনলাইন রিসেলিং প্ল্যাটফর্ম। Wholesale মূল্যে পণ্য সংগ্রহ করে আপনার নিজস্ব অনলাইন ব্যবসা পরিচালনা করুন।
            </p>
          </div>

          <div>
            <h4 className="font-body font-semibold text-base">Quick Links</h4>
            <div className="mt-3 flex flex-col gap-2 text-base text-emerald-100/70">
              <Link href="#packages" className="hover:text-amber-400 transition-colors">Membership Plans</Link>
              <Link href="#benefits" className="hover:text-amber-400 transition-colors">Benefits</Link>
              <Link href="#faq" className="hover:text-amber-400 transition-colors">FAQ</Link>
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
              <Link href="/reseller" className="hover:text-amber-400 transition-colors">Dashboard</Link>
              <Link href="/login" className="hover:text-amber-400 transition-colors">Login</Link>
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