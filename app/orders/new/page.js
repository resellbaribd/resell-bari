'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState('all');

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [sellingPrice, setSellingPrice] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState(60);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch User Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profileData);

      // Fetch Products
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      
      if (productData) setProducts(productData);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  }

  // Filter Categories & Sub-Categories dynamically
  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
  
  const availableSubCategories = [
    'all',
    ...new Set(
      products
        .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
        .map(p => p.sub_category)
        .filter(Boolean)
    )
  ];

  // Filtered Products list
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSubCategory = selectedSubCategory === 'all' || p.sub_category === selectedSubCategory;
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase().trim());
    return matchesCategory && matchesSubCategory && matchesSearch;
  });

  // Select Product Handler
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSellingPrice(product.suggested_price || product.price);
  };

  // Profit & Calculation Formulas
  const baseWholesalePrice = Number(selectedProduct?.price || 0) * Number(quantity);
  const currentSellingPrice = Number(sellingPrice || (selectedProduct?.suggested_price ? selectedProduct.suggested_price * quantity : 0));
  const profit = Math.max(0, currentSellingPrice - baseWholesalePrice);
  const totalCustomerBill = currentSellingPrice + Number(deliveryCharge) - Number(discount);

  async function handleSubmitOrder(e) {
    e.preventDefault();
    if (!selectedProduct) return alert('অনুগ্রহ করে একটি প্রোডাক্ট সিলেক্ট করুন!');
    
    // 11 Digit Phone Validation
    const cleanPhone = customerPhone.trim();
    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      return alert('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)');
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('orders').insert([
        {
          user_id: user?.id,
          reseller_id: user?.id,
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          customer_name: customerName,
          customer_phone: cleanPhone,
          delivery_address: deliveryAddress,
          customer_note: customerNote || null,
          quantity: Number(quantity),
          base_price: Number(selectedProduct.price || 0),
          selling_price: Number(currentSellingPrice),
          profit_amount: Number(profit),
          delivery_charge: Number(deliveryCharge),
          discount: Number(discount),
          total_amount: Number(totalCustomerBill),
          status: 'pending',
          seller_name: profile?.full_name || 'Reseller',
          seller_phone: profile?.phone || ''
        }
      ]);

      if (!error) {
        alert('অর্ডারটি সফলভাবে প্লেস করা হয়েছে!');
        router.push('/reseller');
      } else {
        alert('Error placing order: ' + error.message);
      }
    } catch (err) {
      alert('Order Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Top Bar */}
        <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800 p-5 rounded-3xl">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-black text-white">Create New Order</h1>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full">
                PLAN: {profile?.plan || 'BASIC'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Search products, choose selling price, and place reseller orders.</p>
          </div>
          <Link href="/reseller" className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs transition border border-slate-700">
            ← Back to Dashboard
          </Link>
        </div>

        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Customer Details Box */}
          <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-4 h-fit">
            <h3 className="text-base font-bold text-emerald-400 mb-2">Customer Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Customer Name <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  required 
                  placeholder="Full Name" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Customer Phone <span className="text-rose-500">*</span></label>
                <input 
                  type="tel" 
                  required 
                  maxLength={11}
                  placeholder="017XXXXXXXX" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Delivery Address <span className="text-rose-500">*</span></label>
              <textarea 
                required 
                rows={3} 
                placeholder="House, Road, Thana, District" 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Customer Note (Optional)</label>
              <textarea 
                rows={2} 
                placeholder="Any special delivery instructions..." 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
              />
            </div>
          </div>

          {/* Product & Pricing Box */}
          <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-4">
            <h3 className="text-base font-bold text-emerald-400 mb-2">Select Product & Pricing</h3>

            {/* 🔍 Search & Filters Bar */}
            <div className="space-y-2 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 uppercase font-bold">Category</label>
                  <select 
                    value={selectedCategory} 
                    onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSubCategory('all'); }}
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2 rounded-xl focus:outline-none"
                  >
                    {categories.map((c, i) => (
                      <option key={i} value={c}>{c === 'all' ? 'All Categories' : c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 uppercase font-bold">Sub-Category</label>
                  <select 
                    value={selectedSubCategory} 
                    onChange={(e) => setSelectedSubCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2 rounded-xl focus:outline-none"
                  >
                    {availableSubCategories.map((sc, i) => (
                      <option key={i} value={sc}>{sc === 'all' ? 'All Sub-Categories' : sc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <input 
                  type="text" 
                  placeholder="🔎 Type product name to search..." 
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl focus:outline-none focus:border-emerald-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* 🌟 Live Product Search Results Grid 🌟 */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pt-2 border-t border-slate-800/80 pr-1">
                {filteredProducts.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">No products match your search/filter.</p>
                ) : (
                  filteredProducts.map(p => {
                    const isSelected = selectedProduct?.id === p.id;
                    return (
                      <div 
                        key={p.id}
                        onClick={() => handleSelectProduct(p)}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition border ${
                          isSelected 
                            ? 'bg-emerald-500/15 border-emerald-500/60' 
                            : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={p.image_url || p.images?.[0] || 'https://via.placeholder.com/40'} 
                            alt={p.name} 
                            className="w-9 h-9 rounded-lg object-cover"
                          />
                          <div>
                            <h5 className="font-bold text-xs text-white">{p.name}</h5>
                            <p className="text-[10px] text-slate-400">Base: ৳{p.price} | Sugg: ৳{p.suggested_price || p.price}</p>
                          </div>
                        </div>

                        <button 
                          type="button"
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition ${
                            isSelected 
                              ? 'bg-emerald-500 text-slate-950' 
                              : 'bg-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          {isSelected ? '✓ Selected' : 'Select'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected Product Banner */}
            {selectedProduct && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">
                  Selected: <strong className="text-white">{selectedProduct.name}</strong>
                </span>
                <span className="text-xs font-black text-white">Base: ৳{selectedProduct.price}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Quantity</label>
                <input 
                  type="number" 
                  min={1} 
                  required 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Customer Selling Price (৳) *</label>
                <input 
                  type="number" 
                  required 
                  placeholder="Selling Price" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-bold"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Discount (৳)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
            </div>

            {/* Calculations Card */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Plan Wholesale Cost:</span>
                <span className="font-bold text-white">৳{baseWholesalePrice}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold">
                <span>Your Profit:</span>
                <span>+ ৳{profit}</span>
              </div>
              <div className="flex justify-between text-white font-black text-sm pt-2 border-t border-slate-800">
                <span>Customer Total Bill:</span>
                <span className="text-emerald-400">৳{totalCustomerBill}</span>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || !selectedProduct}
              className={`w-full font-black py-3.5 rounded-xl text-xs transition shadow-lg ${
                selectedProduct 
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {loading ? 'Submitting Order...' : 'Confirm & Place Order'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}