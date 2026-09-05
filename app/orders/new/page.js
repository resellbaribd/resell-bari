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

  // Customer Details Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  
  // Active Item Being Configured
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [itemSellingPrice, setItemSellingPrice] = useState('');

  // 🛒 MULTI-PRODUCT CART STATE
  const [orderItems, setOrderItems] = useState([]);
  
  // General Order Costs
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

  // Select Product to prepare for adding
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setItemSellingPrice(product.suggested_price || product.price);
  };

  // ➕ Add Product to Cart / Sale
  const handleAddProductToSale = () => {
    if (!selectedProduct) return alert('অনুগ্রহ করে আগে একটি প্রোডাক্ট সিলেক্ট করুন!');
    
    const qty = Number(quantity);
    const unitSellPrice = Number(itemSellingPrice);

    if (qty < 1) return alert('কমপক্ষে ১টি কোয়ান্টিটি দিন');
    if (!unitSellPrice || unitSellPrice < Number(selectedProduct.price)) {
      if (!confirm(`আপনার সেলিং প্রাইস (${unitSellPrice}৳) বেস পাইকারি মূল্যের (${selectedProduct.price}৳) চেয়ে কম। আপনি কি নিশ্চিত?`)) {
        return;
      }
    }

    const newItem = {
      product_id: selectedProduct.id,
      name: selectedProduct.name,
      image_url: selectedProduct.image_url || selectedProduct.images?.[0] || '',
      base_price: Number(selectedProduct.price || 0),
      quantity: qty,
      unit_selling_price: unitSellPrice,
      total_base: Number(selectedProduct.price || 0) * qty,
      total_selling: unitSellPrice * qty,
      profit: Math.max(0, (unitSellPrice * qty) - (Number(selectedProduct.price || 0) * qty))
    };

    setOrderItems(prev => [...prev, newItem]);
    
    // Reset product selection for adding next product
    setSelectedProduct(null);
    setQuantity(1);
    setItemSellingPrice('');
  };

  // ❌ Remove Item from Cart
  const handleRemoveItem = (index) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  // 🧮 Summary Calculations for Multi-Products
  const totalWholesalePrice = orderItems.reduce((acc, item) => acc + item.total_base, 0);
  const totalSellingPrice = orderItems.reduce((acc, item) => acc + item.total_selling, 0);
  const totalProfit = orderItems.reduce((acc, item) => acc + item.profit, 0);
  const totalCustomerBill = Math.max(0, totalSellingPrice + Number(deliveryCharge) - Number(discount));

  // 🚀 Place Order
  async function handleSubmitOrder(e) {
    e.preventDefault();
    if (orderItems.length === 0) {
      return alert('অনুগ্রহ করে কমপক্ষে একটি প্রোডাক্ট সেলে যুক্ত করুন (+ Add Product to Sale এ ক্লিক করুন)!');
    }
    
    // 11 Digit Phone Validation
    const cleanPhone = customerPhone.trim();
    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      return alert('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)');
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const primaryProductName = orderItems.length === 1 
        ? orderItems[0].name 
        : `${orderItems[0].name} (+${orderItems.length - 1} more items)`;

      const totalQuantity = orderItems.reduce((acc, i) => acc + i.quantity, 0);

      const { error } = await supabase.from('orders').insert([
        {
          user_id: user?.id,
          reseller_id: user?.id,
          product_id: orderItems[0].product_id,
          product_name: primaryProductName,
          order_items: orderItems, // সম্পূর্ণ মাল্টি-প্রোডাক্ট ডিটেইলস
          customer_name: customerName,
          customer_phone: cleanPhone,
          delivery_address: deliveryAddress,
          customer_note: customerNote || null,
          quantity: totalQuantity,
          base_price: Number(totalWholesalePrice),
          selling_price: Number(totalSellingPrice),
          profit_amount: Number(totalProfit),
          delivery_charge: Number(deliveryCharge),
          discount: Number(discount),
          total_amount: Number(totalCustomerBill),
          status: 'pending',
          seller_name: profile?.full_name || 'Reseller',
          seller_phone: profile?.phone || ''
        }
      ]);

      if (!error) {
        alert('অর্ডারটি সফলভাবে প্লেস করা হয়েছে!');
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
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Bar */}
        <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800 p-5 rounded-3xl">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-black text-white">Create New Order</h1>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full">
                PLAN: {profile?.plan || 'BASIC'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Search products, configure multiple items, and place reseller orders.</p>
          </div>
          <Link href="/reseller" className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs transition border border-slate-700">
            ← Back to Dashboard
          </Link>
        </div>

        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Customer Details Box */}
          <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-4 h-fit">
            <h3 className="text-base font-bold text-emerald-400 mb-2">Customer Details</h3>

            <div className="space-y-3">
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                />
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

            {/* Delivery & Discount Configurations */}
            <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Delivery Charge (৳)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-bold"
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Discount (৳)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-bold"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Product Picker & Multi-Product Cart Box */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 1: Search & Pick Product */}
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-emerald-400">1. Select Product</h3>
                <span className="text-[11px] text-slate-400">Choose item to configure</span>
              </div>

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

                {/* Live Search Items */}
                <div className="max-h-44 overflow-y-auto space-y-1.5 pt-2 border-t border-slate-800/80 pr-1">
                  {filteredProducts.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">No products found.</p>
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

                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition ${
                            isSelected 
                              ? 'bg-emerald-500 text-slate-950' 
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {isSelected ? '✓ Ready' : 'Select'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Step 2: Configure Selected Item & Push to Cart */}
              {selectedProduct && (
                <div className="bg-slate-950 border border-emerald-500/40 p-4 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-emerald-400">Configure: {selectedProduct.name}</span>
                    <span className="text-xs font-black text-white">Wholesale: ৳{selectedProduct.price}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Quantity</label>
                      <input 
                        type="number" 
                        min={1} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Unit Selling Price (৳) *</label>
                      <input 
                        type="number" 
                        placeholder="Selling Price" 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold"
                        value={itemSellingPrice}
                        onChange={(e) => setItemSellingPrice(e.target.value)}
                      />
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={handleAddProductToSale}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 uppercase tracking-wider"
                  >
                    <span>➕</span> Add Product to Sale
                  </button>
                </div>
              )}
            </div>

            {/* Step 3: Current Order Items Cart (Multiple Products Table) */}
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white">2. Selected Order Products ({orderItems.length})</h3>
                <span className="text-xs font-bold text-emerald-400">{orderItems.reduce((acc, i) => acc + i.quantity, 0)} Total Pcs</span>
              </div>

              {orderItems.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                  ⚠️ No products added to this order yet. Select a product above and click <strong>"Add Product to Sale"</strong>.
                </div>
              ) : (
                <div className="space-y-2">
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-2xl flex justify-between items-center text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-mono font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-white text-sm">{item.name}</h4>
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            Qty: <strong className="text-slate-200">{item.quantity}</strong> × Sell: ৳{item.unit_selling_price} (Base: ৳{item.base_price})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="block font-bold text-white">৳{item.total_selling}</span>
                          <span className="block text-[11px] font-bold text-emerald-400">+৳{item.profit}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Calculations Card */}
              <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 space-y-2.5 text-xs pt-4">
                <div className="flex justify-between text-slate-400">
                  <span>Total Wholesale Cost:</span>
                  <span className="font-bold text-white">৳{totalWholesalePrice}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Products Selling Price:</span>
                  <span className="font-bold text-white">৳{totalSellingPrice}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Delivery Charge (+):</span>
                  <span className="font-bold text-white">৳{deliveryCharge || 0}</span>
                </div>
                {Number(discount) > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Discount (-):</span>
                    <span className="font-bold">- ৳{discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-emerald-400 font-extrabold text-sm pt-2 border-t border-slate-800">
                  <span>Your Total Estimated Profit:</span>
                  <span>+ ৳{totalProfit}</span>
                </div>
                <div className="flex justify-between text-white font-black text-base pt-2 border-t border-slate-800">
                  <span>Customer Total Bill (Payable):</span>
                  <span className="text-emerald-400">৳{totalCustomerBill}</span>
                </div>
              </div>

              {/* Submit Final Multi-Product Order */}
              <button 
                type="submit" 
                disabled={loading || orderItems.length === 0}
                className={`w-full font-black py-4 rounded-2xl text-xs uppercase tracking-wider transition shadow-lg ${
                  orderItems.length > 0 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/25 cursor-pointer' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {loading ? 'Submitting Order...' : `Confirm & Place Order (${orderItems.length} Products)`}
              </button>
            </div>

          </div>

        </form>
      </div>
    </div>
  );
}