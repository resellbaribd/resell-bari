'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Filter, Search, Package, ShoppingBag, ArrowLeft } from 'lucide-react';

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdminView = searchParams.get('mode') === 'admin';

  const [products, setProducts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [planDiscount, setPlanDiscount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeImageIndexes, setActiveImageIndexes] = useState({});
  const [copiedText, setCopiedText] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // 🔍 ফিল্টারিং স্টেট
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');
  const [selectedBrand, setSelectedBrand] = useState('All');

  // 📄 Load More State
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    fetchProductsAndProfile();
  }, []);

  async function fetchProductsAndProfile() {
    try {
      setLoading(true);

      // ১. 🚀 লাইটওয়েট কুয়েরি (ভারী images ফিল্ড বাদে শুধুমাত্র প্রয়োজনীয় ফিল্ড আনা হচ্ছে যাতে টাইমআউট না হয়)
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('id, name, title, brand, category, sub_category, description, price, suggested_price, image_url, stock, created_at')
        .order('created_at', { ascending: false });

      if (prodErr) {
        console.error('Products Fetch Error:', prodErr.message);
      } else if (prodData) {
        setProducts(prodData);
        const initialIndexes = {};
        prodData.forEach(p => { initialIndexes[p.id] = 0; });
        setActiveImageIndexes(initialIndexes);
      }

      // ২. সেফ প্রোফাইল ফেচ
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user;
      
      if (currentUser) {
        const { data: profData } = await supabase
          .from('profiles')
          .select('id, full_name, role, plan')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (profData) {
          setProfile(profData);
          if (profData.role === 'admin') {
            setPlanDiscount(0);
          } else {
            const { data: pkgData } = await supabase.from('packages').select('*');
            const userPkg = pkgData?.find(p => p.name?.toLowerCase() === (profData.plan?.toLowerCase() || 'basic'));
            if (userPkg) setPlanDiscount(Number(userPkg.discount_percent || 0));
          }
        }
      }
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }

  // 🌟 মডাল ওপেন করার সময় অন-ডিমান্ড পুরো ছবিগুলো লোড করা (সুপার ফাস্ট)
  async function handleOpenProductModal(product) {
    setSelectedProduct(product);
    if (!product.images || product.images.length === 0) {
      setLoadingDetails(true);
      try {
        const { data } = await supabase
          .from('products')
          .select('images, description')
          .eq('id', product.id)
          .single();

        if (data) {
          setSelectedProduct(prev => ({
            ...prev,
            images: data.images || (prev.image_url ? [prev.image_url] : []),
            description: data.description || prev.description
          }));
        }
      } catch (err) {
        console.error('Error fetching details:', err);
      } finally {
        setLoadingDetails(false);
      }
    }
  }

  // ফিল্টার ড্রপডাউন অপশন
  const categories = useMemo(() => {
    return ['All', ...new Set(products.map(p => p.category?.trim()).filter(Boolean))];
  }, [products]);

  const subCategories = useMemo(() => {
    const list = products
      .filter(p => selectedCategory === 'All' || p.category?.trim() === selectedCategory)
      .map(p => p.sub_category?.trim())
      .filter(Boolean);
    return ['All', ...new Set(list)];
  }, [products, selectedCategory]);

  const brands = useMemo(() => {
    const list = products
      .filter(p => {
        const matchCat = selectedCategory === 'All' || p.category?.trim() === selectedCategory;
        const matchSub = selectedSubCategory === 'All' || p.sub_category?.trim() === selectedSubCategory;
        return matchCat && matchSub;
      })
      .map(p => p.brand?.trim())
      .filter(Boolean);
    return ['All', ...new Set(list)];
  }, [products, selectedCategory, selectedSubCategory]);

  // ফিল্টারিং লজিক
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'All' || (p.category && p.category.trim().toLowerCase() === selectedCategory.toLowerCase());
      const matchSub = selectedSubCategory === 'All' || (p.sub_category && p.sub_category.trim().toLowerCase() === selectedSubCategory.toLowerCase());
      const matchBrand = selectedBrand === 'All' || (p.brand && p.brand.trim().toLowerCase() === selectedBrand.toLowerCase());
      const matchSearch = (p.name || p.title || '').toLowerCase().includes(searchTerm.toLowerCase().trim());
      return matchCat && matchSub && matchBrand && matchSearch;
    });
  }, [products, selectedCategory, selectedSubCategory, selectedBrand, searchTerm]);

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  const handlePrevImage = (e, prodId, imgList) => {
    e.stopPropagation();
    setActiveImageIndexes(prev => {
      const current = prev[prodId] || 0;
      const newIndex = current === 0 ? imgList.length - 1 : current - 1;
      return { ...prev, [prodId]: newIndex };
    });
  };

  const handleNextImage = (e, prodId, imgList) => {
    e.stopPropagation();
    setActiveImageIndexes(prev => {
      const current = prev[prodId] || 0;
      const newIndex = current === imgList.length - 1 ? 0 : current + 1;
      return { ...prev, [prodId]: newIndex };
    });
  };

  const calculateWholesalePrice = (basePrice) => {
    const numPrice = Number(basePrice || 0);
    if (isAdminView || profile?.role === 'admin' || !planDiscount) return numPrice;
    return Math.round(numPrice - (numPrice * (planDiscount / 100)));
  };

  const handleCopyProductDetails = (product) => {
    const textToCopy = `📌 ${product.name || product.title}\n\n📝 PRODUCT INFORMATION:\n${product.description || 'N/A'}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleDownloadAllImagesZip = async (product) => {
    const imagesToDownload = product.images && product.images.length > 0 ? product.images : [product.image_url];
    if (!imagesToDownload || imagesToDownload.length === 0 || !imagesToDownload[0]) {
      return alert('No images available to download!');
    }

    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder((product.name || product.title || 'product').replace(/[^a-zA-Z0-9]/g, '_'));

      await Promise.all(
        imagesToDownload.map(async (imgData, index) => {
          if (!imgData) return;
          if (imgData.startsWith('data:image')) {
            const base64Data = imgData.split(',')[1];
            folder.file(`image_${index + 1}.jpg`, base64Data, { base64: true });
          } else {
            const response = await fetch(imgData);
            const blob = await response.blob();
            folder.file(`image_${index + 1}.jpg`, blob);
          }
        })
      );

      const zipContent = await zip.generateAsync({ type: 'blob' });
      saveAs(zipContent, `${(product.name || product.title || 'product').replace(/[^a-zA-Z0-9]/g, '_')}_images.zip`);
    } catch (err) {
      alert('Error creating ZIP file: ' + err.message);
    } finally {
      setDownloadingZip(false);
    }
  };

  const isUserAdmin = isAdminView || profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 sm:p-8 font-sans">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
            🛍️ Wholesale Products Shop
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isUserAdmin ? (
              <span className="text-amber-400 font-bold">⚡ Admin Preview Mode (Base Wholesale Prices Only)</span>
            ) : (
              <>Exclusive wholesale prices based on your <strong className="text-amber-400 uppercase">{profile?.plan || 'Basic'} Plan ({planDiscount}% Wholesale Discount)</strong></>
            )}
          </p>
        </div>
        
        <Link href={isUserAdmin ? "/admin" : "/reseller"} className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5">
          <ArrowLeft size={15} /> Back to {isUserAdmin ? "Admin Control Hub" : "Dashboard"}
        </Link>
      </div>

      {/* 🔍 Filter & Search Bar */}
      <div className="max-w-7xl mx-auto bg-slate-900/60 border border-slate-800 p-5 rounded-3xl shadow-lg space-y-4 mb-8">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
          <Filter size={15} /> Filter Wholesale Products ({filteredProducts.length} Items Available)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1 uppercase font-bold">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubCategory('All');
                setSelectedBrand('All');
                setVisibleCount(20);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1 uppercase font-bold">Sub-Category</label>
            <select
              value={selectedSubCategory}
              onChange={(e) => {
                setSelectedSubCategory(e.target.value);
                setVisibleCount(20);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
            >
              {subCategories.map((sc) => (
                <option key={sc} value={sc}>{sc === 'All' ? 'All Sub-Categories' : sc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1 uppercase font-bold">Brand</label>
            <select
              value={selectedBrand}
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                setVisibleCount(20);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
            >
              {brands.map((b) => (
                <option key={b} value={b}>{b === 'All' ? 'All Brands' : b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1 uppercase font-bold">Search Product</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Product name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setVisibleCount(20);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium pl-8"
              />
              <Search size={14} className="absolute left-2.5 top-3 text-slate-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="bg-slate-900/60 border border-slate-800 rounded-3xl h-80 animate-pulse" />
            ))}
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-16 text-center text-slate-500 text-xs">
            No wholesale products match your current filters.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {displayedProducts.map((p) => {
              const wholesalePrice = calculateWholesalePrice(p.price);
              const productName = p.name || p.title || 'Product';

              return (
                <div 
                  key={p.id}
                  onClick={() => handleOpenProductModal(p)}
                  className="group bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 rounded-3xl overflow-hidden shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative aspect-square w-full bg-slate-950 overflow-hidden">
                    {p.image_url ? (
                      <img 
                        src={p.image_url} 
                        alt={productName} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={40} className="text-slate-700" />
                      </div>
                    )}

                    <div className="absolute top-3 left-3 bg-emerald-500/90 text-slate-950 font-black text-[9px] px-2.5 py-1 rounded-full backdrop-blur-md uppercase tracking-wider">
                      Base Wholesale
                    </div>

                    {p.brand && (
                      <div className="absolute bottom-3 left-3 bg-slate-900/90 text-amber-400 font-extrabold text-[9px] px-2.5 py-1 rounded-full backdrop-blur-md border border-slate-700">
                        {p.brand}
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-white text-sm sm:text-base line-clamp-1 group-hover:text-emerald-400 transition">
                      {productName}
                    </h3>

                    <div className="flex justify-between items-baseline pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Wholesale</span>
                        <strong className="text-emerald-400 text-base sm:text-lg font-black">৳{wholesalePrice}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase">Suggested Sale</span>
                        <strong className="text-slate-300 text-xs font-bold">৳{p.suggested_price || Math.round(Number(p.price || 0) * 1.3)}</strong>
                      </div>
                    </div>

                    <button className="w-full mt-2 bg-slate-800 group-hover:bg-emerald-500 group-hover:text-slate-950 text-slate-200 font-bold py-2 rounded-xl text-xs transition border border-slate-700 group-hover:border-emerald-400 cursor-pointer">
                      {isUserAdmin ? "Manage Product" : "View Full Details"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 📥 Load More Products Button */}
      {!loading && visibleCount < filteredProducts.length && (
        <div className="max-w-7xl mx-auto mt-12 text-center">
          <button
            onClick={() => setVisibleCount(prev => prev + 20)}
            className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-stone-50 font-bold px-8 py-3.5 rounded-2xl text-xs transition shadow-xl cursor-pointer"
          >
            Load More Products ({filteredProducts.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {/* 🔴 MODAL */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-8 w-full max-w-4xl shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto"
            >
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-base font-bold w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 z-20 cursor-pointer"
              >
                ✕
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 sm:pt-0">
                <div className="space-y-3">
                  <div className="aspect-square w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
                    <img 
                      src={selectedProduct.images?.[activeImageIndexes[selectedProduct.id] || 0] || selectedProduct.image_url} 
                      alt={selectedProduct.name || selectedProduct.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {selectedProduct.images && selectedProduct.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {selectedProduct.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIndexes({ ...activeImageIndexes, [selectedProduct.id]: idx })}
                          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                            (activeImageIndexes[selectedProduct.id] || 0) === idx ? 'border-emerald-500 scale-95' : 'border-slate-800 opacity-60'
                          }`}
                        >
                          <img src={img} className="w-full h-full object-cover" alt="thumb" />
                        </button>
                      ))}
                    </div>
                  )}

                  {!isUserAdmin && (
                    <button
                      onClick={() => handleDownloadAllImagesZip(selectedProduct)}
                      disabled={downloadingZip || loadingDetails}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      <span>📦</span> {downloadingZip ? 'Creating ZIP File...' : 'Download Images (.ZIP)'}
                    </button>
                  )}
                </div>

                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full">
                        {isUserAdmin ? "👑 Admin Control View" : `👑 ${profile?.plan || 'Basic'} Member Pricing`}
                      </span>

                      {!isUserAdmin && (
                        <button 
                          onClick={() => handleCopyProductDetails(selectedProduct)}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          {copiedText ? '✓ Copied!' : '📋 Copy Content'}
                        </button>
                      )}
                    </div>

                    <h2 className="text-lg sm:text-2xl font-black text-white leading-snug">{selectedProduct.name || selectedProduct.title}</h2>

                    <div className="p-3.5 bg-slate-950/90 rounded-2xl border border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="text-[11px] text-slate-400 block">{isUserAdmin ? "Base Wholesale Cost" : "Your Wholesale Cost"}</span>
                        <strong className="text-xl sm:text-2xl font-black text-emerald-400">
                          ৳{calculateWholesalePrice(selectedProduct.price)}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">Suggested Sale Price</span>
                        <strong className="text-sm sm:text-base font-bold text-slate-200">
                          ৳{selectedProduct.suggested_price || Math.round(Number(selectedProduct.price || 0) * 1.3)}
                        </strong>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400">
                      Stock Available: <strong className="text-white">{selectedProduct.stock || 0} Units</strong>
                    </p>

                    <div className="border-t border-slate-800 pt-3 space-y-1">
                      <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Product Information</h4>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line max-h-36 sm:max-h-44 overflow-y-auto pr-1 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                        {loadingDetails ? 'Loading detailed specifications...' : (selectedProduct.description || 'No detailed specifications added for this item.')}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800">
                    {isUserAdmin ? (
                      <Link
                        href="/admin"
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-xs text-center shadow-lg transition flex items-center justify-center gap-2"
                      >
                        <span>✏️</span> Edit Product in Admin Inventory
                      </Link>
                    ) : (
                      <Link
                        href={`/orders/new?product_id=${selectedProduct.id}`}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-black py-3.5 rounded-xl text-xs text-center shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 block"
                      >
                        <span>🚀</span> Place Order With This Product
                      </Link>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="text-center text-xs text-slate-400 p-8">Loading Products...</div>}>
      <ProductsPageContent />
    </Suspense>
  );
}