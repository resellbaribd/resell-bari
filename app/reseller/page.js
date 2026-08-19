'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function ResellerDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [packages, setPackages] = useState([]);
  const [stats, setStats] = useState({ pending: 0, shipped: 0, profit: 0, totalPaid: 0, totalPendingPayout: 0 });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPkgModal, setShowPkgModal] = useState(false);

  // 🔴 Ban Countdown State
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: false, isPermanent: false });

  // Cancel Request Modal States
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    fetchProfileAndOrders();
    fetchPackages();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchProfileAndOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchProfileAndOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 🔴 Real-time Ban Countdown Timer Logic
  useEffect(() => {
    if (!profile?.is_banned) return;

    if (!profile?.ban_expires_at) {
      setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: false, isPermanent: true });
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expireTime = new Date(profile.ban_expires_at).getTime();
      const difference = expireTime - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true, isPermanent: false });
        fetchProfileAndOrders(); // Re-fetch to auto unlock dashboard
      } else {
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) + Math.floor(difference / (1000 * 60 * 60 * 24)) * 24;
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ hours, minutes, seconds, expired: false, isPermanent: false });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [profile]);

  async function fetchProfileAndOrders() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('reseller_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersData) {
        setOrders(ordersData);
        const pending = ordersData.filter((o) => o.status === 'pending' || o.status === 'confirmed').length;
        const shipped = ordersData.filter((o) => o.status === 'in_transit' || o.status === 'out_for_delivery' || o.status === 'delivered').length;
        
        const profit = ordersData.reduce((acc, o) => acc + Number(o.profit_amount || 0), 0);
        const totalPaid = ordersData.filter(o => o.payout_status === 'paid').reduce((acc, o) => acc + Number(o.profit_amount || 0), 0);
        const totalPendingPayout = ordersData.filter(o => o.status === 'delivered' && (!o.payout_status || o.payout_status === 'pending')).reduce((acc, o) => acc + Number(o.profit_amount || 0), 0);

        setStats({ pending, shipped, profit, totalPaid, totalPendingPayout });
      }
    } catch (err) {
      console.error('Data Load Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPackages() {
    try {
      const { data } = await supabase.from('packages').select('*').order('price', { ascending: true });
      if (data) setPackages(data);
    } catch (err) {
      console.error('Packages Load Error:', err);
    }
  }

  // 🔴 Send Cancel Request with Reason to Admin
  async function handleSendCancelRequest(e) {
    e.preventDefault();
    if (!cancelReason.trim()) return alert('Please enter a reason for cancellation!');
    setCancelLoading(true);

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancel_requested',
          cancel_reason: cancelReason,
          updated_at: new Date()
        })
        .eq('id', cancellingOrder.id);

      if (!error) {
        alert('Cancellation request sent to admin successfully!');
        setCancellingOrder(null);
        setCancelReason('');
        fetchProfileAndOrders();
      } else {
        alert('Error: ' + error.message);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const holdOrders = orders.filter(o => o.payout_status === 'hold');

  const trackingSteps = [
    { key: 'confirmed', label: 'Confirmed', icon: '📦' },
    { key: 'picked_up', label: 'Picked-up', icon: '🛒' },
    { key: 'in_transit', label: 'In Transit', icon: '🚚' },
    { key: 'out_for_delivery', label: 'Out for Delivery', icon: '🛵' },
    { key: 'delivered', label: 'Delivered', icon: '🤝' },
  ];

  function getStepIndex(status) {
    switch (status) {
      case 'confirmed': return 0;
      case 'picked_up': return 1;
      case 'in_transit': return 2;
      case 'out_for_delivery': return 3;
      case 'delivered': return 4;
      default: return -1;
    }
  }

  const currentPlan = profile?.plan?.toLowerCase() || 'basic';
  const planBadgeStyle = {
    basic: 'bg-slate-800 text-slate-300 border-slate-700', 
    advance: 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold', 
    premium: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold', 
  };

  const isEligibleForBlink = currentPlan === 'basic' || currentPlan === 'advance';
  const userAvatar = profile?.avatar_url || profile?.image_url || profile?.photo_url || profile?.profile_image;
  const isBanned = profile?.is_banned;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 sm:p-8 font-sans relative overflow-hidden">
      
      {/* 🛑 BAN OVERLAY (BLURS DASHBOARD WHEN SELLER IS BANNED) */}
      {isBanned && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border-2 border-rose-500/50 p-6 sm:p-8 rounded-3xl max-w-lg w-full text-center space-y-5 shadow-2xl shadow-rose-500/20"
          >
            <div className="w-20 h-20 bg-rose-500/20 border-2 border-rose-500/40 rounded-full flex items-center justify-center mx-auto text-4xl animate-bounce">
              🚫
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-rose-400 uppercase tracking-wide">
                Account Suspended
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Your reseller dashboard has been restricted by administration due to terms violation.
              </p>
            </div>

            {profile?.ban_reason && (
              <div className="bg-rose-950/50 border border-rose-900/60 p-4 rounded-2xl text-left space-y-1">
                <span className="text-[10px] uppercase font-bold text-rose-400 block tracking-wider">Reason for Suspension:</span>
                <p className="text-xs font-semibold text-slate-200 italic">"{profile.ban_reason}"</p>
              </div>
            )}

            {/* Countdown Box */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] text-slate-400 block uppercase font-bold tracking-wider mb-2">Access Restored In</span>
              {timeLeft.isPermanent ? (
                <p className="text-lg font-black text-rose-500 uppercase">Permanent Ban</p>
              ) : (
                <div className="flex justify-center items-center gap-3 text-white font-mono">
                  <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl">
                    <span className="text-xl font-bold text-emerald-400">{String(timeLeft.hours).padStart(2, '0')}</span>
                    <span className="text-[9px] block text-slate-400 uppercase font-sans">Hours</span>
                  </div>
                  <span className="text-xl font-bold text-slate-600">:</span>
                  <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl">
                    <span className="text-xl font-bold text-emerald-400">{String(timeLeft.minutes).padStart(2, '0')}</span>
                    <span className="text-[9px] block text-slate-400 uppercase font-sans">Mins</span>
                  </div>
                  <span className="text-xl font-bold text-slate-600">:</span>
                  <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl">
                    <span className="text-xl font-bold text-emerald-400">{String(timeLeft.seconds).padStart(2, '0')}</span>
                    <span className="text-[9px] block text-slate-400 uppercase font-sans">Secs</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-3 rounded-2xl text-xs transition"
            >
              🚪 Logout From Dashboard
            </button>
          </motion.div>
        </div>
      )}

      {/* Main Dashboard Container */}
      <div className={isBanned ? 'pointer-events-none select-none filter blur-md' : ''}>
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Profile Header */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10 shadow-2xl">
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-800 animate-pulse" />
            ) : (
              <img 
                src={userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                alt="Profile Avatar" 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-500/50 shadow-md"
              />
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  {loading ? 'Loading...' : (profile?.full_name || 'Reseller')}
                </h1>
                <span className={`text-[10px] sm:text-xs px-3 py-1 rounded-full border uppercase ${planBadgeStyle[currentPlan] || planBadgeStyle.basic}`}>
                  👑 {currentPlan} Member
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{loading ? '...' : (profile?.phone || '')}</p>
              <p className="text-xs text-emerald-400/90 mt-1 italic">{loading ? '...' : (profile?.bio || '')}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 w-full sm:w-auto items-center">
            {isEligibleForBlink && (
              <button
                onClick={() => setShowPkgModal(true)}
                className="flex-1 sm:flex-none bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-amber-300 font-extrabold px-4.5 py-3 rounded-2xl text-xs sm:text-sm shadow-xl shadow-purple-500/25 animate-pulse border border-amber-400/60 flex items-center justify-center gap-2 transition"
              >
                <span className="text-base drop-shadow-md">👑</span>
                <span className="text-white drop-shadow">Upgrade Package</span>
              </button>
            )}

            {/* 🛍️ Products Page Button */}
            <Link
              href="/products"
              className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-4 py-3 rounded-2xl font-semibold text-xs sm:text-sm transition text-center block shadow-md"
            >
              🛍️ Products
            </Link>

            <button 
              onClick={() => router.push('/profile')}
              className="flex-1 sm:flex-none border border-slate-700 hover:bg-slate-800 text-slate-200 px-4 py-3 rounded-2xl font-semibold text-xs sm:text-sm transition"
            >
              ⚙️ Edit Profile
            </button>
            <button 
              onClick={() => router.push('/profile?tab=payment')}
              className="flex-1 sm:flex-none bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-3 rounded-2xl font-semibold text-xs sm:text-sm transition"
            >
              💳 Payout Methods
            </button>
            
            <Link
              href="/orders/new"
              className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold px-5 py-3 rounded-2xl shadow-lg shadow-emerald-500/20 transition active:scale-95 text-xs sm:text-sm text-center block"
            >
              + Create New Order
            </Link>

            <button
              onClick={handleLogout}
              className="flex-1 sm:flex-none bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-3 rounded-2xl font-semibold text-xs sm:text-sm transition"
            >
              🚪 Logout
            </button>
          </div>
        </div>

        {profile && !profile?.payment_method && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h4 className="text-sm font-bold text-amber-400">Payout Details Missing</h4>
                <p className="text-xs text-slate-300">You haven't added your Bank or Mobile Banking (bKash/Nagad) details yet. Please update to receive payouts.</p>
              </div>
            </div>
            <Link href="/profile?tab=payment" className="bg-amber-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shrink-0">
              Add Payout Details
            </Link>
          </div>
        )}

        {holdOrders.length > 0 && (
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-5 mb-8 space-y-3 relative z-10">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              🛑 Payment Hold Alert ({holdOrders.length} Order{holdOrders.length > 1 ? 's' : ''})
            </h3>
            <p className="text-xs text-slate-300">The admin placed a hold on your payout for the following reason(s):</p>
            <div className="space-y-2">
              {holdOrders.map(o => (
                <div key={o.id} className="bg-slate-900/80 border border-rose-900/50 p-3 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-mono text-slate-400">Order #{o.id.substring(0, 8)}:</span>
                    <span className="ml-2 font-semibold text-rose-300">"{o.payout_hold_reason || 'Information needs verification'}"</span>
                  </div>
                  <Link href="/profile?tab=payment" className="text-amber-400 underline font-medium">Update Info</Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metrics Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-6 mb-8 relative z-10">
          <div className="p-6 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Orders</p>
            <h3 className="text-3xl font-extrabold text-white mt-2">{stats.pending}</h3>
          </div>
          <div className="p-6 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">In Transit / Shipped</p>
            <h3 className="text-3xl font-extrabold text-white mt-2">{stats.shipped}</h3>
          </div>
          <div className="p-6 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Profit Earned</p>
            <h3 className="text-3xl font-extrabold text-emerald-400 mt-2">৳{stats.profit}</h3>
          </div>
          <div className="p-6 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Received Payout</p>
            <h3 className="text-3xl font-extrabold text-teal-400 mt-2">৳{stats.totalPaid}</h3>
          </div>
        </div>

        {/* Orders Stream Table */}
        <div className="relative z-10 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800/80 flex justify-between items-center">
            <h2 className="text-lg sm:text-xl font-bold text-slate-100">Live Orders Stream</h2>
            <button 
              onClick={fetchProfileAndOrders}
              className="text-xs px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-bold transition flex items-center gap-1.5"
            >
              🔄 Sync Orders
            </button>
          </div>

          {/* Mobile View */}
          <div className="block sm:hidden p-4 space-y-3">
            {orders.length === 0 ? (
              <p className="text-center text-slate-500 py-6 text-xs">No orders placed yet.</p>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-base">{o.customer_name}</h4>
                      <p className="text-xs text-slate-400">{o.customer_phone}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedOrder(o)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold"
                    >
                      📍 Track
                    </button>
                  </div>

                  {o.decline_note && (
                    <p className="text-[11px] bg-rose-500/10 text-rose-400 border border-rose-500/30 p-2 rounded-xl">
                      ⚠️ Cancel Declined: {o.decline_note}
                    </p>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-slate-800/60 text-xs">
                    <span className="text-slate-400">Profit: <strong className="text-emerald-400">৳{o.profit_amount || 0}</strong></span>
                    {o.status === 'pending' && (
                      <button 
                        onClick={() => setCancellingOrder(o)} 
                        className="px-3 py-1 bg-rose-500/20 text-rose-400 rounded-lg text-xs font-bold"
                      >
                        ❌ Cancel Request
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/40 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
                  <th className="p-5">Customer</th>
                  <th className="p-5">Phone</th>
                  <th className="p-5">Your Profit</th>
                  <th className="p-5">Order Status</th>
                  <th className="p-5">Payout Status</th>
                  <th className="p-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-sm text-slate-300">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                      No orders placed yet.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-5 font-semibold text-white">
                        {o.customer_name}
                        {o.decline_note && (
                          <div className="text-[11px] text-rose-400 font-normal mt-0.5">
                            ⚠️ Cancel Declined: {o.decline_note}
                          </div>
                        )}
                      </td>
                      <td className="p-5 text-slate-400">{o.customer_phone}</td>
                      <td className="p-5 font-bold text-emerald-400">+ ৳{o.profit_amount || 0}</td>
                      <td className="p-5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border capitalize ${
                          o.status === 'cancel_requested' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                          o.status === 'cancelled' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {o.status === 'cancel_requested' ? 'Cancel Requested' : o.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-5">
                        {o.payout_status === 'paid' && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs font-bold">🟢 Paid</span>}
                        {o.payout_status === 'hold' && <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-full text-xs font-bold">🔴 Hold</span>}
                        {(!o.payout_status || o.payout_status === 'pending') && <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-bold">🟡 Pending</span>}
                      </td>
                      <td className="p-5 text-right space-x-2">
                        <button 
                          onClick={() => setSelectedOrder(o)}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-semibold transition"
                        >
                          📍 Track
                        </button>
                        {o.status === 'pending' && (
                          <button 
                            onClick={() => setCancellingOrder(o)}
                            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition"
                          >
                            ❌ Cancel Request
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 🔴 CANCEL REQUEST REASON MODAL */}
      <AnimatePresence>
        {cancellingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white">Request Order Cancellation</h3>
                <button onClick={() => setCancellingOrder(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
              </div>

              <p className="text-xs text-slate-300">
                Customer: <strong className="text-white">{cancellingOrder.customer_name}</strong> ({cancellingOrder.customer_phone})
              </p>

              <form onSubmit={handleSendCancelRequest} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Reason for Cancellation *</label>
                  <textarea 
                    required
                    rows={3}
                    placeholder="e.g. Customer changed mind, wrong address, etc."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setCancellingOrder(null)}
                    className="w-1/2 bg-slate-800 text-slate-300 py-2.5 rounded-xl text-xs font-bold"
                  >
                    Close
                  </button>
                  <button 
                    type="submit" 
                    disabled={cancelLoading}
                    className="w-1/2 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl text-xs font-bold transition"
                  >
                    {cancelLoading ? 'Sending...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TIMELINE PROGRESS MODAL */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-3xl shadow-2xl relative"
            >
              <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Order Progress Timeline</h3>
                  <p className="text-xs text-slate-400 mt-1">Customer: <strong className="text-slate-200">{selectedOrder.customer_name}</strong> | Phone: {selectedOrder.customer_phone}</p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 border border-slate-700"
                >
                  ✕
                </button>
              </div>

              {/* TIMELINE GRAPHIC */}
              <div className="py-6">
                <h4 className="text-sm font-semibold text-slate-400 mb-8 uppercase tracking-wider text-center sm:text-left">Timeline Status</h4>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-6 relative">
                  <div className="hidden sm:block absolute top-12 left-8 right-8 h-1 bg-slate-800 z-0">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-500" 
                      style={{ 
                        width: `${Math.max(0, getStepIndex(selectedOrder.status)) * 25}%` 
                      }} 
                    />
                  </div>

                  {trackingSteps.map((step, idx) => {
                    const currentIndex = getStepIndex(selectedOrder.status);
                    const isCompleted = idx <= currentIndex;

                    return (
                      <div key={step.key} className="flex sm:flex-col items-center gap-4 sm:gap-3 z-10 w-full sm:w-auto">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 shadow-lg ${
                          isCompleted 
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/20 scale-110 border-2 border-emerald-400' 
                            : 'bg-slate-800/80 text-slate-500 border border-slate-700'
                        }`}>
                          {step.icon}
                        </div>

                        <div className="text-left sm:text-center">
                          <div className="flex items-center gap-1.5 sm:justify-center">
                            {isCompleted && (
                              <span className="w-4 h-4 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center text-[10px] font-extrabold">✓</span>
                            )}
                            <p className={`text-xs sm:text-sm font-bold ${isCompleted ? 'text-white' : 'text-slate-500'}`}>
                              {step.label}
                            </p>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {isCompleted ? 'Completed' : 'Pending'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Info Summary */}
              <div className="mt-8 p-4 rounded-2xl bg-slate-800/50 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Your Profit</span>
                  <strong className="text-emerald-400 text-sm">৳{selectedOrder.profit_amount || 0}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Selling Price</span>
                  <strong className="text-slate-200 text-sm">৳{selectedOrder.total_amount}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Payout Status</span>
                  <strong className="text-slate-200 text-sm uppercase">{selectedOrder.payout_status || 'Pending'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Current Status</span>
                  <strong className="text-emerald-400 text-sm uppercase">{selectedOrder.status?.replace('_', ' ')}</strong>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-6 py-2.5 rounded-xl border border-slate-700 text-xs"
                >
                  Close Progress Window
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📦 PACKAGE UPGRADE MODAL */}
      <AnimatePresence>
        {showPkgModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl max-w-4xl w-full space-y-6 shadow-2xl relative">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-white flex items-center gap-2">👑 Membership Packages</h3>
                  <p className="text-xs text-slate-400 mt-1">Upgrade your plan to unlock higher wholesale discounts and perks.</p>
                </div>
                <button onClick={() => setShowPkgModal(false)} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {packages.length === 0 ? (
                  <p className="text-xs text-slate-500 col-span-3 text-center py-6">No active packages loaded yet.</p>
                ) : (
                  packages.map((pkg) => (
                    <div key={pkg.id} className="bg-slate-950/60 border border-slate-800 hover:border-emerald-500/50 p-5 rounded-2xl flex flex-col justify-between space-y-4 transition">
                      <div>
                        <h4 className="text-base font-bold text-white uppercase">{pkg.name}</h4>
                        <p className="text-2xl font-black text-emerald-400 mt-1">৳{pkg.price}</p>
                        <p className="text-[10px] text-amber-400 font-semibold mt-0.5">{pkg.discount_percent}% Wholesale Discount</p>
                        
                        <div className="mt-4 space-y-1.5 border-t border-slate-800 pt-3 text-xs text-slate-300">
                          {pkg.features?.map((f, i) => (
                            <p key={i} className="flex items-center gap-1.5"><span className="text-emerald-400 font-bold">✓</span> {f}</p>
                          ))}
                        </div>
                      </div>

                      <button onClick={() => alert(`Please contact admin to upgrade to ${pkg.name} Plan!`)} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition">
                        Choose {pkg.name}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}