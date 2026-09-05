'use client';

import { useEffect, useState, useMemo } from 'react';
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
import { sendEmailNotification } from '@/lib/email';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [chartFilter, setChartFilter] = useState('daily');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [packages, setPackages] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [activationRequests, setActivationRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🛡️ Admin Emails List (Protected)
  const SUPER_ADMINS = ['admin@resellbari.com', 'admin@bbc.com', 'sujanmiah.info@gmail.com'];

  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('confirmed');
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const [holdReasons, setHoldReasons] = useState({});
  const [uploading, setUploading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);

  // Product Form (Added description state)
  const [newProduct, setNewProduct] = useState({ 
    title: '', 
    brand: '',
    base_price: '', 
    suggested_price: '', 
    category: '', 
    sub_category: '', 
    description: '', 
    stock: 10 
  });
  const [newBrandInput, setNewBrandInput] = useState('');
  
  // Product Edit States
  const [editingProduct, setEditingProduct] = useState(null);
  const [editMediaFiles, setEditMediaFiles] = useState([]);
  const [editUploading, setEditUploading] = useState(false);

  // Package Form
  const [pkgForm, setPkgForm] = useState({ name: '', price: '', discount_percent: 0, featureInput: '', features: [] });
  const [editingPkg, setEditingPkg] = useState(null);
  const [savingPkg, setSavingPkg] = useState(false);

  // Order Management
  const [managingOrder, setManagingOrder] = useState(null);
  const [updateOrderLoading, setUpdateOrderLoading] = useState(false);
  const [declineNoteInput, setDeclineNoteInput] = useState('');

  // Seller States
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const [banForm, setBanForm] = useState({ show: false, sellerId: null, sellerName: '', duration: '24h', reason: '' });
  const [isBanning, setIsBanning] = useState(false);

  // Payment Requests
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [paymentActionLoading, setPaymentActionLoading] = useState(null);
  const [decliningPaymentReq, setDecliningPaymentReq] = useState(null);
  const [paymentDeclineReason, setPaymentDeclineReason] = useState('');

  // Staff Management
  const [staffForm, setStaffForm] = useState({
    email: '',
    name: '',
    password: '',
    permissions: ['orders', 'inventory']
  });
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const AVAILABLE_PERMISSIONS = [
    { id: 'orders', label: 'Manage Orders', desc: 'Can confirm, process, decline and delete orders' },
    { id: 'inventory', label: 'Manage Inventory', desc: 'Can add, edit, and delete store products' },
    { id: 'payments', label: 'Verify Payments', desc: 'Can approve and decline activation payments' },
    { id: 'resellers', label: 'Reseller Hub', desc: 'Can view sellers, manage balances, and ban accounts' },
    { id: 'packages', label: 'Packages & Perks', desc: 'Can create and modify membership packages' },
  ];

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
    try {
      const [
        { data: profileData },
        { data: orderData, error: orderErr },
        { data: productData },
        { data: pkgData },
        { data: requestData, error: reqErr }
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('packages').select('*').order('price', { ascending: true }),
        supabase.from('activation_requests').select('*').order('created_at', { ascending: false })
      ]);

      if (orderErr) console.error('Orders Fetch Error:', orderErr.message);
      if (reqErr) console.error('Activation Requests Fetch Error:', reqErr.message);

      if (profileData) setProfiles(profileData);
      if (productData) setProducts(productData);
      if (pkgData) setPackages(pkgData);
      if (requestData) setActivationRequests(requestData);

      if (orderData) {
        const mappedOrders = orderData.map(o => {
          const matchedProfile = profileData?.find(p => p.id === o.user_id || p.id === o.reseller_id || p.id === o.profile_id);
          const matchedProduct = productData?.find(p => p.id === o.product_id);
          
          return {
            ...o,
            product_name: matchedProduct?.name || matchedProduct?.title || o.product_name || 'General Product',
            seller_id: matchedProfile?.id || o.reseller_id || o.user_id || 'unknown',
            seller_name: matchedProfile?.full_name || o.seller_name || 'Resell Bari Seller',
            seller_phone: matchedProfile?.phone || o.seller_phone || '',
            seller_logo: matchedProfile?.avatar_url || matchedProfile?.photo_url || matchedProfile?.logo_url || ''
          };
        });

        setOrders(mappedOrders);
        const initialHolds = {};
        mappedOrders.forEach(o => { if (o.payout_hold_reason) initialHolds[o.id] = o.payout_hold_reason; });
        setHoldReasons(initialHolds);
      }
    } catch (err) {
      console.error('Data Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }

  // ডাইনামিক ব্র্যান্ড তালিকা
  const availableBrands = useMemo(() => {
    return Array.from(new Set(products.map(p => p.brand).filter(Boolean)));
  }, [products]);

  // 🛡️ Staff Creation
  async function handleCreateStaff(e) {
    e.preventDefault();
    if (!staffForm.email || !staffForm.password) return alert('Email & password are required');
    if (staffForm.permissions.length === 0) return alert('Please select at least one permission');

    setCreatingStaff(true);
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: staffForm.email.trim().toLowerCase(),
        password: staffForm.password,
        options: {
          data: { full_name: staffForm.name || 'Staff Admin' }
        }
      });

      if (authErr) throw authErr;

      const newUserId = authData.user?.id;

      if (newUserId) {
        await supabase.from('profiles').upsert([{
          id: newUserId,
          full_name: staffForm.name || 'Staff Admin',
          email: staffForm.email.trim().toLowerCase(),
          role: 'admin',
          permissions: staffForm.permissions,
          status: 'active'
        }]);
      }

      alert(`Admin Access granted for ${staffForm.email}!`);
      setStaffForm({ email: '', name: '', password: '', permissions: ['orders', 'inventory'] });
      fetchAdminData();
    } catch (err) {
      alert('Error creating staff: ' + err.message);
    } finally {
      setCreatingStaff(false);
    }
  }

  async function handleUpdateStaffPermissions(staffId, newPermissions) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ permissions: newPermissions })
        .eq('id', staffId);

      if (!error) {
        alert('Permissions updated successfully!');
        setEditingStaff(null);
        fetchAdminData();
      } else throw error;
    } catch (err) {
      alert('Error updating permissions: ' + err.message);
    }
  }

  async function handleRevokeStaff(staffId, email) {
    if (SUPER_ADMINS.includes(email?.toLowerCase())) {
      return alert('Super Admin cannot be deleted or revoked!');
    }
    if (!confirm(`Are you sure you want to revoke admin access for ${email}?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'reseller', permissions: [] })
        .eq('id', staffId);

      if (!error) {
        alert('Admin access revoked successfully.');
        fetchAdminData();
      } else throw error;
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  // 💳 Payment Actions
  async function handleApprovePayment(request) {
    if (!confirm(`Are you sure you want to approve payment for ${request.email} (${request.plan})?`)) return;
    setPaymentActionLoading(request.id);
    
    try {
      const { error: reqErr } = await supabase
        .from('activation_requests')
        .update({ status: 'approved', updated_at: new Date() })
        .eq('id', request.id);

      if (reqErr) throw reqErr;

      const rawPlan = request.plan?.toLowerCase() || 'basic';
      let cleanPlan = 'basic';
      if (rawPlan.includes('advance')) cleanPlan = 'advance';
      else if (rawPlan.includes('premium')) cleanPlan = 'premium';

      let profileUpdated = false;

      if (request.user_id) {
        const { data: updatedByUid } = await supabase
          .from('profiles')
          .update({
            plan: cleanPlan,
            status: 'active',
            updated_at: new Date()
          })
          .eq('id', request.user_id)
          .select();
        
        if (updatedByUid && updatedByUid.length > 0) {
          profileUpdated = true;
        }
      }

      if (!profileUpdated && request.email) {
        const cleanEmail = request.email.trim().toLowerCase();
        await supabase
          .from('profiles')
          .update({
            plan: cleanPlan,
            status: 'active',
            updated_at: new Date()
          })
          .eq('email', cleanEmail);
      }

      if (request.email) {
        const emailBody = `
Congratulations! Your Resell Bari Membership has been Activated!
Plan: ${request.plan}
Amount: ${request.amount}
Transaction ID: ${request.transaction_id}
Dashboard Login: https://resellbari.com/login
        `;

        await sendEmailNotification({
          to_email: request.email,
          subject: '🎉 Congratulations! Your Resell Bari Membership is Active',
          message: emailBody,
        });
      }

      alert('Payment confirmed & Profile activated successfully!');
      fetchAdminData();
    } catch (err) {
      alert('Error approving payment: ' + err.message);
    } finally {
      setPaymentActionLoading(null);
    }
  }

  async function handleConfirmDeclinePayment(e) {
    e.preventDefault();
    if (!paymentDeclineReason.trim()) return alert('Please enter a reason for declining!');
    const request = decliningPaymentReq;
    setPaymentActionLoading(request.id);

    try {
      const { error } = await supabase
        .from('activation_requests')
        .update({ 
          status: 'declined', 
          decline_reason: paymentDeclineReason 
        })
        .eq('id', request.id);

      if (error) throw error;

      if (request.email) {
        const declineBody = `
Hello,
Your membership activation payment request for the ${request.plan} plan has been declined.
Reason: "${paymentDeclineReason}"
Support & Login: https://resellbari.com/login
        `;

        await sendEmailNotification({
          to_email: request.email,
          subject: '⚠️ Resell Bari Membership Payment Status Update',
          message: declineBody,
        });
      }

      alert('Payment declined.');
      setDecliningPaymentReq(null);
      setPaymentDeclineReason('');
      fetchAdminData();
    } catch (err) {
      alert('Error declining payment: ' + err.message);
    } finally {
      setPaymentActionLoading(null);
    }
  }

  const handleCopyWallet = (text, id) => {
    if (!text || text === 'Unset' || text.trim() === '') return alert('No payout wallet details added yet!');
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
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) { alert('Delete Failed: ' + error.message); return; }

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
      const { error } = await supabase.from('orders').delete().in('id', selectedOrderIds);
      if (error) { alert('Bulk Delete Failed: ' + error.message); setBulkUpdating(false); return; }

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

  // ⚙️ Save Full Order Details
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
          payout_status: managingOrder.payout_status || 'pending',
          payout_hold_reason: managingOrder.payout_status === 'hold' ? (managingOrder.payout_hold_reason || '') : null,
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

  // 🌟 Add Product (With Brand and Description Support)
  async function handleAddProduct(e) {
    e.preventDefault();
    if (mediaFiles.length === 0) return alert('Please select at least one product image!');
    
    const finalBrand = newBrandInput.trim() !== '' ? newBrandInput.trim() : (newProduct.brand || null);

    setUploading(true);
    try {
      const imageList = await Promise.all(mediaFiles.map(file => handleFileConvert(file)));
      
      const { error } = await supabase.from('products').insert([{
        name: newProduct.title,
        brand: finalBrand,
        price: Number(newProduct.base_price) || 0,
        suggested_price: Number(newProduct.suggested_price) || 0,
        category: newProduct.category || null,
        sub_category: newProduct.sub_category || null,
        description: newProduct.description || null,
        image_url: imageList[0],
        images: imageList,
        stock: Number(newProduct.stock) || 0
      }]);

      if (!error) {
        alert('Product successfully saved to Inventory!');
        setNewProduct({ title: '', brand: '', base_price: '', suggested_price: '', category: '', sub_category: '', description: '', stock: 10 });
        setNewBrandInput('');
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

  // 🌟 Update Product (With Description)
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
        brand: editingProduct.brand || null,
        price: Number(editingProduct.price ?? editingProduct.base_price) || 0,
        suggested_price: Number(editingProduct.suggested_price) || 0,
        category: editingProduct.category || null,
        sub_category: editingProduct.sub_category || null,
        description: editingProduct.description || null,
        image_url: finalImages[0] || null,
        images: finalImages,
        stock: Number(editingProduct.stock) || 0
      }).eq('id', editingProduct.id);

      if (!error) { 
        alert('Product updated successfully!');
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

  // Package Handlers
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

  // 🚫 Seller Ban Handler
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
    if (!confirm(`⚠️ PERMANENT TERMINATION WARNING:\n\nAre you sure you want to completely delete reseller "${sellerName}"?\nThis will remove their profile and store settings from the system permanently.`)) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', sellerId);

      if (!error) {
        alert("Reseller terminated and deleted permanently.");
        fetchAdminData();
        setSelectedSeller(null);
      } else {
        alert("Error deleting seller: " + error.message);
      }
    } catch (err) {
      alert("Error deleting seller: " + err.message);
    }
  }

  // 👥 Filter & Map Full Reseller Profiles
  const sellersList = useMemo(() => {
    const sellerMap = {};
    profiles
      .filter(p => p.role !== 'admin' && !SUPER_ADMINS.includes(p.email?.toLowerCase()))
      .forEach(p => {
        const hasCustomWallet = !!p.payment_method;
        const walletMethod = p.payment_method || 'Unset';
        const rawWalletNum = p.account_number || p.bkash_number || p.payment_number || '';
        
        sellerMap[p.id] = {
          id: p.id,
          name: p.full_name || 'Seller',
          email: p.email || 'No Email',
          phone: p.phone || 'N/A',
          facebook_page: p.shop_name || 'N/A',
          website: p.website || 'N/A',
          address: p.address || 'N/A',
          district: p.district || 'N/A',
          plan: p.plan || null,
          status: p.status || 'pending',
          has_wallet: hasCustomWallet,
          payment_method: hasCustomWallet ? (rawWalletNum ? `${walletMethod} (${rawWalletNum})` : walletMethod) : 'Unset',
          raw_wallet_num: rawWalletNum,
          bank_name: p.bank_name || 'N/A',
          branch_name: p.branch_name || 'N/A',
          routing_number: p.routing_number || 'N/A',
          account_name: p.account_name || 'N/A',
          created_at: p.created_at,
          is_banned: p.is_banned || false,
          ban_reason: p.ban_reason || '',
          ban_expires_at: p.ban_expires_at || null,
          orders: []
        };
      });

    orders.forEach(o => {
      const sId = o.seller_id || o.reseller_id || o.user_id;
      if (sId && sellerMap[sId]) {
        sellerMap[sId].orders.push(o);
      }
    });

    return Object.values(sellerMap);
  }, [profiles, orders]);

  const staffList = useMemo(() => {
    return profiles.filter(p => p.role === 'admin' || SUPER_ADMINS.includes(p.email?.toLowerCase()));
  }, [profiles]);

  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'pending'), [orders]);
  const cancelRequests = useMemo(() => orders.filter(o => o.status === 'cancel_requested'), [orders]);
  const pendingPayments = useMemo(() => activationRequests.filter(r => r.status === 'pending'), [activationRequests]);
  const deliveredOrders = useMemo(() => orders.filter(o => o.status === 'delivered'), [orders]);
  const deliveredSalesValue = useMemo(() => deliveredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0), [deliveredOrders]);
  const totalResellerProfit = useMemo(() => deliveredOrders.reduce((sum, o) => sum + Number(o.profit_amount || 0), 0), [deliveredOrders]);
  const lowStockProducts = useMemo(() => products.filter(p => (p.stock || 0) <= 5), [products]);

  const filteredActivationRequests = useMemo(() => {
    if (paymentFilter === 'all') return activationRequests;
    return activationRequests.filter(r => r.status === paymentFilter);
  }, [activationRequests, paymentFilter]);

  const chartData = useMemo(() => {
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
  }, [orders, chartFilter]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans flex flex-col md:flex-row w-full overflow-x-hidden">
      
      {/* 📱 MOBILE HEADER */}
      <div className="md:hidden sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/80 p-4 flex items-center justify-between shadow-lg">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="Resell Bari" className="h-8 w-auto object-contain" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">Admin</span>
        </Link>
        <button 
          onClick={() => setIsMobileMenuOpen(true)} 
          className="text-slate-200 hover:text-white p-1 cursor-pointer"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
      </div>

      {/* 📱 MOBILE OVERLAY */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* 🧭 SIDEBAR */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-50 h-screen overflow-y-auto
        w-72 bg-slate-900/95 border-r border-slate-800/80 p-6 flex flex-col justify-between shrink-0 backdrop-blur-2xl
        transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="space-y-8 relative">
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden absolute -top-2 -right-2 text-slate-400 hover:text-white p-2 cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>

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

          <nav className="space-y-2 mt-8 md:mt-0">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'orders', label: 'Orders', icon: '📦', badge: pendingOrders.length },
              { id: 'resellers', label: 'Resellers', icon: '👥' },
              { id: 'payments', label: 'Payments', icon: '💳', badge: pendingPayments.length },
              { id: 'inventory', label: 'Inventory', icon: '🏷️' },
              { id: 'packages', label: 'Packages', icon: '💎' },
              { id: 'team', label: 'Add User / Roles', icon: '🛡️' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }}
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

        <div className="pt-6 border-t border-slate-800/80 space-y-3 mt-8">
          <Link 
            href="/products?mode=admin" 
            className="w-full flex items-center gap-2.5 px-4 py-3 bg-slate-800/60 hover:bg-slate-800 text-amber-400 border border-slate-700/60 rounded-2xl text-xs font-bold transition justify-center cursor-pointer"
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

      {/* 🖥️ MAIN CONTENT */}
      <main className="flex-1 p-4 sm:p-8 md:p-10 w-full min-h-screen overflow-x-hidden">
        
        {/* HEADER BAR */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full shadow-lg">
          <div>
            <h2 className="text-2xl font-black text-white capitalize">{activeTab === 'team' ? 'Team & Role Permissions' : `${activeTab} Control Center`}</h2>
            <p className="text-xs text-slate-400 mt-1">Manage lifecycles, analytics, packages, payments, and team access in real-time.</p>
          </div>
          <div className="text-xs font-mono bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-slate-300 font-semibold shadow-inner">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 w-full">
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
                    <p className="text-xs text-slate-300 mt-0.5">Resellers have requested to cancel orders.</p>
                  </div>
                </div>
                <div className="space-y-2.5 pt-2">
                  {cancelRequests.map(o => (
                    <div key={o.id} className="bg-slate-950/80 border border-rose-900/40 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                      <div>
                        <p className="font-bold text-white text-sm">Customer: {o.customer_name} ({o.customer_phone}) - <span className="text-emerald-400">৳{o.total_amount}</span></p>
                        <p className="text-amber-400 mt-1">💬 Reseller Reason: "{o.cancel_reason || 'No reason provided'}"</p>
                      </div>
                      <button onClick={() => { setActiveTab('orders'); setManagingOrder(o); }} className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2.5 rounded-xl transition shrink-0 cursor-pointer">
                        Review & Decide
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-md">
                <p className="text-xs text-slate-400 uppercase font-semibold">Total Orders</p>
                {loading ? <div className="h-9 w-20 bg-slate-800 animate-pulse rounded-xl mt-2" /> : <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">{orders.length}</h2>}
              </div>
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-md">
                <p className="text-xs text-slate-400 uppercase font-semibold">Delivered Sales</p>
                {loading ? <div className="h-9 w-24 bg-slate-800 animate-pulse rounded-xl mt-2" /> : <h2 className="text-3xl sm:text-4xl font-black text-emerald-400 mt-2">৳{deliveredSalesValue}</h2>}
              </div>
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-md">
                <p className="text-xs text-slate-400 uppercase font-semibold">Reseller Profit</p>
                {loading ? <div className="h-9 w-24 bg-slate-800 animate-pulse rounded-xl mt-2" /> : <h2 className="text-3xl sm:text-4xl font-black text-teal-400 mt-2">৳{totalResellerProfit}</h2>}
              </div>
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-md">
                <p className="text-xs text-slate-400 uppercase font-semibold">Low Stock</p>
                {loading ? <div className="h-9 w-20 bg-slate-800 animate-pulse rounded-xl mt-2" /> : <h2 className={`text-3xl sm:text-4xl font-black mt-2 ${lowStockProducts.length > 0 ? 'text-rose-500' : 'text-slate-400'}`}>{lowStockProducts.length} Items</h2>}
              </div>
            </div>

            {/* ANALYTICS GRAPH */}
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
                {loading ? (
                  <div className="w-full h-full bg-slate-800/40 animate-pulse rounded-2xl flex items-center justify-center text-xs text-slate-500">
                    Loading analytics data...
                  </div>
                ) : chartData.length > 0 ? (
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
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '14px', color: '#fff', fontSize: '12px' }} formatter={(value) => [`৳${value}`, 'Sales']} />
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

              <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 gap-1 overflow-x-auto">
                {['all', 'pending', 'approved', 'declined'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setPaymentFilter(tab)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition cursor-pointer whitespace-nowrap ${
                      paymentFilter === tab ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
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
                        <td className="p-4"><span className="px-3 py-1 bg-slate-800 text-emerald-400 rounded-lg text-xs font-bold uppercase">{req.plan}</span></td>
                        <td className="p-4 font-bold text-amber-400 text-sm">{req.payment_method}</td>
                        <td className="p-4 font-mono text-slate-200">{req.phone_number || req.sender_number}</td>
                        <td className="p-4 font-mono font-bold text-emerald-400 bg-emerald-500/5 px-2.5 py-1 rounded-md">{req.transaction_id}</td>
                        <td className="p-4 font-bold text-white text-sm">{req.amount}</td>
                        <td className="p-4">
                          {req.status === 'pending' && <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold">● Pending</span>}
                          {req.status === 'approved' && <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold">✓ Approved</span>}
                          {req.status === 'declined' && <span className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-xs font-bold">✕ Declined</span>}
                        </td>
                        <td className="p-4 text-right">
                          {req.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => handleApprovePayment(req)} disabled={paymentActionLoading === req.id} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer shadow-md">Confirm</button>
                              <button onClick={() => { setDecliningPaymentReq(req); setPaymentDeclineReason(''); }} disabled={paymentActionLoading === req.id} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer">Decline</button>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">👥 Reseller Hub & Business Profiles</h2>
                <p className="text-xs text-slate-400 mt-0.5">View comprehensive registration details, store links, payout methods, or terminate accounts.</p>
              </div>
              <span className="text-xs font-bold bg-slate-800 text-emerald-400 px-3.5 py-1.5 rounded-full border border-slate-700">
                {sellersList.length} Registered Reseller(s)
              </span>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/40 text-slate-400 text-xs uppercase border-b border-slate-800 font-bold">
                    <th className="p-4 w-12">#</th>
                    <th className="p-4">Seller & Business Info</th>
                    <th className="p-4">Location / Address</th>
                    <th className="p-4">Membership</th>
                    <th className="p-4">Payout Method</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                  {sellersList.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">No resellers found.</td></tr>
                  ) : (
                    sellersList.map((seller, idx) => (
                      <tr key={seller.id} className={`hover:bg-slate-800/20 transition ${seller.is_banned ? 'bg-rose-950/20' : ''}`}>
                        <td className="p-4 font-mono font-bold text-emerald-400 text-sm">#{idx + 1}</td>
                        <td className="p-4">
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            {seller.name}
                            {seller.is_banned && <span className="bg-rose-500 text-white text-[9px] px-2 py-0.5 rounded font-black">BANNED</span>}
                          </div>
                          <div className="text-slate-300 text-xs mt-0.5">{seller.email}</div>
                          <div className="text-emerald-400 font-mono text-[11px] mt-0.5">📞 {seller.phone}</div>
                          
                          {seller.facebook_page && seller.facebook_page !== 'N/A' && (
                            <div className="mt-1 text-[11px]">
                              <span className="text-slate-400">FB / Shop: </span>
                              <a href={seller.facebook_page.startsWith('http') ? seller.facebook_page : `https://${seller.facebook_page}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-semibold">
                                {seller.facebook_page}
                              </a>
                            </div>
                          )}
                          {seller.website && seller.website !== 'N/A' && (
                            <div className="text-[11px]">
                              <span className="text-slate-400">Web: </span>
                              <a href={seller.website.startsWith('http') ? seller.website : `https://${seller.website}`} target="_blank" rel="noreferrer" className="text-teal-400 hover:underline">
                                {seller.website}
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-200">{seller.district || 'Unset'}</div>
                          <div className="text-slate-400 text-[11px] mt-0.5 max-w-xs truncate">{seller.address || 'Address not provided'}</div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            seller.plan ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {seller.plan || 'NO PLAN'}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-1 capitalize">Status: {seller.status}</div>
                        </td>
                        <td className="p-4">
                          {seller.has_wallet ? (
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-emerald-400">{seller.payment_method}</span>
                              <button onClick={() => handleCopyWallet(seller.raw_wallet_num || seller.payment_method, seller.id)} className="bg-slate-800 text-xs px-2.5 py-1 rounded-lg text-emerald-400 font-bold cursor-pointer">
                                {copiedId === seller.id ? '✓' : '📋'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Unset / Not Added</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setSelectedSeller(seller)} 
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer shadow-md"
                            >
                              📊 View
                            </button>

                            {seller.is_banned ? (
                              <button 
                                onClick={() => handleUnbanSeller(seller.id)} 
                                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-bold text-xs cursor-pointer"
                              >
                                Unban
                              </button>
                            ) : (
                              <button 
                                onClick={() => setBanForm({ show: true, sellerId: seller.id, sellerName: seller.name, duration: '24h', reason: '' })} 
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-xl font-bold text-xs cursor-pointer"
                              >
                                🚫 Ban
                              </button>
                            )}

                            <button 
                              onClick={() => handleDeleteSellerProfile(seller.id, seller.name)} 
                              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl font-bold text-xs cursor-pointer"
                              title="Permanently Terminate Reseller"
                            >
                              🗑️
                            </button>
                          </div>
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
                <div className="flex gap-2 items-center">
                  <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="bg-slate-800 text-xs text-white p-2 rounded-xl">
                    <option value="confirmed">Confirmed</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button onClick={handleBulkStatusChange} disabled={bulkUpdating} className="bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl">
                    Apply Status
                  </button>
                  <button onClick={handleBulkDeleteOrders} disabled={bulkUpdating} className="bg-rose-600 text-white font-bold text-xs px-4 py-2 rounded-xl">
                    🗑️ Delete Selected
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/40 text-slate-400 text-xs uppercase border-b border-slate-800 font-bold">
                    <th className="p-4 w-[5%] text-center"><input type="checkbox" checked={orders.length > 0 && selectedOrderIds.length === orders.length} onChange={handleSelectAllOrders} className="w-4 h-4 accent-emerald-500" /></th>
                    <th className="p-4">Customer Info</th>
                    <th className="p-4">Seller / Shop</th>
                    <th className="p-4">Selling / Profit</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-800/20 transition">
                      <td className="p-4 text-center"><input type="checkbox" checked={selectedOrderIds.includes(o.id)} onChange={() => handleSelectOrder(o.id)} className="w-4 h-4 accent-emerald-500" /></td>
                      <td className="p-4">
                        <div className="font-bold text-white text-sm">{o.customer_name}</div>
                        <div className="text-slate-400 text-xs">{o.customer_phone}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-amber-400">{o.seller_name}</div>
                        <div className="text-slate-500 text-[11px]">{o.seller_phone}</div>
                      </td>
                      <td className="p-4">
                        <div>Selling: <strong>৳{o.total_amount}</strong></div>
                        <div className="text-emerald-400 font-semibold">Profit: ৳{o.profit_amount || 0}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/20">
                          {o.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setManagingOrder(o)} className="px-3 py-1.5 bg-slate-800 text-emerald-400 rounded-xl font-bold text-xs cursor-pointer">
                            ⚙️ Manage
                          </button>
                          <button onClick={() => handleDeleteOrder(o.id, o.customer_name)} className="px-3 py-1.5 bg-rose-500/10 text-rose-400 rounded-xl font-bold text-xs cursor-pointer">
                            🗑️
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

        {/* TAB 5: INVENTORY (WITH DESCRIPTION & BRAND) */}
        {activeTab === 'inventory' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
            <div className="bg-slate-900/60 border border-slate-800 p-6 sm:p-8 rounded-3xl h-fit shadow-lg space-y-5">
              <h3 className="text-lg font-bold text-white">➕ Add New Product</h3>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Product Title *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Product Title" 
                    className="w-full bg-slate-800 p-3.5 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-500" 
                    value={newProduct.title} 
                    onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })} 
                  />
                </div>

                {/* Brand Selection */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Brand Name</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newProduct.brand}
                      onChange={(e) => {
                        setNewProduct({ ...newProduct, brand: e.target.value });
                        if (e.target.value !== 'other') setNewBrandInput('');
                      }}
                      className="w-full bg-slate-800 border border-slate-700 text-xs text-white p-3 rounded-2xl focus:outline-none cursor-pointer"
                    >
                      <option value="">Select Existing Brand</option>
                      {availableBrands.map((b, i) => (
                        <option key={i} value={b}>{b}</option>
                      ))}
                      <option value="other">+ Type New Brand</option>
                    </select>

                    <input 
                      type="text" 
                      placeholder="Or type new brand..."
                      className="w-full bg-slate-800 border border-slate-700 text-xs text-white p-3 rounded-2xl focus:outline-none focus:border-emerald-500" 
                      value={newBrandInput}
                      onChange={(e) => {
                        setNewBrandInput(e.target.value);
                        setNewProduct({ ...newProduct, brand: '' });
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Category</label>
                    <input type="text" placeholder="e.g. Skin Care" className="w-full bg-slate-800 p-3.5 rounded-2xl text-xs text-white" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Sub-Category</label>
                    <input type="text" placeholder="e.g. Cream" className="w-full bg-slate-800 p-3.5 rounded-2xl text-xs text-white" value={newProduct.sub_category} onChange={(e) => setNewProduct({ ...newProduct, sub_category: e.target.value })} />
                  </div>
                </div>

                {/* 📝 PRODUCT DESCRIPTION / DETAILS (ADDED) */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Product Description / Details</label>
                  <textarea
                    rows={3}
                    placeholder="Write product specifications, benefits, usage instructions..."
                    className="w-full bg-slate-800 p-3.5 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Base Price (৳) *</label>
                    <input type="number" required placeholder="Base Price" className="w-full bg-slate-800 p-3.5 rounded-2xl text-xs text-white font-bold" value={newProduct.base_price} onChange={(e) => setNewProduct({ ...newProduct, base_price: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Suggested Price (৳) *</label>
                    <input type="number" required placeholder="Suggested Price" className="w-full bg-slate-800 p-3.5 rounded-2xl text-xs text-white font-bold" value={newProduct.suggested_price} onChange={(e) => setNewProduct({ ...newProduct, suggested_price: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Stock Quantity</label>
                    <input type="number" placeholder="10" className="w-full bg-slate-800 p-3.5 rounded-2xl text-xs text-white" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Product Images *</label>
                    <input type="file" multiple accept="image/*" onChange={(e) => handleMultipleFilesChange(e, false)} className="w-full text-xs text-slate-400 cursor-pointer pt-2" />
                  </div>
                </div>

                <button type="submit" disabled={uploading} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-2xl text-xs cursor-pointer transition shadow-lg shadow-emerald-500/20">
                  {uploading ? 'Processing & Saving...' : '+ Save Product to Inventory'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4">Inventory Catalogue ({products.length})</h3>
              {products.map((p) => (
                <div key={p.id} className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl flex justify-between items-center hover:border-slate-700 transition">
                  <div className="flex items-center gap-4">
                    <img src={p.image_url || p.images?.[0] || 'https://via.placeholder.com/50'} className="w-14 h-14 rounded-2xl object-cover" alt="" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">{p.name || p.title}</h4>
                        {p.brand && (
                          <span className="text-[10px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded-full border border-slate-700 font-semibold">
                            {p.brand}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Base: ৳{p.price} | Sugg: ৳{p.suggested_price || p.price} | Stock: <strong className={p.stock <= 5 ? 'text-rose-400' : 'text-slate-200'}>{p.stock || 0}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setEditingProduct(p)} 
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer"
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleDeleteProduct(p.id, p.name || p.title)} 
                      className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: PACKAGES */}
        {activeTab === 'packages' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
            <div className="bg-slate-900/60 border border-slate-800 p-6 sm:p-8 rounded-3xl h-fit space-y-4">
              <h3 className="text-lg font-bold text-white">{editingPkg ? 'Edit Package' : 'Create Package'}</h3>
              <form onSubmit={handleSavePackage} className="space-y-4">
                <input type="text" required placeholder="Package Name" className="w-full bg-slate-800 p-3.5 rounded-2xl text-xs text-white" value={pkgForm.name} onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })} />
                <input type="number" required placeholder="Price" className="w-full bg-slate-800 p-3.5 rounded-2xl text-xs text-white" value={pkgForm.price} onChange={(e) => setPkgForm({ ...pkgForm, price: e.target.value })} />
                <button type="submit" disabled={savingPkg} className="w-full bg-emerald-500 text-slate-950 font-bold py-3.5 rounded-2xl text-xs">
                  {savingPkg ? 'Saving...' : 'Save Package'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              {packages.map((pkg) => (
                <div key={pkg.id} className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-white uppercase">{pkg.name}</h4>
                    <p className="text-2xl font-black text-emerald-400 mt-1">৳{pkg.price}</p>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800">
                    <button onClick={() => { setEditingPkg(pkg); setPkgForm(pkg); }} className="flex-1 bg-slate-800 text-amber-400 py-2.5 rounded-xl text-xs font-bold">✏️ Edit</button>
                    <button onClick={() => handleDeletePackage(pkg.id)} className="flex-1 bg-rose-500/10 text-rose-400 py-2.5 rounded-xl text-xs font-bold">🗑️ Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🛡️ TAB 7: TEAM ACCESS & ROLE PERMISSIONS */}
        {activeTab === 'team' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
            <div className="bg-slate-900/60 border border-slate-800 p-6 sm:p-8 rounded-3xl h-fit space-y-5 shadow-lg">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  🛡️ Add Admin / Staff Access
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Create sub-admin credentials and configure what features they can access.
                </p>
              </div>

              <form onSubmit={handleCreateStaff} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-semibold">Staff Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Account Manager"
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    value={staffForm.name}
                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-semibold">Login Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="staff@resellbari.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-semibold">Assign Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-2 font-semibold">
                    Allowed Panel Permissions (Select Checklist) *
                  </label>
                  <div className="space-y-2 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <label key={perm.id} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={staffForm.permissions.includes(perm.id)}
                          onChange={() => {
                            const current = staffForm.permissions;
                            if (current.includes(perm.id)) {
                              setStaffForm({ ...staffForm, permissions: current.filter(p => p !== perm.id) });
                            } else {
                              setStaffForm({ ...staffForm, permissions: [...current, perm.id] });
                            }
                          }}
                          className="w-4 h-4 accent-emerald-500 mt-0.5 rounded"
                        />
                        <div>
                          <p className="text-xs font-bold text-white">{perm.label}</p>
                          <p className="text-[10px] text-slate-400">{perm.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingStaff}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-4 rounded-2xl text-xs transition shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  {creatingStaff ? 'Creating...' : '+ Grant Staff Access'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-lg">
              <div>
                <h3 className="text-lg font-bold text-white">Active Admin & Staff Users ({staffList.length})</h3>
                <p className="text-xs text-slate-400 mt-1">Super Admins have full access. Sub-admins operate under custom permissions.</p>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800/40 text-slate-400 text-xs uppercase border-b border-slate-800 font-bold">
                      <th className="p-4">Staff Member</th>
                      <th className="p-4">Access Type</th>
                      <th className="p-4">Permissions</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                    {staffList.map((staff) => {
                      const isSuper = SUPER_ADMINS.includes(staff.email?.toLowerCase());
                      const perms = staff.permissions || (isSuper ? ['all'] : []);

                      return (
                        <tr key={staff.id} className="hover:bg-slate-800/20 transition">
                          <td className="p-4">
                            <div className="font-bold text-white text-sm">{staff.full_name || 'Admin'}</div>
                            <div className="text-slate-400 text-xs">{staff.email}</div>
                          </td>
                          <td className="p-4">
                            {isSuper ? (
                              <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full font-extrabold text-xs">
                                👑 Super Admin
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full font-bold text-xs">
                                🛡️ Staff / Sub-Admin
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1.5">
                              {perms.includes('all') ? (
                                <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] font-bold text-emerald-400">Full Control (All Tabs)</span>
                              ) : perms.length === 0 ? (
                                <span className="text-slate-500 italic">No permissions</span>
                              ) : (
                                perms.map((p) => (
                                  <span key={p} className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-200 capitalize">
                                    {p}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            {isSuper ? (
                              <span className="text-slate-500 text-xs italic">Protected</span>
                            ) : (
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setEditingStaff(staff)}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl font-bold text-xs cursor-pointer"
                                >
                                  Edit Roles
                                </button>
                                <button
                                  onClick={() => handleRevokeStaff(staff.id, staff.email)}
                                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl font-bold text-xs cursor-pointer"
                                >
                                  Revoke
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ✏️ EDIT PRODUCT MODAL (WITH DESCRIPTION & BRAND) */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-4 my-8 relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  ✏️ Edit Product: {editingProduct.name || editingProduct.title}
                </h3>
                <button 
                  type="button" 
                  onClick={() => { setEditingProduct(null); setEditMediaFiles([]); }}
                  className="text-slate-400 hover:text-white font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateProduct} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-semibold">Product Title</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    value={editingProduct.name || editingProduct.title || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-semibold">Brand Name</label>
                    <input 
                      type="text" 
                      placeholder="Brand Name"
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                      value={editingProduct.brand || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-semibold">Stock Quantity</label>
                    <input 
                      type="number" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                      value={editingProduct.stock || 0}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-semibold">Base Wholesale Price (৳)</label>
                    <input 
                      type="number" 
                      required 
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                      value={editingProduct.price ?? editingProduct.base_price ?? 0}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value, base_price: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-semibold">Suggested Price (৳)</label>
                    <input 
                      type="number" 
                      required 
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                      value={editingProduct.suggested_price || 0}
                      onChange={(e) => setEditingProduct({ ...editingProduct, suggested_price: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-semibold">Category</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3 text-xs text-white focus:outline-none"
                      value={editingProduct.category || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1 font-semibold">Sub-Category</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3 text-xs text-white focus:outline-none"
                      value={editingProduct.sub_category || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, sub_category: e.target.value })}
                    />
                  </div>
                </div>

                {/* 📝 PRODUCT DESCRIPTION EDIT (ADDED) */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-semibold">Product Description / Details</label>
                  <textarea 
                    rows={3}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-semibold">Replace Product Images (Optional)</label>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={(e) => handleMultipleFilesChange(e, true)}
                    className="w-full text-xs text-slate-400 cursor-pointer"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button 
                    type="button" 
                    onClick={() => { setEditingProduct(null); setEditMediaFiles([]); }}
                    className="w-1/2 bg-slate-800 text-slate-300 py-3.5 rounded-2xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={editUploading}
                    className="w-1/2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3.5 rounded-2xl text-xs font-black transition cursor-pointer"
                  >
                    {editUploading ? 'Saving...' : 'Update Product'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🛡️ BAN SELLER MODAL */}
      {banForm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-rose-900/60 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-rose-400">🚫 Ban Reseller: {banForm.sellerName}</h3>
              <button onClick={() => setBanForm({ show: false, sellerId: null, sellerName: '', duration: '24h', reason: '' })} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleBanSeller} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-semibold">Ban Duration</label>
                <select 
                  value={banForm.duration} 
                  onChange={(e) => setBanForm({ ...banForm, duration: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none"
                >
                  <option value="5h">5 Hours</option>
                  <option value="12h">12 Hours</option>
                  <option value="24h">24 Hours (1 Day)</option>
                  <option value="7d">7 Days</option>
                  <option value="permanent">Permanent Ban</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-semibold">Reason for Suspension *</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="e.g. Terms violation, suspicious orders, etc."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                  value={banForm.reason}
                  onChange={(e) => setBanForm({ ...banForm, reason: e.target.value })}
                />
              </div>
              <div className="flex gap-2.5">
                <button type="button" onClick={() => setBanForm({ show: false, sellerId: null, sellerName: '', duration: '24h', reason: '' })} className="w-1/2 bg-slate-800 text-slate-300 py-3 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={isBanning} className="w-1/2 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl text-xs font-bold transition cursor-pointer">{isBanning ? 'Suspending...' : 'Confirm Suspension'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📊 SELLER COMPLETE DETAILS MODAL */}
      {selectedSeller && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-3xl w-full max-w-4xl space-y-6 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 gap-4">
              <div>
                <h3 className="text-xl font-extrabold text-white">📊 Reseller Complete Profile: {selectedSeller.name}</h3>
                <p className="text-xs text-slate-400 mt-1">ID: #{selectedSeller.id} | Joined: {new Date(selectedSeller.created_at || Date.now()).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setSelectedSeller(null)} className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer">✕</button>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-2xl space-y-3">
              <h4 className="text-xs uppercase font-extrabold text-emerald-400 tracking-wider">Registration Form Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Full Name</span>
                  <strong className="text-slate-200 text-sm">{selectedSeller.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Email Address</span>
                  <strong className="text-slate-200 text-sm">{selectedSeller.email}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Phone Number</span>
                  <strong className="text-emerald-400 text-sm font-mono">{selectedSeller.phone}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Facebook Page Link</span>
                  <a href={selectedSeller.facebook_page.startsWith('http') ? selectedSeller.facebook_page : `https://${selectedSeller.facebook_page}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-semibold break-all">
                    {selectedSeller.facebook_page}
                  </a>
                </div>
                <div>
                  <span className="text-slate-500 block">Website Link</span>
                  <span className="text-slate-200 break-all">{selectedSeller.website}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">District & Address</span>
                  <strong className="text-slate-200">{selectedSeller.district}</strong>
                  <p className="text-slate-400 text-[11px] mt-0.5">{selectedSeller.address}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-2xl space-y-3">
              <h4 className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">Payout / Wallet Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Payment Method</span>
                  <strong className="text-slate-200 text-sm">{selectedSeller.payment_method}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Bank / Provider</span>
                  <strong className="text-slate-200">{selectedSeller.bank_name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Account / Number</span>
                  <strong className="text-emerald-400 font-mono text-sm">{selectedSeller.raw_wallet_num || 'N/A'}</strong>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                <p className="text-xs text-slate-400 uppercase font-semibold">Total Orders</p>
                <h4 className="text-3xl font-black text-white mt-1">{selectedSeller.orders.length}</h4>
              </div>
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                <p className="text-xs text-slate-400 uppercase font-semibold">Total Sales Value</p>
                <h4 className="text-3xl font-black text-emerald-400 mt-1">৳{selectedSeller.orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)}</h4>
              </div>
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                <p className="text-xs text-slate-400 uppercase font-semibold">Total Profit Earned</p>
                <h4 className="text-3xl font-black text-teal-400 mt-1">৳{selectedSeller.orders.reduce((sum, o) => sum + Number(o.profit_amount || 0), 0)}</h4>
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center pt-4 border-t border-slate-800 gap-3">
              <button 
                onClick={() => handleDeleteSellerProfile(selectedSeller.id, selectedSeller.name)}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/20"
              >
                🗑️ Terminate Reseller Permanently
              </button>
              <button onClick={() => setSelectedSeller(null)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-6 py-2.5 rounded-xl text-xs cursor-pointer">Close Window</button>
            </div>
          </div>
        </div>
      )}

      {/* ⚙️ FULL ORDER MANAGEMENT MODAL */}
      {managingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative my-8 space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚙️</span>
                <div>
                  <h3 className="text-lg font-black text-white">Order Management</h3>
                  <span className="text-[11px] font-mono text-slate-400">Order ID: #{managingOrder.id}</span>
                </div>
              </div>
              <button 
                onClick={() => setManagingOrder(null)} 
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 border border-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {managingOrder.status === 'cancel_requested' && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                  <span>⚠️</span> Reseller requested cancellation: "{managingOrder.cancel_reason || 'Customer changed mind'}"
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => handleApproveCancel(managingOrder.id)}
                    className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer"
                  >
                    ✓ Approve Cancellation
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      const reason = prompt('Enter reason for declining cancel request:');
                      if (reason) {
                        setDeclineNoteInput(reason);
                        handleDeclineCancel(managingOrder.id);
                      }
                    }}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded-xl text-xs border border-slate-700 transition cursor-pointer"
                  >
                    ✕ Decline Request
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveOrderDetails} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                    value={managingOrder.customer_name || ''}
                    onChange={(e) => setManagingOrder({ ...managingOrder, customer_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                    Customer Phone
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    value={managingOrder.customer_phone || ''}
                    onChange={(e) => setManagingOrder({ ...managingOrder, customer_phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                  Delivery Address
                </label>
                <textarea
                  rows={2}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                  value={managingOrder.delivery_address || ''}
                  onChange={(e) => setManagingOrder({ ...managingOrder, delivery_address: e.target.value })}
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Product</span>
                  <strong className="text-slate-200 text-sm">{managingOrder.product_name || 'General Product'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Quantity</span>
                  <strong className="text-slate-200 text-sm">{managingOrder.quantity || 1} pcs</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Seller Name</span>
                  <strong className="text-amber-400 text-xs">{managingOrder.seller_name || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Amount</span>
                  <input
                    type="number"
                    className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white font-bold w-full mt-1"
                    value={managingOrder.total_amount || 0}
                    onChange={(e) => setManagingOrder({ ...managingOrder, total_amount: e.target.value })}
                  />
                </div>
                <div>
                  <span className="text-slate-500 block">Reseller Profit</span>
                  <input
                    type="number"
                    className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-emerald-400 font-bold w-full mt-1"
                    value={managingOrder.profit_amount || 0}
                    onChange={(e) => setManagingOrder({ ...managingOrder, profit_amount: e.target.value })}
                  />
                </div>
                <div>
                  <span className="text-slate-500 block">Delivery Charge</span>
                  <input
                    type="number"
                    className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white font-bold w-full mt-1"
                    value={managingOrder.delivery_charge || 0}
                    onChange={(e) => setManagingOrder({ ...managingOrder, delivery_charge: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                    Order Status
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer font-bold capitalize"
                    value={managingOrder.status || 'pending'}
                    onChange={(e) => setManagingOrder({ ...managingOrder, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="picked_up">Picked Up</option>
                    <option value="in_transit">In Transit</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="cancel_requested">Cancel Requested</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                    Payout Status
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer font-bold uppercase"
                    value={managingOrder.payout_status || 'pending'}
                    onChange={(e) => setManagingOrder({ ...managingOrder, payout_status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="hold">Hold</option>
                  </select>
                </div>
              </div>

              {managingOrder.payout_status === 'hold' && (
                <div>
                  <label className="text-xs font-bold text-rose-400 block mb-1 uppercase tracking-wider">
                    Reason for Holding Payment
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Needs account verification"
                    className="w-full bg-slate-950 border border-rose-900/60 rounded-xl p-3 text-xs text-rose-300 focus:outline-none"
                    value={managingOrder.payout_hold_reason || ''}
                    onChange={(e) => setManagingOrder({ ...managingOrder, payout_hold_reason: e.target.value })}
                  />
                </div>
              )}

              <div className="flex gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-indigo-500/20"
                >
                  🖨️ Print Invoice
                </button>
                <button
                  type="submit"
                  disabled={updateOrderLoading}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20 uppercase tracking-wider"
                >
                  {updateOrderLoading ? 'Saving...' : '💾 Update Order'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 🛡️ EDIT STAFF PERMISSIONS MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-white">
                Edit Permissions: {editingStaff.full_name || editingStaff.email}
              </h3>
              <button onClick={() => setEditingStaff(null)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
            </div>

            <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {AVAILABLE_PERMISSIONS.map((perm) => {
                const currentPerms = editingStaff.permissions || [];
                const isChecked = currentPerms.includes(perm.id) || currentPerms.includes('all');

                return (
                  <label key={perm.id} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        let updated = [...(editingStaff.permissions || [])].filter(p => p !== 'all');
                        if (updated.includes(perm.id)) {
                          updated = updated.filter(p => p !== perm.id);
                        } else {
                          updated.push(perm.id);
                        }
                        setEditingStaff({ ...editingStaff, permissions: updated });
                      }}
                      className="w-4 h-4 accent-emerald-500 mt-0.5 rounded"
                    />
                    <div>
                      <p className="text-xs font-bold text-white">{perm.label}</p>
                      <p className="text-[10px] text-slate-400">{perm.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setEditingStaff(null)} className="w-1/2 bg-slate-800 text-slate-300 py-3 rounded-xl text-xs font-bold cursor-pointer">
                Cancel
              </button>
              <button 
                onClick={() => handleUpdateStaffPermissions(editingStaff.id, editingStaff.permissions)}
                className="w-1/2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 rounded-xl text-xs font-black transition cursor-pointer"
              >
                Save Roles
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 DECLINE PAYMENT MODAL */}
      <AnimatePresence>
        {decliningPaymentReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-slate-900 border border-rose-900/60 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-rose-500">Decline Payment Request</h3>
                <button onClick={() => setDecliningPaymentReq(null)} className="text-slate-400 hover:text-white font-bold cursor-pointer">✕</button>
              </div>
              <form onSubmit={handleConfirmDeclinePayment} className="space-y-4">
                <textarea required rows={3} placeholder="Reason for decline..." className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-rose-500" value={paymentDeclineReason} onChange={(e) => setPaymentDeclineReason(e.target.value)} />
                <div className="flex gap-2.5">
                  <button type="button" onClick={() => setDecliningPaymentReq(null)} className="w-1/2 bg-slate-800 text-slate-300 py-3 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
                  <button type="submit" disabled={paymentActionLoading === decliningPaymentReq.id} className="w-1/2 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl text-xs font-bold transition cursor-pointer">Decline & Email</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}