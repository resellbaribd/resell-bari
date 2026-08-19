'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function OrderFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryProductId = searchParams.get('product_id');

  const [products, setProducts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [planDiscount, setPlanDiscount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerNote, setCustomerNote] = useState('');

  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [sellingPrice, setSellingPrice] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState(60);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (products.length > 0 && queryProductId) {
      const matchedProd = products.find(p => String(p.id).trim() === String(queryProductId).trim());
      if (matchedProd) {
        setSelectedProductId(matchedProd.id);
        setSellingPrice(matchedProd.suggested_price || Math.round(matchedProd.price * 1.3));
      }
    }
  }, [products, queryProductId]);

  async function fetchInitialData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profData) {
          setProfile(profData);
          const { data: pkgData } = await supabase.from('packages').select('*');
          const userPkg = pkgData?.find(p => p.name?.toLowerCase() === (profData.plan?.toLowerCase() || 'basic'));
          if (userPkg) setPlanDiscount(Number(userPkg.discount_percent || 0));
        }
      }

      const { data: prodData } = await supabase.from('products').select('*').order('name', { ascending: true });
      if (prodData) {
        setProducts(prodData);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }

  const selectedProduct = products.find(p => String(p.id).trim() === String(selectedProductId).trim());

  const calculateWholesaleUnitCost = (basePrice) => {
    if (!basePrice) return 0;
    if (!planDiscount) return basePrice;
    return Math.round(basePrice - (basePrice * (planDiscount / 100)));
  };

  const wholesaleUnitCost = selectedProduct ? calculateWholesaleUnitCost(selectedProduct.price) : 0;
  const totalWholesaleCost = wholesaleUnitCost * Number(quantity || 1);

  const numSellingPrice = Number(sellingPrice || 0);
  const numDelivery = Number(deliveryCharge || 0);
  const numDiscount = Number(discount || 0);

  const customerTotalBill = (numSellingPrice * Number(quantity || 1)) + numDelivery - numDiscount;
  const totalProfit = (numSellingPrice * Number(quantity || 1)) - totalWholesaleCost - numDiscount;

  const handleProductSelect = (id) => {
    setSelectedProductId(id);
    const prod = products.find(p => String(p.id).trim() === String(id).trim());
    if (prod) {
      setSellingPrice(prod.suggested_price || Math.round(prod.price * 1.3));
    } else {
      setSellingPrice('');
    }
  };

  async function handleConfirmOrder(e) {
    e.preventDefault();
    if (!selectedProductId) return alert('Please select a product!');
    if (!customerName || !customerPhone || !deliveryAddress) return alert('Please fill in all customer details!');
    if (numSellingPrice < wholesaleUnitCost) return alert(`Selling price cannot be less than your wholesale cost (৳${wholesaleUnitCost})!`);

    setSubmitting(true);
    try {
      const orderPayload = {
        product_id: selectedProduct.id,
        quantity: Number(quantity || 1),
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_address: deliveryAddress,
        delivery_charge: numDelivery,
        total_amount: customerTotalBill,
        profit_amount: totalProfit,
        status: 'pending'
      };

      const { error } = await supabase.from('orders').insert([orderPayload]);

      if (!error) {
        alert('🎉 Order Placed Successfully!');
        router.push('/reseller');
      } else {
        alert('Order Error: ' + error.message);
      }
    } catch (err) {
      alert('Order Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-8 flex items-center justify-center font-sans">
        <p className="text-xs text-slate-400">Loading Order System...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex flex-wrap items-center gap-2">
            Create New Order 
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] px-3 py-1 rounded-full uppercase">
              PLAN: {profile?.plan || 'Basic'}
            </span>
          </h1>
          <p className="text-xs text-slate-400">Set customer selling price to calculate your profit automatically based on your membership benefits.</p>
        </div>
        <Link href="/products" className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-2xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 shadow-md">
          ← Back to Shop
        </Link>
      </div>

      <form onSubmit={handleConfirmOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Customer Details Box */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 p-5 sm:p-6 rounded-3xl space-y-4 shadow-xl">
          <h3 className="text-sm sm:text-base font-bold text-emerald-400 border-b border-slate-800 pb-3">Customer Details</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Customer Name *</label>
              <input 
                type="text" 
                required 
                placeholder="Full Name"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500" 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)} 
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Customer Phone *</label>
              <input 
                type="text" 
                required 
                placeholder="017xxxxxxxx"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500" 
                value={customerPhone} 
                onChange={(e) => setCustomerPhone(e.target.value)} 
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Delivery Address *</label>
            <textarea 
              required 
              rows={3} 
              placeholder="House, Road, Thana, District"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500" 
              value={deliveryAddress} 
              onChange={(e) => setDeliveryAddress(e.target.value)} 
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Customer Note (Optional)</label>
            <textarea 
              rows={2} 
              placeholder="Any special instructions..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500" 
              value={customerNote} 
              onChange={(e) => setCustomerNote(e.target.value)} 
            />
          </div>
        </div>

        {/* Pricing & Profit Box */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 sm:p-6 rounded-3xl space-y-4 h-fit shadow-xl">
          <h3 className="text-sm sm:text-base font-bold text-emerald-400 border-b border-slate-800 pb-3">Pricing & Profit</h3>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Select Product *</label>
            <select 
              required
              value={selectedProductId} 
              onChange={(e) => handleProductSelect(e.target.value)} 
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
            >
              <option value="">Select a Product</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Quantity</label>
              <input 
                type="number" 
                min={1} 
                required 
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white font-bold" 
                value={quantity} 
                onChange={(e) => setQuantity(e.target.value)} 
              />
            </div>
            <div>
              <label className="text-xs text-emerald-400 block mb-1">Selling Price (৳)</label>
              <input 
                type="number" 
                required 
                placeholder={`Min ৳${wholesaleUnitCost}`}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white font-bold" 
                value={sellingPrice} 
                onChange={(e) => setSellingPrice(e.target.value)} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Delivery Charge (৳)</label>
              <input 
                type="number" 
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white" 
                value={deliveryCharge} 
                onChange={(e) => setDeliveryCharge(e.target.value)} 
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Discount (৳)</label>
              <input 
                type="number" 
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white" 
                value={discount} 
                onChange={(e) => setDiscount(e.target.value)} 
              />
            </div>
          </div>

          {/* Profit Calculation Summary */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Plan Wholesale Cost:</span>
              <span className="font-bold text-white">৳{totalWholesaleCost}</span>
            </div>
            <div className="flex justify-between text-slate-400 pt-1.5 border-t border-slate-800">
              <span className="text-emerald-400 font-bold">Your Profit:</span>
              <span className={`font-black text-sm ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                {totalProfit >= 0 ? `+ ৳${totalProfit}` : `- ৳${Math.abs(totalProfit)}`}
              </span>
            </div>
            <div className="flex justify-between text-slate-300 font-extrabold text-sm pt-2.5 border-t border-slate-800">
              <span>Customer Total Bill:</span>
              <span className="text-emerald-400">৳{customerTotalBill > 0 ? customerTotalBill : 0}</span>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting} 
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl text-xs transition shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            {submitting ? 'Processing Order...' : 'Confirm & Place Order'}
          </button>
        </div>

      </form>
    </div>
  );
}

export default function CreateOrderPage() {
  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 sm:p-8 font-sans">
      <Suspense fallback={<div className="text-center text-xs text-slate-400 p-8">Loading Order System...</div>}>
        <OrderFormContent />
      </Suspense>
    </div>
  );
}