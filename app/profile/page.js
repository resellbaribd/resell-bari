'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

function ProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isPayoutMode = searchParams.get('mode') === 'payout' || searchParams.get('tab') === 'payment';

  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [profileId, setProfileId] = useState(null);

  // Profile States
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    avatar_url: '',
    bio: '',
  });

  // Payment States
  const [paymentMethod, setPaymentMethod] = useState('bkash');
  const [paymentData, setPaymentData] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
    branch_name: '',
    routing_number: '',
  });

  // Password States
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab === 'security') {
      setActiveTab('security');
    } else {
      setActiveTab('personal');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      setFetching(true);
      // 1. Get current logged-in user session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push('/login');
        return;
      }

      // 2. Fetch profile specifically matching the logged-in user's id
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfileId(data.id);
        setProfileData({
          full_name: data.full_name || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url || '',
          bio: data.bio || '',
        });

        setPaymentMethod(data.payment_method || 'bkash');
        setPaymentData({
          account_name: data.account_name || '',
          account_number: data.account_number || '',
          bank_name: data.bank_name || '',
          branch_name: data.branch_name || '',
          routing_number: data.routing_number || '',
        });
      } else {
        // If profile row doesn't exist yet for this user, set ID to user.id
        setProfileId(user.id);
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
    } finally {
      setFetching(false);
    }
  }

  // ইমেজের ফাইল রিড করে Base64 ডাটা বানিয়ে নেওয়া
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData((prev) => ({ ...prev, avatar_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Personal Info
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No active user session');

      const payload = {
        id: user.id, // Ensure user id is always tied
        full_name: profileData.full_name,
        phone: profileData.phone,
        avatar_url: profileData.avatar_url,
        bio: profileData.bio,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload)
        .select();

      setLoading(false);
      if (!error) {
        if (data && data[0]) setProfileId(data[0].id);
        alert('Profile info updated successfully!');
      } else {
        alert('Error updating profile: ' + error.message);
      }
    } catch (err) {
      setLoading(false);
      alert('Error updating profile: ' + err.message);
    }
  };

  // Save Payment Method
  const handleSavePayment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No active user session');

      const payload = {
        id: user.id, // Ensure user id is tied
        payment_method: paymentMethod,
        account_name: paymentData.account_name,
        account_number: paymentData.account_number,
        bank_name: paymentMethod === 'bank' ? paymentData.bank_name : null,
        branch_name: paymentMethod === 'bank' ? paymentData.branch_name : null,
        routing_number: paymentMethod === 'bank' ? paymentData.routing_number : null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload)
        .select();

      setLoading(false);
      if (!error) {
        if (data && data[0]) setProfileId(data[0].id);
        alert('Payment method updated successfully!');
      } else {
        alert('Error updating payment info: ' + error.message);
      }
    } catch (err) {
      setLoading(false);
      alert('Error updating payment: ' + err.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: passwordData.newPassword,
    });

    setLoading(false);
    if (!error) {
      alert('Password updated successfully!');
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } else {
      alert('Error updating password: ' + error.message);
    }
  };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    router.push(`/profile?tab=${tabName}`);
  };

  if (fetching) return <div className="p-10 text-slate-400 text-center">Loading details...</div>;

  if (isPayoutMode) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Payout Method Setup</h1>
          <button onClick={() => router.push('/reseller')} className="text-xs bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-slate-300 border border-slate-700 transition">
            ← Back to Dashboard
          </button>
        </div>

        <form onSubmit={handleSavePayment} className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Select Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="bkash">bKash Personal</option>
              <option value="nagad">Nagad Personal</option>
              <option value="rocket">Rocket Personal</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>

          {paymentMethod !== 'bank' ? (
            <>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Account Holder Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Md Sujan Miah"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  value={paymentData.account_name}
                  onChange={(e) => setPaymentData({ ...paymentData, account_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  {paymentMethod.toUpperCase()} Personal Phone Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="017XXXXXXXX"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  value={paymentData.account_number}
                  onChange={(e) => setPaymentData({ ...paymentData, account_number: e.target.value })}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  placeholder="Dutch Bangla Bank"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white"
                  value={paymentData.bank_name}
                  onChange={(e) => setPaymentData({ ...paymentData, bank_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  placeholder="Uttara Branch"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white"
                  value={paymentData.branch_name}
                  onChange={(e) => setPaymentData({ ...paymentData, branch_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Account Holder Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white"
                  value={paymentData.account_name}
                  onChange={(e) => setPaymentData({ ...paymentData, account_name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Account Number</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white"
                  value={paymentData.account_number}
                  onChange={(e) => setPaymentData({ ...paymentData, account_number: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Routing Number (Optional)</label>
                <input
                  type="text"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white"
                  value={paymentData.routing_number}
                  onChange={(e) => setPaymentData({ ...paymentData, routing_number: e.target.value })}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition text-sm"
          >
            {loading ? 'Saving...' : 'Save Payment Info'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Account Settings</h1>
        <button 
          onClick={() => router.push('/reseller')}
          className="text-xs bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-slate-300 border border-slate-700 transition"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-800 mb-6 pb-2">
        <button
          type="button"
          onClick={() => handleTabChange('personal')}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition ${
            activeTab === 'personal'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          👤 Personal Info
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('security')}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition ${
            activeTab === 'security'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🔒 Security
        </button>
      </div>

      {activeTab === 'personal' && (
        <form onSubmit={handleSaveProfile} className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Full Name</label>
            <input
              type="text"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              value={profileData.full_name}
              onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Phone Number</label>
            <input
              type="text"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Profile Photo Upload</label>
            <div className="flex items-center gap-4">
              {profileData.avatar_url && (
                <img
                  src={profileData.avatar_url}
                  alt="Avatar Preview"
                  className="w-12 h-12 rounded-full object-cover border border-emerald-500"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-emerald-400 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Bio / Store Tagline</label>
            <textarea
              rows={3}
              placeholder="Skincare Products Authorized Reseller"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              value={profileData.bio}
              onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition text-sm"
          >
            {loading ? 'Saving...' : 'Save Personal Info'}
          </button>
        </form>
      )}

      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword} className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              placeholder="Re-enter password"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition text-sm"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 p-4 md:p-10">
      <Suspense fallback={<div className="text-slate-400 text-center">Loading Profile...</div>}>
        <ProfileForm />
      </Suspense>
    </div>
  );
}