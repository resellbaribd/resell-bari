'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [chartFilter, setChartFilter] = useState('daily');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [packages, setPackages] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [activationRequests, setActivationRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('confirmed');
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const [holdReasons, setHoldReasons] = useState({});
  const [uploading, setUploading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);

  // 🌟 New Product State with Category & Sub-Category
  const [newProduct, setNewProduct] = useState({ 
    title: '', 
    base_price: '', 
    suggested_price: '', 
    category: '', 
    sub_category: '', 
    description: '', 
    stock: 10 
  });
  
  const [editingProduct, setEditingProduct] = useState(null);
  const [editMediaFiles, setEditMediaFiles] = useState([]);
  const [editUploading, setEditUploading] = useState(false);

  const [pkgForm, setPkgForm] = useState({ name: '', price: '', discount_percent: 0, featureInput: '', features: [] });
  const [editingPkg, setEditingPkg] = useState(null);
  const [savingPkg, setSavingPkg] = useState(false);

  const [managingOrder, setManagingOrder] = useState(null);
  const [updateOrderLoading, setUpdateOrderLoading] = useState(false);
  const [declineNoteInput, setDeclineNoteInput] = useState('');

  const [selectedSeller, setSelectedSeller] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const [banForm, setBanForm] = useState({ show: false, sellerId: null, sellerName: '', duration: '24h', reason: '' });
  const [isBanning, setIsBanning] = useState(false);

  // 💳 Payment Request Filter & Action Loading
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [paymentActionLoading, setPaymentActionLoading] = useState(null);

  useEffect(() => {
    fetchAdminData();
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { fetchAdminData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { fetchAdminData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activation_requests' }, () => { fetchAdminData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchAdminData() {
    setLoading(true);
    try {
      const { data: profileData } = await supabase.from('profiles').select('*');
      if (profileData) setProfiles(profileData);

      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (orderErr) console.error('Orders Fetch Error:', orderErr.message);

      const { data: productData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      const { data: pkgData } = await supabase.from('packages').select('*').order('price', { ascending: true });

      const { data: requestData, error: reqErr } = await supabase
        .from('activation_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (reqErr) console.error('Activation Requests Fetch Error:', reqErr.message);
      if (requestData) setActivationRequests(requestData);

      if (orderData) {
        const mappedOrders = orderData.map(o => {
          const matchedProfile = profileData?.find(p => p.id === o.user_id || p.id === o.reseller_id || p.id === o.profile_id);
          const matchedProduct = productData?.find(p => p.id === o.product_id);
          
          return {
            ...o,
            product_name: matchedProduct?.name || o.product_name || 'General Product',
            seller_id: matchedProfile?.id || o.reseller_id || o.user_id || 'unknown',
            seller_name: matchedProfile?.full_name || o.seller_name || 'BBC',
            seller_phone: matchedProfile?.phone || o.seller_phone || '',
            seller_logo: matchedProfile?.avatar_url || matchedProfile?.photo_url || matchedProfile?.logo_url || ''
          };
        });

        setOrders(mappedOrders);
        const initialHolds = {};
        mappedOrders.forEach(o => { if (o.payout_hold_reason) initialHolds[o.id] = o.payout_hold_reason; });
        setHoldReasons(initialHolds);
      }

      if (productData) setProducts(productData);
      if (pkgData) setPackages(pkgData);
    } catch (err) {
      console.error('Data Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }

  // 💳 Payment Request Actions
  async function handleApprovePayment(request) {
    if (!confirm(`Are you sure you want to approve payment for ${request.email} (${request.plan})?`)) return;
    setPaymentActionLoading(request.id);
    try {
      const { error: reqErr } = await supabase
        .from('activation_requests')
        .update({ status: 'approved' })
        .eq('id', request.id);

      if (reqErr) throw reqErr;

      if (request.user_id) {
        const cleanPlan = request.plan?.toLowerCase()?.replace(' reseller', '') || 'basic';
        await supabase
          .from('profiles')
          .update({
            plan: cleanPlan,
            status: 'active'
          })
          .eq('id', request.user_id);
      }

      alert('Payment confirmed and user plan activated successfully!');
      fetchAdminData();
    } catch (err) {
      alert('Error approving payment: ' + err.message);
    } finally {
      setPaymentActionLoading(null);
    }
  }

  async function handleDeclinePayment(request) {
    if (!confirm(`Are you sure you want to decline this payment (TrxID: ${request.transaction_id})?`)) return;
    setPaymentActionLoading(request.id);
    try {
      const { error } = await supabase
        .from('activation_requests')
        .update({ status: 'declined' })
        .eq('id', request.id);

      if (error) throw error;

      alert('Payment request has been declined.');
      fetchAdminData();
    } catch (err) {
      alert('Error declining payment: ' + err.message);
    } finally {
      setPaymentActionLoading(null);
    }
  }

  const handleCopyWallet = (text, id) => {
    if (!text || text === 'UNSET' || text.trim() === '') return alert('No wallet details available to copy!');
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileConvert = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleMultipleFilesChange = (e, isEdit = false) => {
    const files = Array.from(e.target.files);
    if (files.length > 10) {
      alert('You can upload a maximum of 10 images!');
      return;
    }
    if (isEdit) setEditMediaFiles(files);
    else setMediaFiles(files);
  };

  async function handleStatusChange(orderId, newStatus) {
    const { error } = await supabase.from('orders').update({ status: newStatus, updated_at: new Date() }).eq('id', orderId);
    if (!error) setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    else alert('Error updating status: ' + error.message);
  }

  async function handleBulkStatusChange() {
    if (selectedOrderIds.length === 0) return alert('Select at least one order!');
    setBulkUpdating(true);
    const { error } = await supabase.from('orders').update({ status: bulkStatus, updated_at: new Date() }).in('id', selectedOrderIds);
    setBulkUpdating(false);
    if (!error) {
      setOrders(orders.map(o => selectedOrderIds.includes(o.id) ? { ...o, status: bulkStatus } : o));
      setSelectedOrderIds([]);
      alert('Bulk status updated!');
    } else alert('Error: ' + error.message);
  }

  async function handleApproveCancel(orderId) {
    if (!confirm('Approve cancellation request? Order will be marked as cancelled.')) return;
    const { error } = await supabase.from('orders').update({ status: 'cancelled', cancel_reason: null, decline_note: null, updated_at: new Date() }).eq('id', orderId);
    if (!error) {
      alert('Order cancellation approved!');
      setManagingOrder(null);
      fetchAdminData();
    } else {
      alert('Error: ' + error.message);
    }
  }

  async function handleDeclineCancel(orderId) {
    if (!declineNoteInput.trim()) return alert('Please enter a reason why cancellation is declined!');
    const { error } = await supabase.from('orders').update({ status: 'confirmed', decline_note: declineNoteInput, cancel_reason: null, updated_at: new Date() }).eq('id', orderId);
    if (!error) {
      alert('Cancellation request declined with note!');
      setManagingOrder(null);
      setDeclineNoteInput('');
      fetchAdminData();
    } else {
      alert('Error: ' + error.message);
    }
  }

  async function handleDeleteOrder(orderId, customerName) {
    if (!confirm(`Are you sure you want to delete order for "${customerName || 'Customer'}"?`)) return;

    try {
      const { data, error } = await supabase.from('orders').delete().eq('id', orderId).select();
      if (error) { alert('Delete Failed: ' + error.message); return; }
      if (!data || data.length === 0) { alert('Warning: Database restricted deletion due to RLS policies.'); return; }

      setOrders(prev => prev.filter(o => o.id !== orderId));
      setSelectedOrderIds(prev => prev.filter(id => id !== orderId));
      alert('Order successfully deleted from database!');
      fetchAdminData();
    } catch (err) {
      alert('Delete Error: ' + err.message);
    }
  }

  async function handleBulkDeleteOrders() {
    if (selectedOrderIds.length === 0) return alert('Select at least one order!');
    if (!confirm(`Permanently delete ${selectedOrderIds.length} selected order(s)?`)) return;

    setBulkUpdating(true);
    try {
      const { data, error } = await supabase.from('orders').delete().in('id', selectedOrderIds).select();
      if (error) { alert('Bulk Delete Failed: ' + error.message); setBulkUpdating(false); return; }
      if (!data || data.length === 0) { alert('Warning: Database restricted bulk deletion.'); setBulkUpdating(false); return; }

      setOrders(prev => prev.filter(o => !selectedOrderIds.includes(o.id)));
      setSelectedOrderIds([]);
      alert('Selected orders successfully deleted!');
      fetchAdminData();
    } catch (err) {
      alert('Bulk Delete Error: ' + err.message);
    } finally {
      setBulkUpdating(false);
    }
  }

  const handleSelectOrder = (id) => setSelectedOrderIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const handleSelectAllOrders = () => setSelectedOrderIds(selectedOrderIds.length === orders.length ? [] : orders.map(o => o.id));

  async function handleSaveOrderDetails(e) {
    e.preventDefault();
    setUpdateOrderLoading(true);

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          customer_name: managingOrder.customer_name,
          customer_phone: managingOrder.customer_phone,
          delivery_address: managingOrder.delivery_address,
          total_amount: Number(managingOrder.total_amount) || 0,
          profit_amount: Number(managingOrder.profit_amount) || 0,
          delivery_charge: Number(managingOrder.delivery_charge) || 0,
          status: managingOrder.status,
          updated_at: new Date()
        })
        .eq('id', managingOrder.id);

      if (!error) {
        alert('Order updated successfully!');
        setManagingOrder(null);
        fetchAdminData();
      } else {
        alert('Error updating order: ' + error.message);
      }
    } catch (err) {
      alert('Error updating order: ' + err.message);
    } finally {
      setUpdateOrderLoading(false);
    }
  }

  const handlePrintInvoice = () => {
    if (!managingOrder) return;
    const printWindow = window.open('', '_blank');
    
    const storeName = managingOrder.seller_name || 'Resell Bari';
    const storePhone = managingOrder.seller_phone || '';
    const storeLogo = managingOrder.seller_logo || '';

    const numericInvoiceId = managingOrder.id ? managingOrder.id.replace(/\D/g, '').slice(-5) || '69120' : '69120';
    const productName = managingOrder.product_name || 'Product Item';
    const quantity = Number(managingOrder.quantity || 1);

    const deliveryFee = Number(managingOrder.delivery_charge ?? 60);
    const totalAmount = Number(managingOrder.total_amount || 0);
    const subtotal = totalAmount - deliveryFee;

    const invoiceContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice #${numericInvoiceId}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
          * { box-sizing: border-box; }
          body { font-family: 'Plus Jakarta Sans', sans-serif; margin: 0; padding: 40px 20px; color: #0f172a; background: #f8fafc; }
          .invoice-card { max-width: 750px; margin: auto; background: #ffffff; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.05); overflow: hidden; border: 1px solid #e2e8f0; }
          .top-banner { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%); padding: 32px 40px; color: #ffffff; display: flex; justify-content: space-between; align-items: center; }
          .store-brand { display: flex; align-items: center; gap: 16px; }
          .logo-box { width: 65px; height: 65px; border-radius: 16px; background: #ffffff; padding: 3px; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15); }
          .logo-img { width: 100%; height: 100%; object-fit: cover; border-radius: 13px; display: block; }
          .logo-fallback-icon { font-size: 28px; }
          .store-name { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2; text-transform: uppercase; }
          .store-phone { font-size: 13px; opacity: 0.9; margin-top: 2px; font-weight: 500; }
          .invoice-badge { background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.3); padding: 8px 16px; border-radius: 99px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
          .content-body { padding: 40px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
          .info-card { background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #f1f5f9; }
          .info-card h4 { margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; font-weight: 800; }
          .info-card p { margin: 5px 0; font-size: 14px; font-weight: 600; color: #1e293b; }
          .table { width: 100%; border-collapse: collapse; margin-top: 10px; border-radius: 16px; overflow: hidden; }
          .table th { background: #f1f5f9; text-align: left; padding: 14px 16px; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 800; }
          .table td { padding: 18px 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; font-weight: 700; color: #0f172a; }
          .total-section { margin-top: 32px; display: flex; justify-content: flex-end; }
          .total-card { width: 280px; background: #faf5ff; border: 1px solid #f3e8ff; padding: 20px; border-radius: 16px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #64748b; font-weight: 600; }
          .total-row.grand { border-top: 2px solid #d8b4fe; padding-top: 10px; margin-top: 10px; font-size: 18px; font-weight: 800; color: #6b21a8; }
          .footer-note { text-align: center; margin-top: 40px; font-size: 15px; font-weight: 700; color: #4f46e5; }
          @media print { body { padding: 0; background: #fff; } .invoice-card { border: none; box-shadow: none; border-radius: 0; } }
        </style>
      </head>
      <body>
        <div class="invoice-card">
          <div class="top-banner">
            <div class="store-brand">
              <div class="logo-box">
                ${storeLogo && storeLogo.trim() !== '' ? `<img id="store-logo-img" src="${storeLogo}" class="logo-img" alt="Logo" />` : `<span class="logo-fallback-icon">🛍️</span>`}
              </div>
              <div>
                <div class="store-name">${storeName}</div>
                <div class="store-phone">Contact: ${storePhone}</div>
              </div>
            </div>
            <div class="invoice-badge">${managingOrder.status || 'Confirmed'}</div>
          </div>
          <div class="content-body">
            <div class="info-grid">
              <div class="info-card">
                <h4>Customer Details</h4>
                <p>👤 ${managingOrder.customer_name || 'N/A'}</p>
                <p>📞 ${managingOrder.customer_phone || 'N/A'}</p>
                <p>📍 ${managingOrder.delivery_address || 'N/A'}</p>
              </div>
              <div class="info-card">
                <h4>Invoice Summary</h4>
                <p>Invoice No: #${numericInvoiceId}</p>
                <p>Date: ${new Date(managingOrder.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Selling Price</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="text-transform: uppercase;">${productName}</td>
                  <td style="text-align: center;">${quantity}</td>
                  <td style="text-align: right;">৳${totalAmount}</td>
                </tr>
              </tbody>
            </table>
            <div class="total-section">
              <div class="total-card">
                <div class="total-row"><span>Subtotal</span><span>৳${subtotal > 0 ? subtotal : 0}</span></div>
                <div class="total-row"><span>Delivery Charge</span><span>৳${deliveryFee}</span></div>
                <div class="total-row grand"><span>Total Amount</span><span>৳${totalAmount}</span></div>
              </div>
            </div>
            <div class="footer-note">Thank you for your purchase!</div>
          </div>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(invoiceContent);
    printWindow.document.close();
  };

  async function handlePayoutUpdate(orderId, newPayoutStatus) {
    const reason = holdReasons[orderId] || '';
    const { error } = await supabase.from('orders').update({ payout_status: newPayoutStatus, payout_hold_reason: newPayoutStatus === 'hold' ? reason : null, updated_at: new Date() }).eq('id', orderId);
    if (!error) setOrders(orders.map(o => o.id === orderId ? { ...o, payout_status: newPayoutStatus, payout_hold_reason: newPayoutStatus === 'hold' ? reason : null } : o));
    else alert('Error: ' + error.message);
  }

  // 🌟 Add Product with Category and Sub-Category
  async function handleAddProduct(e) {
    e.preventDefault();
    if (mediaFiles.length === 0) return alert('Please select at least one product image!');
    setUploading(true);
    try {
      const imageList = await Promise.all(mediaFiles.map(file => handleFileConvert(file)));
      
      const { error } = await supabase.from('products').insert([{
        name: newProduct.title,
        price: Number(newProduct.base_price) || 0,
        suggested_price: Number(newProduct.suggested_price) || 0,
        category: newProduct.category || null,
        sub_category: newProduct.sub_category || null,
        image_url: imageList[0],
        images: imageList,
        description: newProduct.description || null,
        stock: Number(newProduct.stock) || 0
      }]);

      if (!error) {
        alert('Product successfully saved to Inventory!');
        setNewProduct({ title: '', base_price: '', suggested_price: '', category: '', sub_category: '', description: '', stock: 10 });
        setMediaFiles([]);
        fetchAdminData();
      } else alert('Error adding product: ' + error.message);
    } catch (err) {
      alert('Upload Error: ' + err.message);
    } finally { 
      setUploading(false); 
    }
  }

  async function handleDeleteProduct(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) setProducts(products.filter(p => p.id !== id));
    else alert('Error: ' + error.message);
  }

  // 🌟 Update Product with Category and Sub-Category
  async function handleUpdateProduct(e) {
    e.preventDefault();
    setEditUploading(true);
    try {
      let finalImages = editingProduct.images || (editingProduct.image_url ? [editingProduct.image_url] : []);
      if (editMediaFiles.length > 0) {
        finalImages = await Promise.all(editMediaFiles.map(file => handleFileConvert(file)));
      }

      const { error } = await supabase.from('products').update({
        name: editingProduct.name || editingProduct.title,
        price: Number(editingProduct.price ?? editingProduct.base_price) || 0,
        suggested_price: Number(editingProduct.suggested_price) || 0,
        category: editingProduct.category || null,
        sub_category: editingProduct.sub_category || null,
        image_url: finalImages[0] || null,
        images: finalImages,
        description: editingProduct.description || null,
        stock: Number(editingProduct.stock) || 0
      }).eq('id', editingProduct.id);

      if (!error) { 
        setEditingProduct(null); 
        setEditMediaFiles([]); 
        fetchAdminData(); 
      } else alert('Error: ' + error.message);
    } catch (err) {
      alert('Update Error: ' + err.message);
    } finally { 
      setEditUploading(false); 
    }
  }

  const handleAddFeatureToPkg = () => {
    if (!pkgForm.featureInput.trim()) return;
    setPkgForm({ ...pkgForm, features: [...pkgForm.features, pkgForm.featureInput.trim()], featureInput: '' });
  };

  const handleRemoveFeature = (idx) => {
    setPkgForm({ ...pkgForm, features: pkgForm.features.filter((_, i) => i !== idx) });
  };

  async function handleSavePackage(e) {
    e.preventDefault();
    setSavingPkg(true);
    try {
      if (editingPkg) {
        const { error } = await supabase.from('packages').update({
          name: pkgForm.name,
          price: Number(pkgForm.price) || 0,
          discount_percent: Number(pkgForm.discount_percent) || 0,
          features: pkgForm.features
        }).eq('id', editingPkg.id);

        if (!error) {
          alert('Package updated successfully!');
          setEditingPkg(null);
          setPkgForm({ name: '', price: '', discount_percent: 0, featureInput: '', features: [] });
          fetchAdminData();
        } else alert('Error updating package: ' + error.message);
      } else {
        const { error } = await supabase.from('packages').insert([{
          name: pkgForm.name,
          price: Number(pkgForm.price) || 0,
          discount_percent: Number(pkgForm.discount_percent) || 0,
          features: pkgForm.features
        }]);

        if (!error) {
          alert('Package saved successfully!');
          setPkgForm({ name: '', price: '', discount_percent: 0, featureInput: '', features: [] });
          fetchAdminData();
        } else alert('Error saving package: ' + error.message);
      }
    } catch (err) {
      alert('Package Save Error: ' + err.message);
    } finally { 
      setSavingPkg(false); 
    }
  }

  async function handleDeletePackage(id) {
    if (!confirm('Are you sure you want to delete this package?')) return;
    const { error } = await supabase.from('packages').delete().eq('id', id);
    if (!error) setPackages(packages.filter(p => p.id !== id));
    else alert('Error: ' + error.message);
  }

  async function handleBanSeller(e) {
    e.preventDefault();
    if (!banForm.reason.trim()) return alert("Please provide a reason for the ban.");
    
    setIsBanning(true);
    let expiresAt = null;

    if (banForm.duration !== 'permanent') {
      const now = new Date();
      if (banForm.duration === '5h') now.setHours(now.getHours() + 5);
      else if (banForm.duration === '12h') now.setHours(now.getHours() + 12);
      else if (banForm.duration === '24h') now.setHours(now.getHours() + 24);
      else if (banForm.duration === '7d') now.setDate(now.getDate() + 7);
      expiresAt = now.toISOString();
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_banned: true,
          ban_reason: banForm.reason,
          ban_expires_at: expiresAt
        })
        .eq('id', banForm.sellerId);

      if (!error) {
        alert('Seller has been banned successfully.');
        setBanForm({ show: false, sellerId: null, sellerName: '', duration: '24h', reason: '' });
        fetchAdminData();
        setSelectedSeller(null);
      } else {
        alert('Error banning seller: ' + error.message);
      }
    } catch (err) {
      alert('Error banning seller: ' + err.message);
    } finally {
      setIsBanning(false);
    }
  }

  async function handleUnbanSeller(sellerId) {
    if (!confirm("Are you sure you want to unban this seller?")) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_banned: false,
          ban_reason: null,
          ban_expires_at: null
        })
        .eq('id', sellerId);

      if (!error) {
        alert('Seller unbanned successfully.');
        fetchAdminData();
        setSelectedSeller(null);
      } else {
        alert('Error unbanning: ' + error.message);
      }
    } catch (err) {
      alert('Error unbanning: ' + err.message);
    }
  }

  async function handleDeleteSellerProfile(sellerId, sellerName) {
    if (!confirm(`⚠️ WARNING: Are you sure you want to PERMANENTLY delete seller "${sellerName}"? This action cannot be undone and will remove their profile data.`)) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', sellerId);

      if (!error) {
        alert("Seller profile deleted successfully.");
        fetchAdminData();
        setSelectedSeller(null);
      } else {
        alert("Error deleting seller: " + error.message);
      }
    } catch (err) {
      alert("Error deleting seller: " + err.message);
    }
  }

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const cancelRequests = orders.filter(o => o.status === 'cancel_requested');
  const pendingPayments = activationRequests.filter(r => r.status === 'pending');
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const deliveredSalesValue = deliveredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const totalResellerProfit = deliveredOrders.reduce((sum, o) => sum + Number(o.profit_amount || 0), 0);
  const lowStockProducts = products.filter(p => (p.stock || 0) <= 5);

  const filteredActivationRequests = activationRequests.filter(r => {
    if (paymentFilter === 'all') return true;
    return r.status === paymentFilter;
  });

  const getSellersList = () => {
    const sellerMap = {};
    profiles.forEach(p => {
      const walletMethod = p.payment_method || p.payment_option || 'bKash Personal';
      const bkashNumber = p.bkash_number || p.bkash || p.payment_number || p.account_number || p.mobile_banking_number || p.payout_number || p.bkash_phone || '';
      const realPhone = p.phone && p.phone.trim() !== '' ? p.phone : '';
      const realWalletNum = bkashNumber && bkashNumber.trim() !== '' ? bkashNumber : realPhone;

      sellerMap[p.id] = {
        id: p.id,
        name: p.full_name || 'Seller',
        email: p.email || 'No Email',
        plan: p.plan || null,
        phone: realPhone || 'N/A',
        payment_method: realWalletNum ? `${walletMethod} (${realWalletNum})` : walletMethod,
        raw_bkash_number: realWalletNum,
        is_banned: p.is_banned || false,
        ban_reason: p.ban_reason || '',
        ban_expires_at: p.ban_expires_at || null,
        orders: []
      };
    });

    orders.forEach(o => {
      const sId = o.seller_id || o.reseller_id || o.user_id || 'unknown';
      if (!sellerMap[sId]) {
        const profileInfo = profiles.find(prof => prof.id === sId);
        const walletMethod = profileInfo?.payment_method || 'bKash Personal';
        const bkashNumber = profileInfo?.bkash_number || profileInfo?.bkash || profileInfo?.payment_number || profileInfo?.phone || o.seller_phone || '';

        sellerMap[sId] = {
          id: sId,
          name: profileInfo?.full_name || o.seller_name || 'Seller',
          email: profileInfo?.email || 'No Email',
          plan: profileInfo?.plan || null,
          phone: profileInfo?.phone || o.seller_phone || 'N/A',
          payment_method: bkashNumber ? `${walletMethod} (${bkashNumber})` : walletMethod,
          raw_bkash_number: bkashNumber,
          is_banned: profileInfo?.is_banned || false,
          ban_reason: profileInfo?.ban_reason || '',
          ban_expires_at: profileInfo?.ban_expires_at || null,
          orders: []
        };
      }
      sellerMap[sId].orders.push(o);
    });

    return Object.values(sellerMap);
  };

  const sellersList = getSellersList();

  const getChartData = () => {
    const map = {};
    orders.forEach(o => {
      const date = new Date(o.created_at);
      let key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (chartFilter === 'monthly') key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      else if (chartFilter === 'yearly') key = `${date.getFullYear()}`;
      map[key] = (map[key] || 0) + Number(o.total_amount || 0);
    });
    const keys = Object.keys(map).slice(-10);
    return keys.map(k => ({ name: k, Sales: map[k] }));
  };

  const chartData = getChartData();

  if (loading) return <div className="min-h-screen bg-[#0b0f19] text-slate-300 p-8 flex items-center justify-center font-sans">Loading Enterprise Control Hub...</div>;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans flex flex-col md:flex-row w-full overflow-x-hidden">
      
      {/* 🧭 PROFESSIONAL LEFT SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-72 bg-slate-900/95 border-r border-slate-800/80 p-6 flex flex-col justify-between shrink-0 md:min-h-screen md:sticky md:top-0 z-40 backdrop-blur-2xl">
        <div className="space-y-8">
          
          {/* BRAND LOGO */}
          <div className="px-2 pt-1">
            <Link href="/" className="inline-block">
              <img 
                src="/logo.svg" 
                alt="Resell Bari Logo" 
                className="h-10 sm:h-11 w-auto object-contain"
              />
            </Link>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Enterprise Admin</span>
            </div>
          </div>

          {/* LARGE & PROFESSIONAL MENU ITEMS */}
          <nav className="space-y-2">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'orders', label: 'Orders', icon: '📦', badge: pendingOrders.length },
              { id: 'resellers', label: 'Resellers', icon: '👥' },
              { id: 'payments', label: 'Payments', icon: '💳', badge: pendingPayments.length },
              { id: 'inventory', label: 'Inventory', icon: '🏷️' },
              { id: 'packages', label: 'Packages', icon: '💎' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-extrabold transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-emerald-500 text-slate-950 shadow-xl shadow-emerald-500/20 translate-x-1'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{tab.icon}</span>
                  <span className="tracking-wide">{tab.label}</span>
                </div>
                {tab.badge > 0 && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                    activeTab === tab.id 
                      ? 'bg-slate-950 text-emerald-400' 
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* SIDEBAR FOOTER */}
        <div className="pt-6 border-t border-slate-800/80 space-y-3">
          <Link 
            href="/products?mode=admin" 
            className="w-full flex items-center gap-2.5 px-4 py-3 bg-slate-800/60 hover:bg-slate-800 text-amber-400 border border-slate-700/60 rounded-2xl text-xs font-bold transition justify-center"
          >
            <span>👁️</span> View Shop Page
          </Link>

          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="w-full flex items-center gap-2.5 px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-2xl text-xs font-bold transition justify-center cursor-pointer"
          >
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* 🖥️ FULL-WIDTH EXPANDED CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-8 md:p-10 w-full min-h-screen">
        
        {/* HEADER BAR */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full shadow-lg">
          <div>
            <h2 className="text-2xl font-black text-white capitalize">{activeTab} Control Center</h2>
            <p className="text-xs text-slate-400 mt-1">Manage lifecycles, analytics, packages, payments, and resellers in real-time.</p>
          </div>
          <div className="text-xs font-mono bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-slate-300 font-semibold shadow-inner">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 w-full">
            {/* 💳 PENDING PAYMENTS ALERT */}
            {pendingPayments.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-teal-500/5 border-2 border-emerald-500/50 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-pulse w-full">
                <div className="flex items-center gap-4">
                  <span className="text-3xl sm:text-4xl bg-emerald-500/20 p-3 rounded-2xl border border-emerald-500/40">💳</span>
                  <div>
                    <h3 className="text-base sm:text-xl font-extrabold text-emerald-400 tracking-wide">
                      {pendingPayments.length} RESELLER MEMBERSHIP PAYMENT{pendingPayments.length > 1 ? 'S' : ''} PENDING!
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">Resellers submitted payment details. Verify TrxID and activate accounts.</p>
                  </div>
                </div>
                <button onClick={() => setActiveTab('payments')} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-6 py-3.5 rounded-2xl transition shadow-lg shrink-0 text-center cursor-pointer">
                  ⚡ Verify Payments ({pendingPayments.length})
                </button>
              </div>
            )}

            {cancelRequests.length > 0 && (
              <div className="bg-gradient-to-r from-rose-500/20 via-rose-500/10 to-rose-500/5 border-2 border-rose-500/50 rounded-3xl p-6 shadow-2xl space-y-4 w-full">
                <div className="flex items-center gap-4">
                  <span className="text-3xl bg-rose-500/20 p-3 rounded-2xl border border-rose-500/40">🚨</span>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-rose-400">
                      {cancelRequests.length} ORDER CANCELLATION REQUEST{cancelRequests.length > 1 ? 'S' : ''} PENDING!
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">Resellers have requested to cancel the following orders. Review reasons and approve or decline.</p>
                  </div>
                </div>
                <div className="space-y-2.5 pt-2">
                  {cancelRequests.map(o => (
                    <div key={o.id} className="bg-slate-950/80 border border-rose-900/40 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                      <div>
                        <p className="font-bold text-white text-sm">Customer: {o.customer_name} ({o.customer_phone}) - <span className="text-emerald-400">৳{o.total_amount}</span></p>
                        <p className="text-amber-400 mt-1">💬 Reseller Reason: "{o.cancel_reason || 'No reason provided'}"</p>
                      </div>
                      <button 
                        onClick={() => { setActiveTab('orders'); setManagingOrder(o); }}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2.5 rounded-xl transition shrink-0 cursor-pointer"
                      >
                        Review & Decide
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingOrders.length > 0 ? (
              <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/5 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-pulse w-full">
                <div className="flex items-center gap-4">
                  <span className="text-3xl sm:text-4xl bg-amber-500/20 p-3 rounded-2xl border border-amber-500/40">🔔</span>
                  <div>
                    <h3 className="text-base sm:text-xl font-extrabold text-amber-400 tracking-wide">
                      {pendingOrders.length} NEW RESELLER ORDER{pendingOrders.length > 1 ? 'S' : ''} AWAITING PROCESSING!
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">Resellers have submitted new orders. Please review or process them now.</p>
                  </div>
                </div>
                <button onClick={() => setActiveTab('orders')} className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-6 py-3.5 rounded-2xl transition shadow-lg shrink-0 text-center cursor-pointer">
                  ⚡ Review & Process ({pendingOrders.length})
                </button>
              </div>
            ) : (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 flex items-center gap-2">
                <span>✅</span> No pending new reseller orders right now.
              </div>
            )}

            {/* FULL WIDTH STATS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-md">
                <p className="text-xs text-slate-400 uppercase font-semibold">Total Orders</p>
                <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">{orders.length}</h2>
              </div>
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-md">
                <p className="text-xs text-slate-400 uppercase font-semibold">Delivered Sales</p>
                <h2 className="text-3xl sm:text-4xl font-black text-emerald-400 mt-2">৳{deliveredSalesValue}</h2>
              </div>
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-md">
                <p className="text-xs text-slate-400 uppercase font-semibold">Reseller Profit</p>
                <h2 className="text-3xl sm:text-4xl font-black text-teal-400 mt-2">৳{totalResellerProfit}</h2>
              </div>
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-md">
                <p className="text-xs text-slate-400 uppercase font-semibold">Low Stock</p>
                <h2 className={`text-3xl sm:text-4xl font-black mt-2 ${lowStockProducts.length > 0 ? 'text-rose-500' : 'text-slate-400'}`}>{lowStockProducts.length} Items</h2>
              </div>
            </div>

            {/* FULL WIDTH EXPANDED GRAPH */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full shadow-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Sales & Revenue Analytics Graph</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Visual trend chart of performance over time.</p>
                </div>

                <div className="flex bg-slate-800 rounded-2xl p-1 text-xs self-end sm:self-auto">
                  {['daily', 'monthly', 'yearly'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setChartFilter(f)}
                      className={`px-3.5 py-1.5 rounded-xl font-bold capitalize transition text-xs cursor-pointer ${
                        chartFilter === f ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-72 sm:h-96 w-full pt-2">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '14px', color: '#fff', fontSize: '12px' }}
                        formatter={(value) => [`৳${value}`, 'Sales']}
                      />
                      <Area type="monotone" dataKey="Sales" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">No sales data available</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 w-full shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
              <div>
                <h2 className="text-xl font-bold text-white">💳 Membership Payment & Activation Requests</h2>
                <p className="text-xs text-slate-400 mt-1">Verify user transaction IDs, confirm payments, or decline requests.</p>
              </div>

              <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 gap-1">
                {['all', 'pending', 'approved', 'declined'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setPaymentFilter(tab)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                      paymentFilter === tab
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/40 text-slate-400 text-xs uppercase border-b border-slate-800 font-bold">
                    <th className="p-4">User / Email</th>
                    <th className="p-4">Plan</th>
                    <th className="p-4">Method</th>
                    <th className="p-4">Sender Phone</th>
                    <th className="p-4">TrxID</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                  {filteredActivationRequests.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-slate-500 font-semibold">No payment requests found.</td></tr>
                  ) : (
                    filteredActivationRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-800/20 transition">
                        <td className="p-4">
                          <div className="font-bold text-white text-sm">{req.email || 'N/A'}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{new Date(req.created_at).toLocaleString()}</div>
                        </td>
                        <td className="p-4">
                          <span className="px-3 py-1 bg-slate-800 text-emerald-400 rounded-lg text-xs font-bold uppercase">
                            {req.plan}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-amber-400 text-sm">{req.payment_method}</td>
                        <td className="p-4 font-mono font-semibold text-slate-200">{req.phone_number}</td>
                        <td className="p-4 font-mono font-bold text-emerald-400 bg-emerald-500/5 px-2.5 py-1 rounded-md">
                          {req.transaction_id}
                        </td>
                        <td className="p-4 font-bold text-white text-sm">{req.amount}</td>
                        <td className="p-4">
                          {req.status === 'pending' && (
                            <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold">
                              ● Pending
                            </span>
                          )}
                          {req.status === 'approved' && (
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold">
                              ✓ Approved
                            </span>
                          )}
                          {req.status === 'declined' && (
                            <span className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-xs font-bold">
                              ✕ Declined
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {req.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApprovePayment(req)}
                                disabled={paymentActionLoading === req.id}
                                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-extrabold transition disabled:opacity-50 cursor-pointer shadow-md"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => handleDeclinePayment(req)}
                                disabled={paymentActionLoading === req.id}
                                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2 rounded-xl text-xs font-extrabold transition disabled:opacity-50 cursor-pointer"
                              >
                                Decline
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs italic">Completed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: RESELLERS */}
        {activeTab === 'resellers' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full shadow-lg">
            <h2 className="text-xl font-bold text-white mb-1">👥 Reseller Management & Seller Hub</h2>
            <p className="text-xs text-slate-400 mb-6">View registered sellers, membership status, sales breakdown, and manage accounts.</p>

            <div className="block md:hidden space-y-4">
              {sellersList.map((seller, idx) => (
                <div key={seller.id} className={`p-4 bg-slate-950/80 border ${seller.is_banned ? 'border-rose-500/50' : 'border-slate-800'} rounded-2xl space-y-3`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono bg-slate-800 px-2.5 py-1 rounded text-emerald-400 font-bold">Serial #{idx + 1}</span>
                      <h4 className="font-bold text-white text-base mt-1.5 flex items-center gap-2">
                        {seller.name}
                        {seller.is_banned && <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded font-black">BANNED</span>}
                      </h4>
                      <p className="text-xs text-slate-300">{seller.email}</p>
                      <p className="text-xs text-slate-500">{seller.phone}</p>
                    </div>
                    
                    <div>
                      {seller.plan ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          {seller.plan}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                          NO PLAN
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/60">
                    <span className="uppercase text-xs font-bold text-emerald-400">
                      {seller.payment_method}
                    </span>
                    <button 
                      onClick={() => handleCopyWallet(seller.raw_bkash_number || seller.payment_method, seller.id)}
                      className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1 rounded-lg text-emerald-400 font-bold cursor-pointer"
                    >
                      {copiedId === seller.id ? '✓ Copied' : '📋 Copy'}
                    </button>
                  </div>

                  <div className="flex justify-between items-center pt-2 text-xs">
                    <span className="text-slate-400">Total Orders: <strong className="text-white text-sm">{seller.orders.length}</strong></span>
                    <button 
                      onClick={() => setSelectedSeller(seller)}
                      className="bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow cursor-pointer"
                    >
                      📊 View Dashboard
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/40 text-slate-400 text-xs uppercase border-b border-slate-800 font-bold">
                    <th className="p-4 w-20">Serial</th>
                    <th className="p-4">Seller Name & Details</th>
                    <th className="p-4">Membership Status</th>
                    <th className="p-4">Wallet / Bank Details</th>
                    <th className="p-4">Total Orders</th>
                    <th className="p-4 text-right">Dashboard Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                  {sellersList.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">No sellers found.</td></tr>
                  ) : (
                    sellersList.map((seller, idx) => (
                      <tr key={seller.id} className={`hover:bg-slate-800/20 transition ${seller.is_banned ? 'bg-rose-950/10' : ''}`}>
                        <td className="p-4 font-mono font-bold text-emerald-400 text-sm">#{idx + 1}</td>
                        
                        <td className="p-4">
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            {seller.name}
                            {seller.is_banned && <span className="bg-rose-500 text-white text-[9px] px-2 py-0.5 rounded font-black">BANNED</span>}
                          </div>
                          <div className="text-slate-300 text-xs mt-0.5">{seller.email}</div>
                          <div className="text-slate-500 text-[11px]">{seller.phone}</div>
                        </td>

                        <td className="p-4">
                          {seller.plan ? (
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                              ACTIVE ({seller.plan})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/30 tracking-wide">
                              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                              NO PLAN
                            </span>
                          )}
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <span className="uppercase font-bold text-emerald-400">{seller.payment_method}</span>
                            <button 
                              onClick={() => handleCopyWallet(seller.raw_bkash_number || seller.payment_method, seller.id)}
                              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs px-2.5 py-1 rounded-lg text-emerald-400 font-bold transition cursor-pointer"
                            >
                              {copiedId === seller.id ? '✓ Copied' : '📋 Copy'}
                            </button>
                          </div>
                        </td>

                        <td className="p-4 font-semibold text-slate-200 text-sm">{seller.orders.length} Orders</td>

                        <td className="p-4 text-right">
                          <button 
                            onClick={() => setSelectedSeller(seller)}
                            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl transition text-xs shadow-md cursor-pointer"
                          >
                            📊 View Seller Dashboard
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: ORDERS */}
        {activeTab === 'orders' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Live Reseller Orders Stream</h2>
                <p className="text-xs text-slate-400 mt-0.5">Manage orders, seller details, and print custom invoices.</p>
              </div>

              {selectedOrderIds.length > 0 && (
                <div className="flex flex-wrap gap-3 items-center bg-slate-950/90 border border-emerald-500/40 p-3 rounded-2xl w-full sm:w-auto justify-between">
                  <span className="text-xs font-bold text-emerald-400">{selectedOrderIds.length} Selected</span>
                  <div className="flex gap-2 items-center flex-wrap">
                    <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="bg-slate-800 text-xs text-white p-2 rounded-xl border border-slate-700">
                      <option value="confirmed">Confirmed</option>
                      <option value="in_transit">In Transit</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button onClick={handleBulkStatusChange} disabled={bulkUpdating} className="bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shrink-0 hover:bg-emerald-400 transition cursor-pointer">
                      {bulkUpdating ? '...' : 'Apply Status'}
                    </button>
                    <button onClick={handleBulkDeleteOrders} disabled={bulkUpdating} className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2 rounded-xl shrink-0 transition cursor-pointer">
                      🗑️ Delete Selected
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/40 text-slate-400 text-xs uppercase border-b border-slate-800 font-bold">
                    <th className="p-4 w-[5%] text-center"><input type="checkbox" checked={orders.length > 0 && selectedOrderIds.length === orders.length} onChange={handleSelectAllOrders} className="w-4 h-4 accent-emerald-500" /></th>
                    <th className="p-4 w-[25%]">Customer Info</th>
                    <th className="p-4 w-[22%]">Seller / Shop Name</th>
                    <th className="p-4 w-[18%]">Selling / Profit</th>
                    <th className="p-4 w-[12%]">Status</th>
                    <th className="p-4 w-[18%] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-800/20 transition">
                      <td className="p-4 text-center"><input type="checkbox" checked={selectedOrderIds.includes(o.id)} onChange={() => handleSelectOrder(o.id)} className="w-4 h-4 accent-emerald-500" /></td>
                      <td className="p-4">
                        <div className="font-bold text-white flex items-center gap-2 text-sm">
                          {o.customer_name}
                          {o.status === 'cancel_requested' && (
                            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                              CANCEL REQUESTED
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-xs mt-0.5">{o.customer_phone}</div>
                        {o.cancel_reason && (
                          <div className="text-xs text-amber-400 mt-1 italic">
                            💬 Cancel Reason: "{o.cancel_reason}"
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-amber-400 text-sm">{o.seller_name}</div>
                        <div className="text-slate-500 text-[11px]">{o.seller_phone}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">Selling: <strong>৳{o.total_amount}</strong></div>
                        <div className="text-emerald-400 font-semibold mt-0.5">Profit: ৳{o.profit_amount || 0}</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border capitalize ${
                          o.status === 'cancel_requested' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                          o.status === 'cancelled' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {o.status === 'cancel_requested' ? 'Cancel Req' : o.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setManagingOrder(o)}
                            className={`px-3.5 py-2 rounded-xl font-bold transition text-xs whitespace-nowrap cursor-pointer ${
                              o.status === 'cancel_requested' 
                                ? 'bg-rose-500 text-white animate-pulse' 
                                : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700'
                            }`}
                          >
                            {o.status === 'cancel_requested' ? '🚨 Review Cancel' : '⚙️ Manage'}
                          </button>
                          <button 
                            onClick={() => handleDeleteOrder(o.id, o.customer_name)}
                            className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl font-bold transition text-xs flex items-center gap-1 whitespace-nowrap cursor-pointer"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: INVENTORY */}
        {activeTab === 'inventory' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
            <div className="bg-slate-900/60 border border-slate-800 p-6 sm:p-8 rounded-3xl h-fit shadow-lg">
              <h3 className="text-lg font-bold text-white mb-6">➕ Add New Product</h3>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-semibold">Product Title *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Collagen Beauty Cream - 30g" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500" 
                    value={newProduct.title} 
                    onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-semibold">Category</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Skin Care" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500" 
                      value={newProduct.category} 
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-semibold">Sub-Category</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Day Cream" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500" 
                      value={newProduct.sub_category} 
                      onChange={(e) => setNewProduct({ ...newProduct, sub_category: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-semibold">Base Price (৳) *</label>
                    <input 
                      type="number" 
                      required 
                      placeholder="300" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500" 
                      value={newProduct.base_price} 
                      onChange={(e) => setNewProduct({ ...newProduct, base_price: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-semibold">Suggested Price (৳) *</label>
                    <input 
                      type="number" 
                      required 
                      placeholder="500" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500" 
                      value={newProduct.suggested_price} 
                      onChange={(e) => setNewProduct({ ...newProduct, suggested_price: e.target.value })} 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-semibold">Product Images (Max 10 Files) *</label>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={(e) => handleMultipleFilesChange(e, false)} 
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:bg-slate-800 file:text-emerald-400 cursor-pointer" 
                  />
                  {mediaFiles.length > 0 && <p className="text-xs text-emerald-400 mt-1 font-semibold">✓ {mediaFiles.length} image(s) selected</p>}
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-semibold">Product Information / Description</label>
                  <textarea 
                    rows={3} 
                    placeholder="Enter detailed specifications..." 
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500" 
                    value={newProduct.description} 
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-semibold">Initial Stock Units</label>
                  <input 
                    type="number" 
                    placeholder="10" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500" 
                    value={newProduct.stock} 
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={uploading} 
                  className="w-full bg-emerald-500 text-slate-950 font-extrabold py-4 rounded-2xl text-xs transition hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  {uploading ? 'Processing...' : '+ Save Product to Inventory'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4">Inventory Catalogue ({products.length})</h3>
              {products.map((p) => (
                <div key={p.id} className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl flex justify-between items-center gap-4 hover:bg-slate-800/60 transition">
                  <div className="flex items-center gap-4">
                    <img src={p.image_url || p.images?.[0] || 'https://via.placeholder.com/50'} className="w-14 h-14 rounded-2xl object-cover shrink-0" alt={p.name} />
                    <div>
                      <h4 className="font-bold text-white text-sm sm:text-base">{p.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {p.category && (
                          <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg">
                            {p.category} {p.sub_category ? `› ${p.sub_category}` : ''}
                          </span>
                        )}
                        <p className="text-xs text-slate-400">Base: ৳{p.price} | Stock: {p.stock || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingProduct(p)} className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer">✏️ Edit</button>
                    <button onClick={() => handleDeleteProduct(p.id, p.name)} className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold border border-rose-500/20 transition cursor-pointer">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: PACKAGES */}
        {activeTab === 'packages' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
            <div className="bg-slate-900/60 border border-slate-800 p-6 sm:p-8 rounded-3xl h-fit space-y-6 shadow-lg">
              <h3 className="text-lg font-bold text-white">
                {editingPkg ? '✏️ Edit Membership Package' : '➕ Create New Package'}
              </h3>

              <form onSubmit={handleSavePackage} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-semibold">Package Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Basic, Advance, Premium"
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    value={pkgForm.name}
                    onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-semibold">Price (৳) *</label>
                    <input
                      type="number"
                      required
                      placeholder="349"
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3.5 text-xs text-white focus:outline-none"
                      value={pkgForm.price}
                      onChange={(e) => setPkgForm({ ...pkgForm, price: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-semibold">Discount (% Off)</label>
                    <input
                      type="number"
                      placeholder="2 or 4"
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3.5 text-xs text-white focus:outline-none"
                      value={pkgForm.discount_percent}
                      onChange={(e) => setPkgForm({ ...pkgForm, discount_percent: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-400 block font-semibold">Rules & Benefits (Bullet Points)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 2% Flat Discount on all products"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none"
                      value={pkgForm.featureInput}
                      onChange={(e) => setPkgForm({ ...pkgForm, featureInput: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={handleAddFeatureToPkg}
                      className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-bold text-xs px-4 py-2 rounded-xl shrink-0 cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    {pkgForm.features.map((feat, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-950/80 p-2.5 rounded-xl text-xs text-slate-300 border border-slate-800">
                        <span className="truncate max-w-[250px]">• {feat}</span>
                        <button type="button" onClick={() => handleRemoveFeature(idx)} className="text-rose-400 hover:text-rose-300 font-bold ml-2 cursor-pointer">✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  {editingPkg && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPkg(null);
                        setPkgForm({ name: '', price: '', discount_percent: 0, featureInput: '', features: [] });
                      }}
                      className="w-1/2 bg-slate-800 text-slate-300 font-bold py-3.5 rounded-2xl text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={savingPkg}
                    className={`w-full ${editingPkg ? 'w-1/2 bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'} font-extrabold py-3.5 rounded-2xl text-xs transition hover:opacity-90 cursor-pointer`}
                  >
                    {savingPkg ? 'Saving...' : editingPkg ? 'Update Package' : '+ Save Package'}
                  </button>
                </div>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold text-white mb-2">Active Packages Catalogue ({packages.length})</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between space-y-6 shadow-lg">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-lg font-bold text-white uppercase">{pkg.name}</h4>
                          <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">৳{pkg.price}</p>
                        </div>
                        <span className="text-xs uppercase font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-full shrink-0 font-bold">
                          {pkg.discount_percent}% Off
                        </span>
                      </div>

                      <div className="mt-4 space-y-1.5 border-t border-slate-800/80 pt-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rules & Perks:</p>
                        {pkg.features && pkg.features.length > 0 ? (
                          pkg.features.map((f, idx) => (
                            <p key={idx} className="text-xs text-slate-300 flex items-center gap-2">
                              <span className="text-emerald-400 font-bold">✓</span> {f}
                            </p>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500 italic">No custom rules added.</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2.5 border-t border-slate-800/80 pt-4">
                      <button
                        onClick={() => {
                          setEditingPkg(pkg);
                          setPkgForm({
                            name: pkg.name,
                            price: pkg.price,
                            discount_percent: pkg.discount_percent || 0,
                            featureInput: '',
                            features: pkg.features || []
                          });
                        }}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeletePackage(pkg.id)}
                        className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* 📊 SELLER DASHBOARD MODAL */}
      {selectedSeller && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl w-full max-w-4xl space-y-6 shadow-2xl relative my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                  📊 Seller Dashboard: {selectedSeller.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  Email: <span className="text-slate-200">{selectedSeller.email}</span> | Phone: {selectedSeller.phone || 'N/A'} | Wallet Details: <strong className="text-emerald-400 uppercase">{selectedSeller.payment_method}</strong>
                  <button 
                    onClick={() => handleCopyWallet(selectedSeller.raw_bkash_number || selectedSeller.payment_method, selectedSeller.id)}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs px-3 py-1 rounded-lg text-emerald-400 font-bold transition cursor-pointer"
                  >
                    {copiedId === selectedSeller.id ? '✓ Copied' : '📋 Copy Details'}
                  </button>
                </p>
              </div>
              <button onClick={() => setSelectedSeller(null)} className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                <p className="text-xs text-slate-400 uppercase font-semibold">Total Orders</p>
                <h4 className="text-3xl font-black text-white mt-1">{selectedSeller.orders.length}</h4>
              </div>
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                <p className="text-xs text-slate-400 uppercase font-semibold">Total Sales Value</p>
                <h4 className="text-3xl font-black text-emerald-400 mt-1">
                  ৳{selectedSeller.orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)}
                </h4>
              </div>
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                <p className="text-xs text-slate-400 uppercase font-semibold">Total Profit Earned</p>
                <h4 className="text-3xl font-black text-teal-400 mt-1">
                  ৳{selectedSeller.orders.reduce((sum, o) => sum + Number(o.profit_amount || 0), 0)}
                </h4>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Sales Breakdown & History</h4>
              
              <div className="max-h-72 overflow-y-auto border border-slate-800 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800/40 text-slate-400 text-xs uppercase border-b border-slate-800 sticky top-0 bg-slate-900 font-bold">
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Selling Price</th>
                      <th className="p-3">Profit</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Payout Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                    {selectedSeller.orders.map(o => (
                      <tr key={o.id} className="hover:bg-slate-800/20 transition">
                        <td className="p-3 font-mono font-bold text-slate-400">#{o.id.substring(0, 8)}</td>
                        <td className="p-3 font-bold text-white">{o.customer_name}</td>
                        <td className="p-3 font-semibold">৳{o.total_amount}</td>
                        <td className="p-3 font-bold text-emerald-400">৳{o.profit_amount || 0}</td>
                        <td className="p-3 capitalize"><span className="px-2.5 py-1 rounded bg-slate-800 text-emerald-400 font-bold">{o.status?.replace('_', ' ')}</span></td>
                        <td className="p-3">
                          <select 
                            value={o.payout_status || 'pending'} 
                            onChange={(e) => handlePayoutUpdate(o.id, e.target.value)} 
                            className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg p-1.5 focus:outline-none cursor-pointer"
                          >
                            <option value="pending">🟡 Pending</option>
                            <option value="paid">🟢 Paid</option>
                            <option value="hold">🔴 Hold</option>
                          </select>
                        </td>
                        <td className="p-3 text-right">
                          <button 
                            onClick={() => { setSelectedSeller(null); setActiveTab('orders'); setManagingOrder(o); }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl font-bold text-xs cursor-pointer"
                          >
                            ⚙️ Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 🔴 DANGER ZONE */}
            <div className="mt-6 border-t border-rose-900/50 pt-6">
              <h4 className="text-sm font-bold text-rose-500 mb-4 flex items-center gap-2">⚠️ Danger Zone (Account Actions)</h4>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {selectedSeller.is_banned ? (
                  <button 
                    onClick={() => handleUnbanSeller(selectedSeller.id)}
                    className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-4 py-3 rounded-2xl text-xs transition cursor-pointer"
                  >
                    🟢 Remove Ban & Restore Access
                  </button>
                ) : (
                  <button 
                    onClick={() => setBanForm({ show: true, sellerId: selectedSeller.id, sellerName: selectedSeller.name, duration: '24h', reason: '' })}
                    className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold px-4 py-3 rounded-2xl text-xs transition cursor-pointer"
                  >
                    🔴 Terminate / Ban Seller
                  </button>
                )}
                <button 
                  onClick={() => handleDeleteSellerProfile(selectedSeller.id, selectedSeller.name)}
                  className="flex-1 bg-red-900/50 hover:bg-red-800/80 text-white font-bold px-4 py-3 rounded-2xl text-xs transition border border-red-700/50 cursor-pointer"
                >
                  🗑️ Permanently Delete Account
                </button>
              </div>

              {selectedSeller.is_banned && (
                <div className="mt-4 text-xs text-rose-300 bg-rose-950/50 p-4 rounded-2xl border border-rose-900/50">
                  <strong>Currently Banned:</strong> {selectedSeller.ban_reason} <br />
                  <strong>Expires:</strong> {selectedSeller.ban_expires_at ? new Date(selectedSeller.ban_expires_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Permanent'}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800 mt-4">
              <button 
                onClick={() => setSelectedSeller(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-6 py-3 rounded-2xl text-xs transition cursor-pointer"
              >
                Close Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 BAN SELLER MODAL FORM */}
      <AnimatePresence>
        {banForm.show && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-rose-900/50 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-rose-500 flex items-center gap-2">🔴 Ban Reseller: {banForm.sellerName}</h3>
                <button onClick={() => setBanForm({ ...banForm, show: false })} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleBanSeller} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Ban Duration</label>
                  <select 
                    value={banForm.duration}
                    onChange={(e) => setBanForm({ ...banForm, duration: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="5h">5 Hours</option>
                    <option value="12h">12 Hours</option>
                    <option value="24h">24 Hours</option>
                    <option value="7d">7 Days</option>
                    <option value="permanent">Permanent / Forever</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Reason for Ban (Visible to Seller) *</label>
                  <textarea 
                    required
                    rows={3}
                    placeholder="e.g. Violating terms and conditions..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                    value={banForm.reason}
                    onChange={(e) => setBanForm({ ...banForm, reason: e.target.value })}
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  <button 
                    type="button" 
                    onClick={() => setBanForm({ ...banForm, show: false })}
                    className="w-1/2 bg-slate-800 text-slate-300 py-3 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isBanning}
                    className="w-1/2 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl text-xs font-bold transition shadow-lg shadow-rose-500/20 cursor-pointer"
                  >
                    {isBanning ? 'Banning...' : 'Confirm Ban'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🔴 MANAGE ORDER MODAL */}
      {managingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl w-full max-w-xl space-y-4 shadow-2xl relative my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  ⚙️ Order Management & Cancellation Review
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Invoice ID: #{managingOrder.id ? managingOrder.id.substring(0, 8) : ''}</p>
              </div>
              <button onClick={() => setManagingOrder(null)} className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer">✕</button>
            </div>

            {managingOrder.status === 'cancel_requested' && (
              <div className="bg-amber-500/10 border border-amber-500/40 p-4 rounded-2xl space-y-3">
                <h4 className="text-sm font-extrabold text-amber-400 flex items-center gap-2">
                  🚨 Reseller requested order cancellation!
                </h4>
                <p className="text-xs text-slate-200">
                  <strong>Reseller Reason:</strong> "{managingOrder.cancel_reason || 'No reason provided'}"
                </p>
                <div className="flex gap-3 pt-1">
                  <button 
                    type="button" 
                    onClick={() => handleApproveCancel(managingOrder.id)}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer"
                  >
                    ✅ Confirm & Cancel Order
                  </button>
                </div>

                <div className="pt-2 border-t border-amber-500/20 space-y-2">
                  <label className="text-[11px] text-slate-300 block font-semibold">Or Decline Cancellation (Enter Reason):</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. Order already shipped/packed" 
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white" 
                      value={declineNoteInput} 
                      onChange={(e) => setDeclineNoteInput(e.target.value)} 
                    />
                    <button 
                      type="button" 
                      onClick={() => handleDeclineCancel(managingOrder.id)} 
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shrink-0 cursor-pointer"
                    >
                      ❌ Decline Request
                    </button>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveOrderDetails} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white"
                    value={managingOrder.customer_name || ''}
                    onChange={(e) => setManagingOrder({ ...managingOrder, customer_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white"
                    value={managingOrder.customer_phone || ''}
                    onChange={(e) => setManagingOrder({ ...managingOrder, customer_phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Delivery Address</label>
                <textarea
                  required
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white"
                  value={managingOrder.delivery_address || ''}
                  onChange={(e) => setManagingOrder({ ...managingOrder, delivery_address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Selling (৳)</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white font-bold"
                    value={managingOrder.total_amount || 0}
                    onChange={(e) => setManagingOrder({ ...managingOrder, total_amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Profit (৳)</label>
                  <input
                    type="number"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-emerald-400 font-bold"
                    value={managingOrder.profit_amount || 0}
                    onChange={(e) => setManagingOrder({ ...managingOrder, profit_amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Delivery (৳)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white"
                    value={managingOrder.delivery_charge || 60}
                    onChange={(e) => setManagingOrder({ ...managingOrder, delivery_charge: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Current Order Status</label>
                <select
                  value={managingOrder.status || 'pending'}
                  onChange={(e) => setManagingOrder({ ...managingOrder, status: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-emerald-400 font-bold text-xs rounded-xl p-3 cursor-pointer"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="cancel_requested">Cancel Requested</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-2xl transition text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 cursor-pointer"
                >
                  🖨️ Print Modern Invoice
                </button>
                <button
                  type="submit"
                  disabled={updateOrderLoading}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-2xl transition text-xs shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  {updateOrderLoading ? 'Saving...' : '💾 Update Order Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✏️ EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-white">✏️ Edit Product</h3>
              <button onClick={() => { setEditingProduct(null); setEditMediaFiles([]); }} className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Product Title</label>
                <input 
                  type="text" 
                  required 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white" 
                  value={editingProduct.name || editingProduct.title || ''} 
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value, title: e.target.value })} 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Category</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Skin Care" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white" 
                    value={editingProduct.category || ''} 
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Sub-Category</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Day Cream" 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white" 
                    value={editingProduct.sub_category || ''} 
                    onChange={(e) => setEditingProduct({ ...editingProduct, sub_category: e.target.value })} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Base Price (৳)</label>
                  <input 
                    type="number" 
                    required 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white" 
                    value={editingProduct.price ?? editingProduct.base_price ?? ''} 
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value, base_price: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Suggested Price (৳)</label>
                  <input 
                    type="number" 
                    required 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white" 
                    value={editingProduct.suggested_price || ''} 
                    onChange={(e) => setEditingProduct({ ...editingProduct, suggested_price: e.target.value })} 
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Replace Product Images (Max 10)</label>
                <input type="file" multiple accept="image/*" onChange={(e) => handleMultipleFilesChange(e, true)} className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:bg-slate-800 file:text-emerald-400 cursor-pointer" />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Product Description</label>
                <textarea rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none" value={editingProduct.description || ''} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Stock Units</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white" value={editingProduct.stock || 0} onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setEditingProduct(null); setEditMediaFiles([]); }} className="w-1/2 bg-slate-800 text-slate-300 font-bold py-3 rounded-xl text-xs cursor-pointer">Cancel/Close</button>
                <button type="submit" disabled={editUploading} className="w-1/2 bg-emerald-500 text-slate-950 font-bold py-3 rounded-xl text-xs cursor-pointer">{editUploading ? 'Updating...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}