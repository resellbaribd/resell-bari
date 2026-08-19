'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

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

  useEffect(() => {
    fetchProductsAndProfile();
  }, []);

  async function fetchProductsAndProfile() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
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

      const { data: prodData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (prodData) {
        setProducts(prodData);
        const initialIndexes = {};
        prodData.forEach(p => { initialIndexes[p.id] = 0; });
        setActiveImageIndexes(initialIndexes);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }

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
    if (isAdminView || profile?.role === 'admin' || !planDiscount) return basePrice;
    return Math.round(basePrice - (basePrice * (planDiscount / 100)));
  };

  const handleCopyProductDetails = (product) => {
    const textToCopy = `📌 ${product.name}\n\n📝 PRODUCT INFORMATION:\n${product.description || 'N/A'}`;
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
      const folder = zip.folder(product.name.replace(/[^a-zA-Z0-9]/g, '_'));

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
      saveAs(zipContent, `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_images.zip`);
    } catch (err) {
      alert('Error creating ZIP file: ' + err.message);
    } finally {
      setDownloadingZip(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-8 flex items-center justify-center font-sans">
        <p className="text-xs text-slate-400">Loading Products Shop...</p>
      </div>
    );
  }

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
        
        <Link href={isUserAdmin ? "/admin" : "/reseller"} className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 px-5 py-2.5 rounded-2xl text-xs font-bold transition">
          ← Back to {isUserAdmin ? "Admin Control Hub" : "Dashboard"}
        </Link>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {products.map((p) => {
          const imgList = p.images && p.images.length > 0 ? p.images : [p.image_url || 'https://via.placeholder.com/400'];
          const currentIndex = activeImageIndexes[p.id] || 0;
          const wholesalePrice = calculateWholesalePrice(p.price);

          return (
            <div 
              key={p.id}
              onClick={() => setSelectedProduct(p)}
              className="group bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 rounded-3xl overflow-hidden shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div className="relative aspect-square w-full bg-slate-950 overflow-hidden">
                <img 
                  src={imgList[currentIndex]} 
                  alt={p.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                <div className="absolute top-3 left-3 bg-emerald-500/90 text-slate-950 font-black text-[9px] px-2.5 py-1 rounded-full backdrop-blur-md uppercase tracking-wider">
                  Base Wholesale
                </div>

                {imgList.length > 1 && (
                  <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handlePrevImage(e, p.id, imgList)}
                      className="w-7 h-7 rounded-full bg-slate-950/80 text-white flex items-center justify-center text-xs hover:bg-emerald-500 hover:text-slate-950 transition"
                    >
                      ❮
                    </button>
                    <button 
                      onClick={(e) => handleNextImage(e, p.id, imgList)}
                      className="w-7 h-7 rounded-full bg-slate-950/80 text-white flex items-center justify-center text-xs hover:bg-emerald-500 hover:text-slate-950 transition"
                    >
                      ❯
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 space-y-2">
                <h3 className="font-bold text-white text-sm sm:text-base line-clamp-1 group-hover:text-emerald-400 transition">
                  {p.name}
                </h3>

                <div className="flex justify-between items-baseline pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Wholesale</span>
                    <strong className="text-emerald-400 text-base sm:text-lg font-black">৳{wholesalePrice}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase">Suggested Sale</span>
                    <strong className="text-slate-300 text-xs font-bold">৳{p.suggested_price || p.price * 1.3}</strong>
                  </div>
                </div>

                <button className="w-full mt-2 bg-slate-800 group-hover:bg-emerald-500 group-hover:text-slate-950 text-slate-200 font-bold py-2 rounded-xl text-xs transition border border-slate-700 group-hover:border-emerald-400">
                  {isUserAdmin ? "Manage Product" : "View Full Details"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🔴 RESPONSIVE MOBILE-FRIENDLY MODAL */}
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
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-base font-bold w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 z-20"
              >
                ✕
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 sm:pt-0">
                
                {/* Left: Gallery & Optional Download */}
                <div className="space-y-3">
                  <div className="aspect-square w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
                    <img 
                      src={selectedProduct.images?.[activeImageIndexes[selectedProduct.id] || 0] || selectedProduct.image_url} 
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {selectedProduct.images && selectedProduct.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {selectedProduct.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIndexes({ ...activeImageIndexes, [selectedProduct.id]: idx })}
                          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 shrink-0 transition ${
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
                      disabled={downloadingZip}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      <span>📦</span> {downloadingZip ? 'Creating ZIP File...' : 'Download Images (.ZIP)'}
                    </button>
                  )}
                </div>

                {/* Right: Details */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full">
                        {isUserAdmin ? "👑 Admin Control View" : `👑 ${profile?.plan || 'Basic'} Member Pricing`}
                      </span>

                      {!isUserAdmin && (
                        <button 
                          onClick={() => handleCopyProductDetails(selectedProduct)}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shrink-0"
                        >
                          {copiedText ? '✓ Copied!' : '📋 Copy Content'}
                        </button>
                      )}
                    </div>

                    <h2 className="text-lg sm:text-2xl font-black text-white leading-snug">{selectedProduct.name}</h2>

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
                          ৳{selectedProduct.suggested_price || selectedProduct.price * 1.3}
                        </strong>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400">
                      Stock Available: <strong className="text-white">{selectedProduct.stock || 0} Units</strong>
                    </p>

                    <div className="border-t border-slate-800 pt-3 space-y-1">
                      <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Product Information</h4>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line max-h-36 sm:max-h-44 overflow-y-auto pr-1 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                        {selectedProduct.description || 'No detailed specifications added for this item.'}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Action Button */}
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