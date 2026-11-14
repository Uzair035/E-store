import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  CreditCard,
  FolderTree,
  Image as ImageIcon,
  Layers,
  LogOut,
  MessageSquare,
  Package,
  Plus,
  ShoppingCart,
  Tag,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { apiRequest } from '../lib/api.ts';
import { MEDIA_KEY_OPTIONS } from '../lib/productMedia.ts';
import { useDocumentMeta, useRouter } from '../lib/router.tsx';
import type {
  AdminAnalytics,
  Banner,
  CardProvider,
  Category,
  Coupon,
  Order,
  OrderStatus,
  PaymentGatewaySettings,
  Product,
  Review,
  UserProfile,
} from '../types/ecommerce.ts';
import { MediaImage } from '../components/MediaImage.tsx';

type AdminSection =
  | 'analytics'
  | 'products'
  | 'categories'
  | 'orders'
  | 'customers'
  | 'coupons'
  | 'banners'
  | 'reviews'
  | 'payments';

export function AdminPage() {
  useDocumentMeta('Admin Console — NOVA Commerce');

  const { navigate } = useRouter();
  const { user, login, logout, refreshPaymentSettings, notify } = useStore();

  // Admin login gate states
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const [section, setSection] = useState<AdminSection>('analytics');
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<(UserProfile & { orderCount: number; totalSpent: number })[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentGatewaySettings | null>(null);

  // Product modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({
    name: '',
    sku: '',
    brand: '',
    categorySlug: 'studio-audio',
    shortDescription: '',
    description: '',
    price: '199',
    salePrice: '',
    stock: '15',
    imageKey: 'studio-headphones',
    isTrending: true,
    isBestSeller: false,
    isNewArrival: true,
    isSpecialOffer: false,
  });

  // Category & Coupon forms
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatImg, setNewCatImg] = useState('studio-headphones');

  const [newCoupon, setNewCoupon] = useState({
    code: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: '15',
    minOrderAmount: '100',
    expiresAt: '2027-12-31',
  });

  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [productSearch, setProductSearch] = useState('');

  const loadAdminData = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    try {
      const [an, prods, cats, ords, custs, coups, bans, revs, pay] = await Promise.all([
        apiRequest<AdminAnalytics>('/api/admin/analytics'),
        apiRequest<{ items: Product[] }>('/api/products?limit=48'),
        apiRequest<{ categories: Category[] }>('/api/admin/categories'),
        apiRequest<{ orders: Order[] }>('/api/admin/orders'),
        apiRequest<{ customers: any[] }>('/api/admin/customers'),
        apiRequest<{ coupons: Coupon[] }>('/api/admin/coupons'),
        apiRequest<{ banners: Banner[] }>('/api/admin/banners'),
        apiRequest<{ reviews: Review[] }>('/api/admin/reviews'),
        apiRequest<{ paymentSettings: PaymentGatewaySettings }>('/api/admin/payment-settings'),
      ]);
      setAnalytics(an);
      setProducts(prods.items);
      setCategories(cats.categories);
      setOrders(ords.orders);
      setCustomers(custs.customers);
      setCoupons(coups.coupons);
      setBanners(bans.banners);
      setReviews(revs.reviews);
      setPaymentConfig(pay.paymentSettings);
    } catch (err: any) {
      notify(err?.message || 'Error loading admin data', 'error');
    }
  }, [user, notify]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthBusy(true);
    try {
      const logged = await login(adminEmail, adminPassword);
      if (logged.role !== 'admin') {
        setAuthError('This account does not have administrator privileges.');
      } else {
        notify('Signed in to NOVA Admin Console', 'success');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Invalid credentials.');
    } finally {
      setAuthBusy(false);
    }
  };

  // Show Admin Sign-In Gate if not signed in as admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white border border-zinc-200 rounded-xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold tracking-tight text-zinc-900 font-display">
              NOVA Admin
            </span>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-xs text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Storefront
            </button>
          </div>

          <div>
            <h1 className="text-xl font-bold text-zinc-900">Administrator Authentication</h1>
            <p className="text-xs text-zinc-500 mt-1">
              Role-based access required to manage catalog, orders, and payment gateways.
            </p>
          </div>

          {user && user.role !== 'admin' && (
            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900">
              Currently signed in as customer ({user.email}). Please sign in with an administrator account.
            </div>
          )}

          {authError && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-800">
              {authError}
            </div>
          )}

          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Admin Email</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
              />
            </div>
            <button
              type="submit"
              disabled={authBusy}
              className="w-full py-2.5 text-sm font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-50"
            >
              {authBusy ? 'Verifying...' : 'Sign In to Console'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setAdminEmail('admin@nova-demo.com');
              setAdminPassword('Admin123!');
            }}
            className="w-full py-2 text-xs font-medium border border-zinc-300 rounded-md text-zinc-700 hover:bg-zinc-50"
          >
            Fill Demo Admin (admin@nova-demo.com)
          </button>
        </div>
      </div>
    );
  }

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProdForm({
      name: '',
      sku: '',
      brand: '',
      categorySlug: categories[0]?.slug || 'studio-audio',
      shortDescription: '',
      description: '',
      price: '199',
      salePrice: '',
      stock: '15',
      imageKey: 'studio-headphones',
      isTrending: true,
      isBestSeller: false,
      isNewArrival: true,
      isSpecialOffer: false,
    });
    setProductModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdForm({
      name: p.name,
      sku: p.sku,
      brand: p.brand,
      categorySlug: p.categorySlug,
      shortDescription: p.shortDescription,
      description: p.description,
      price: String(p.price),
      salePrice: p.salePrice !== null ? String(p.salePrice) : '',
      stock: String(p.stock),
      imageKey: p.imageKeys[0] || 'studio-headphones',
      isTrending: p.isTrending,
      isBestSeller: p.isBestSeller,
      isNewArrival: p.isNewArrival,
      isSpecialOffer: p.isSpecialOffer,
    });
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...prodForm,
        price: Number(prodForm.price),
        salePrice: prodForm.salePrice ? Number(prodForm.salePrice) : null,
        stock: Number(prodForm.stock),
      };
      if (editingProduct) {
        await apiRequest(`/api/admin/products/${editingProduct.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        notify('Product updated', 'success');
      } else {
        await apiRequest('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        notify('Product created', 'success');
      }
      setProductModalOpen(false);
      await loadAdminData();
    } catch (err: any) {
      notify(err?.message || 'Failed to save product', 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await apiRequest(`/api/admin/products/${id}`, { method: 'DELETE' });
      notify('Product deleted');
      await loadAdminData();
    } catch (err: any) {
      notify(err?.message || 'Failed to delete product', 'error');
    }
  };

  const handleAdjustStock = async (p: Product, delta: number) => {
    try {
      await apiRequest(`/api/admin/products/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stock: Math.max(0, p.stock + delta) }),
      });
      await loadAdminData();
    } catch {
      notify('Could not adjust stock', 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await apiRequest(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      notify(`Order updated to ${status}`, 'success');
      await loadAdminData();
    } catch (err: any) {
      notify(err?.message || 'Failed to update order status', 'error');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCatName, description: newCatDesc, imageKey: newCatImg }),
      });
      setNewCatName('');
      setNewCatDesc('');
      notify('Category created', 'success');
      await loadAdminData();
    } catch (err: any) {
      notify(err?.message || 'Failed to create category', 'error');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({
          ...newCoupon,
          value: Number(newCoupon.value),
          minOrderAmount: Number(newCoupon.minOrderAmount),
        }),
      });
      setNewCoupon({
        code: '',
        description: '',
        type: 'percentage',
        value: '15',
        minOrderAmount: '100',
        expiresAt: '2027-12-31',
      });
      notify('Promo code created', 'success');
      await loadAdminData();
    } catch (err: any) {
      notify(err?.message || 'Failed to create coupon', 'error');
    }
  };

  const handleSavePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentConfig) return;
    try {
      await apiRequest('/api/admin/payment-settings', {
        method: 'PATCH',
        body: JSON.stringify(paymentConfig),
      });
      await refreshPaymentSettings();
      notify('Payment & shipping configuration saved', 'success');
    } catch (err: any) {
      notify(err?.message || 'Failed to save configuration', 'error');
    }
  };

  const navItems: { id: AdminSection; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'products', label: 'Products & Stock', icon: Package },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'coupons', label: 'Discounts', icon: Tag },
    { id: 'banners', label: 'Banners', icon: ImageIcon },
    { id: 'reviews', label: 'Reviews', icon: MessageSquare },
    { id: 'payments', label: 'Payments & Shipping', icon: CreditCard },
  ];

  const maxRev = Math.max(...(analytics?.revenueSeries.map((r) => r.revenue) || [1]), 1);
  const filteredProducts = products.filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return `${p.name} ${p.sku} ${p.brand}`.toLowerCase().includes(q);
  });
  const filteredOrders = orders.filter((o) =>
    orderStatusFilter === 'all' ? true : o.status === orderStatusFilter
  );

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-zinc-200 flex flex-col shrink-0">
        <div className="h-16 px-5 border-b border-zinc-200 flex items-center justify-between">
          <span className="text-base font-bold text-zinc-900 font-display tracking-tight">
            NOVA Console
          </span>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Store
          </button>
        </div>

        <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`inline-flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:flex p-4 border-t border-zinc-200 items-center justify-between text-xs">
          <div className="truncate">
            <p className="font-semibold text-zinc-900 truncate">{user.name}</p>
            <p className="text-zinc-500 truncate">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-zinc-500 hover:text-zinc-900"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-zinc-200 px-6 flex items-center justify-between gap-4">
          <div className="text-xs text-zinc-500 flex items-center gap-2">
            <span>Admin</span>
            <span aria-hidden="true">/</span>
            <span className="text-zinc-900 font-semibold capitalize">
              {navItems.find((n) => n.id === section)?.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {section === 'products' && (
              <button
                type="button"
                onClick={openCreateProduct}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product
              </button>
            )}
          </div>
        </header>

        <main className="p-6 space-y-6 max-w-6xl w-full">
          {/* 1. ANALYTICS */}
          {section === 'analytics' && analytics && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-zinc-200 rounded-lg p-5">
                  <p className="text-xs font-medium text-zinc-500">Total Sales</p>
                  <p className="text-2xl font-bold text-zinc-900 font-mono tabular-nums mt-1">
                    ${analytics.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1 font-mono tabular-nums">
                    Avg Order ${analytics.averageOrderValue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-white border border-zinc-200 rounded-lg p-5">
                  <p className="text-xs font-medium text-zinc-500">Total Orders</p>
                  <p className="text-2xl font-bold text-zinc-900 font-mono tabular-nums mt-1">
                    {analytics.totalOrders}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Across all payment channels</p>
                </div>
                <div className="bg-white border border-zinc-200 rounded-lg p-5">
                  <p className="text-xs font-medium text-zinc-500">Registered Customers</p>
                  <p className="text-2xl font-bold text-zinc-900 font-mono tabular-nums mt-1">
                    {analytics.totalCustomers}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Verified store accounts</p>
                </div>
                <div className="bg-white border border-zinc-200 rounded-lg p-5">
                  <p className="text-xs font-medium text-zinc-500">Active Products</p>
                  <p className="text-2xl font-bold text-zinc-900 font-mono tabular-nums mt-1">
                    {analytics.totalProducts}
                  </p>
                  <p className="text-xs text-amber-700 mt-1 font-mono tabular-nums">
                    {analytics.lowStockProducts.length} low-stock alerts
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Revenue Chart */}
                <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-900">Revenue Trend (6 Months)</h2>
                      <p className="text-xs text-zinc-500">Monthly gross merchandise revenue (USD)</p>
                    </div>
                  </div>
                  <div className="h-56 flex items-end gap-4 pt-4">
                    {analytics.revenueSeries.map((pt) => {
                      const heightPct = Math.max(8, Math.round((pt.revenue / maxRev) * 100));
                      return (
                        <div key={pt.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                          <span className="text-[11px] font-mono tabular-nums text-zinc-600">
                            ${Math.round(pt.revenue).toLocaleString()}
                          </span>
                          <div className="w-full max-w-[48px] bg-zinc-100 rounded-t-md h-40 flex items-end overflow-hidden">
                            <div
                              className="w-full bg-zinc-900 rounded-t-md transition-all duration-300"
                              style={{ height: `${heightPct}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-zinc-700">{pt.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Category Share */}
                <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-6">
                  <h2 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                    <Layers className="w-4 h-4" /> Revenue by Department
                  </h2>
                  <div className="space-y-4">
                    {analytics.categoryBreakdown.map((item) => (
                      <div key={item.category} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-zinc-800">{item.category}</span>
                          <span className="font-mono tabular-nums text-zinc-600">
                            ${item.revenue.toFixed(0)} ({item.share}%)
                          </span>
                        </div>
                        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-zinc-900" style={{ width: `${item.share}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-zinc-900">Recent Orders</h2>
                  <button
                    type="button"
                    onClick={() => setSection('orders')}
                    className="text-xs font-medium text-zinc-700 hover:underline"
                  >
                    Manage All Orders
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                      <tr>
                        <th className="py-2.5 px-4 font-medium">Order</th>
                        <th className="py-2.5 px-4 font-medium">Customer</th>
                        <th className="py-2.5 px-4 font-medium">Payment</th>
                        <th className="py-2.5 px-4 font-medium">Status</th>
                        <th className="py-2.5 px-4 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {analytics.recentOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-zinc-50">
                          <td className="py-2.5 px-4 font-mono font-semibold text-zinc-900">
                            {o.orderNumber}
                          </td>
                          <td className="py-2.5 px-4 text-zinc-700">{o.customerName}</td>
                          <td className="py-2.5 px-4 text-zinc-600">{o.paymentProvider}</td>
                          <td className="py-2.5 px-4 capitalize font-medium text-zinc-900">{o.status}</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-zinc-900">
                            ${o.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* 2. PRODUCTS & INVENTORY */}
          {section === 'products' && (
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <input
                  type="search"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search SKU, name, brand..."
                  className="w-full sm:w-72 px-3 py-1.5 text-xs border border-zinc-300 rounded-md"
                />
                <span className="text-xs font-mono tabular-nums text-zinc-500">
                  {filteredProducts.length} products
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Product</th>
                      <th className="py-2.5 px-4 font-medium">SKU</th>
                      <th className="py-2.5 px-4 font-medium">Category</th>
                      <th className="py-2.5 px-4 font-medium text-right">Price</th>
                      <th className="py-2.5 px-4 font-medium text-center">Stock</th>
                      <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-8 rounded bg-zinc-100 overflow-hidden shrink-0">
                              <MediaImage
                                imageKey={p.imageKeys[0]}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="font-medium text-zinc-900 line-clamp-1">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-zinc-500">{p.sku}</td>
                        <td className="py-2.5 px-4 text-zinc-600">{p.categoryName}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                          {p.salePrice ? (
                            <span>
                              <strong className="text-zinc-900">${p.salePrice.toFixed(2)}</strong>{' '}
                              <span className="line-through text-zinc-400">${p.price.toFixed(2)}</span>
                            </span>
                          ) : (
                            <strong className="text-zinc-900">${p.price.toFixed(2)}</strong>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 border border-zinc-200 rounded px-1.5 py-0.5 bg-white">
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(p, -1)}
                              className="px-1 text-zinc-500 hover:text-zinc-900"
                            >
                              -
                            </button>
                            <span
                              className={`font-mono tabular-nums font-semibold ${
                                p.stock <= 5 ? 'text-amber-700' : 'text-zinc-900'
                              }`}
                            >
                              {p.stock}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(p, 1)}
                              className="px-1 text-zinc-500 hover:text-zinc-900"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEditProduct(p)}
                            className="text-zinc-700 hover:text-zinc-900 font-medium mr-3"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id)}
                            className="text-red-700 hover:underline font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. CATEGORIES */}
          {section === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleCreateCategory}
                className="lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-5 space-y-4 h-fit"
              >
                <h2 className="text-sm font-semibold text-zinc-900">Add Department Category</h2>
                <input
                  required
                  placeholder="Category Name"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-md"
                />
                <textarea
                  rows={2}
                  placeholder="Short description"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-md"
                />
                <select
                  value={newCatImg}
                  onChange={(e) => setNewCatImg(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-md bg-white"
                >
                  {MEDIA_KEY_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="w-full py-2 text-xs font-semibold bg-zinc-900 text-white rounded-md"
                >
                  Create Category
                </button>
              </form>

              <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-100">
                {categories.map((cat) => (
                  <div key={cat.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-9 rounded bg-zinc-100 overflow-hidden shrink-0">
                        <MediaImage imageKey={cat.imageKey} alt={cat.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{cat.name}</p>
                        <p className="text-xs text-zinc-500">/{cat.slug}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiRequest(`/api/admin/categories/${cat.id}`, { method: 'DELETE' });
                        loadAdminData();
                      }}
                      className="text-xs text-red-700 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. ORDERS */}
          {section === 'orders' && (
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize whitespace-nowrap ${
                        orderStatusFilter === st
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Order #</th>
                      <th className="py-2.5 px-4 font-medium">Customer</th>
                      <th className="py-2.5 px-4 font-medium">Items</th>
                      <th className="py-2.5 px-4 font-medium">Payment</th>
                      <th className="py-2.5 px-4 font-medium text-right">Total</th>
                      <th className="py-2.5 px-4 font-medium">Fulfillment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-zinc-50">
                        <td className="py-3 px-4 font-mono font-semibold text-zinc-900">
                          {o.orderNumber}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-zinc-900">{o.customerName}</p>
                          <p className="text-zinc-500">{o.customerEmail}</p>
                        </td>
                        <td className="py-3 px-4 text-zinc-600 max-w-xs truncate">
                          {o.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                        </td>
                        <td className="py-3 px-4 text-zinc-600">{o.paymentProvider}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-zinc-900">
                          ${o.total.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={o.status}
                            onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value as OrderStatus)}
                            className="px-2.5 py-1 text-xs border border-zinc-300 rounded bg-white capitalize"
                          >
                            <option value="pending">pending</option>
                            <option value="confirmed">confirmed</option>
                            <option value="processing">processing</option>
                            <option value="shipped">shipped</option>
                            <option value="delivered">delivered</option>
                            <option value="cancelled">cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. CUSTOMERS */}
          {section === 'customers' && (
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Name</th>
                      <th className="py-2.5 px-4 font-medium">Email</th>
                      <th className="py-2.5 px-4 font-medium">Role</th>
                      <th className="py-2.5 px-4 font-medium text-right">Orders</th>
                      <th className="py-2.5 px-4 font-medium text-right">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-zinc-50">
                        <td className="py-2.5 px-4 font-medium text-zinc-900">{c.name}</td>
                        <td className="py-2.5 px-4 text-zinc-600">{c.email}</td>
                        <td className="py-2.5 px-4 capitalize text-zinc-700">{c.role}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">{c.orderCount}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-zinc-900">
                          ${c.totalSpent.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. COUPONS */}
          {section === 'coupons' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleCreateCoupon}
                className="lg:col-span-4 bg-white border border-zinc-200 rounded-lg p-5 space-y-3 h-fit"
              >
                <h2 className="text-sm font-semibold text-zinc-900">Create Discount Coupon</h2>
                <input
                  required
                  placeholder="Code (e.g. SPRING20)"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-xs font-mono uppercase border border-zinc-300 rounded-md"
                />
                <input
                  placeholder="Description"
                  value={newCoupon.description}
                  onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-md"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newCoupon.type}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, type: e.target.value as 'percentage' | 'fixed' })
                    }
                    className="px-2.5 py-2 text-xs border border-zinc-300 rounded-md bg-white"
                  >
                    <option value="percentage">% Off</option>
                    <option value="fixed">$ Fixed</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newCoupon.value}
                    onChange={(e) => setNewCoupon({ ...newCoupon, value: e.target.value })}
                    placeholder="Value"
                    className="px-2.5 py-2 text-xs font-mono border border-zinc-300 rounded-md"
                  />
                </div>
                <input
                  type="number"
                  min="0"
                  value={newCoupon.minOrderAmount}
                  onChange={(e) => setNewCoupon({ ...newCoupon, minOrderAmount: e.target.value })}
                  placeholder="Min Order ($)"
                  className="w-full px-3 py-2 text-xs font-mono border border-zinc-300 rounded-md"
                />
                <button
                  type="submit"
                  className="w-full py-2 text-xs font-semibold bg-zinc-900 text-white rounded-md"
                >
                  Create Coupon
                </button>
              </form>

              <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-100">
                {coupons.map((c) => (
                  <div key={c.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-mono font-bold text-zinc-900">
                        {c.code}{' '}
                        <span className="font-sans font-normal text-xs text-zinc-500">
                          · {c.type === 'percentage' ? `${c.value}% off` : `$${c.value} off`} (min $
                          {c.minOrderAmount})
                        </span>
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">{c.description}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={async () => {
                          await apiRequest(`/api/admin/coupons/${c.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ active: !c.active }),
                          });
                          loadAdminData();
                        }}
                        className={`px-2.5 py-1 rounded border font-medium ${
                          c.active
                            ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
                            : 'border-zinc-300 text-zinc-600 bg-zinc-50'
                        }`}
                      >
                        {c.active ? 'Active' : 'Paused'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiRequest(`/api/admin/coupons/${c.id}`, { method: 'DELETE' });
                          loadAdminData();
                        }}
                        className="text-zinc-400 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. BANNERS */}
          {section === 'banners' && (
            <div className="space-y-4">
              {banners.map((b) => (
                <div key={b.id} className="bg-white border border-zinc-200 rounded-lg p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase font-semibold text-zinc-500">
                      Slot: {b.slot}
                    </span>
                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-700">
                      <input
                        type="checkbox"
                        checked={b.active}
                        onChange={async (e) => {
                          await apiRequest(`/api/admin/banners/${b.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ active: e.target.checked }),
                          });
                          loadAdminData();
                        }}
                      />
                      Active on Storefront
                    </label>
                  </div>
                  <input
                    value={b.title}
                    onChange={(e) =>
                      setBanners((prev) =>
                        prev.map((item) => (item.id === b.id ? { ...item, title: e.target.value } : item))
                      )
                    }
                    className="w-full px-3 py-2 text-sm font-medium border border-zinc-300 rounded-md"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={async () => {
                        await apiRequest(`/api/admin/banners/${b.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ title: b.title }),
                        });
                        notify('Banner updated', 'success');
                      }}
                      className="px-4 py-1.5 text-xs font-semibold bg-zinc-900 text-white rounded-md"
                    >
                      Save Banner
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 8. REVIEWS */}
          {section === 'reviews' && (
            <div className="bg-white border border-zinc-200 rounded-lg divide-y divide-zinc-100">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-500">
                      {rev.productName} · {rev.rating}/5 Stars · by {rev.authorName}
                    </p>
                    <p className="text-sm font-semibold text-zinc-900">{rev.title}</p>
                    <p className="text-xs text-zinc-600">{rev.comment}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    <button
                      type="button"
                      onClick={async () => {
                        await apiRequest(`/api/admin/reviews/${rev.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ approved: !rev.approved }),
                        });
                        loadAdminData();
                      }}
                      className="px-3 py-1.5 border border-zinc-300 rounded-md hover:bg-zinc-50"
                    >
                      {rev.approved ? 'Hide' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiRequest(`/api/admin/reviews/${rev.id}`, { method: 'DELETE' });
                        loadAdminData();
                      }}
                      className="px-3 py-1.5 text-red-700 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 9. PAYMENTS & SHIPPING CONFIG */}
          {section === 'payments' && paymentConfig && (
            <form
              onSubmit={handleSavePaymentConfig}
              className="bg-white border border-zinc-200 rounded-lg p-6 space-y-6 max-w-2xl"
            >
              <div>
                <h2 className="text-base font-bold text-zinc-900">Configurable Payment & Shipping Architecture</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Switch active card payment gateways, toggle Cash on Delivery, and configure bank wire details.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-200">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Active Card Gateway Provider
                  </label>
                  <select
                    value={paymentConfig.activeCardProvider}
                    onChange={(e) =>
                      setPaymentConfig({
                        ...paymentConfig,
                        activeCardProvider: e.target.value as CardProvider,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md bg-white"
                  >
                    <option value="stripe">Stripe</option>
                    <option value="adyen">Adyen</option>
                    <option value="payfast">PayFast</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end gap-2 text-xs">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={paymentConfig.cardEnabled}
                      onChange={(e) =>
                        setPaymentConfig({ ...paymentConfig, cardEnabled: e.target.checked })
                      }
                    />
                    Enable Card Payments
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={paymentConfig.bankTransferEnabled}
                      onChange={(e) =>
                        setPaymentConfig({ ...paymentConfig, bankTransferEnabled: e.target.checked })
                      }
                    />
                    Enable Direct Bank Transfer
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={paymentConfig.codEnabled}
                      onChange={(e) =>
                        setPaymentConfig({ ...paymentConfig, codEnabled: e.target.checked })
                      }
                    />
                    Enable Cash on Delivery (COD)
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-200">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Bank Name</label>
                  <input
                    value={paymentConfig.bankName}
                    onChange={(e) => setPaymentConfig({ ...paymentConfig, bankName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Account / IBAN</label>
                  <input
                    value={paymentConfig.bankIban}
                    onChange={(e) => setPaymentConfig({ ...paymentConfig, bankIban: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-zinc-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-zinc-200">
                <div>
                  <label className="block text-xs text-zinc-600 mb-1">Standard ($)</label>
                  <input
                    type="number"
                    value={paymentConfig.standardShippingFee}
                    onChange={(e) =>
                      setPaymentConfig({
                        ...paymentConfig,
                        standardShippingFee: Number(e.target.value),
                      })
                    }
                    className="w-full px-2.5 py-2 text-xs font-mono border border-zinc-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-600 mb-1">Express ($)</label>
                  <input
                    type="number"
                    value={paymentConfig.expressShippingFee}
                    onChange={(e) =>
                      setPaymentConfig({
                        ...paymentConfig,
                        expressShippingFee: Number(e.target.value),
                      })
                    }
                    className="w-full px-2.5 py-2 text-xs font-mono border border-zinc-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-600 mb-1">Free Threshold ($)</label>
                  <input
                    type="number"
                    value={paymentConfig.freeShippingThreshold}
                    onChange={(e) =>
                      setPaymentConfig({
                        ...paymentConfig,
                        freeShippingThreshold: Number(e.target.value),
                      })
                    }
                    className="w-full px-2.5 py-2 text-xs font-mono border border-zinc-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-600 mb-1">COD Fee ($)</label>
                  <input
                    type="number"
                    value={paymentConfig.codFee}
                    onChange={(e) =>
                      setPaymentConfig({ ...paymentConfig, codFee: Number(e.target.value) })
                    }
                    className="w-full px-2.5 py-2 text-xs font-mono border border-zinc-300 rounded-md"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
              >
                Save Payment & Shipping Settings
              </button>
            </form>
          )}
        </main>
      </div>

      {/* Add / Edit Product Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h2 className="text-base font-bold text-zinc-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="p-1 text-zinc-500 hover:text-zinc-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-zinc-700 mb-1">Product Name *</label>
                  <input
                    required
                    value={prodForm.name}
                    onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Brand *</label>
                  <input
                    required
                    value={prodForm.brand}
                    onChange={(e) => setProdForm({ ...prodForm, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">SKU</label>
                  <input
                    value={prodForm.sku}
                    onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                    className="w-full px-3 py-2 font-mono border border-zinc-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Category *</label>
                  <select
                    value={prodForm.categorySlug}
                    onChange={(e) => setProdForm({ ...prodForm, categorySlug: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md bg-white"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Product Image</label>
                  <select
                    value={prodForm.imageKey}
                    onChange={(e) => setProdForm({ ...prodForm, imageKey: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md bg-white"
                  >
                    {MEDIA_KEY_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Regular Price ($) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={prodForm.price}
                    onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
                    className="w-full px-3 py-2 font-mono border border-zinc-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Sale Price ($ optional)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={prodForm.salePrice}
                    onChange={(e) => setProdForm({ ...prodForm, salePrice: e.target.value })}
                    className="w-full px-3 py-2 font-mono border border-zinc-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={prodForm.stock}
                    onChange={(e) => setProdForm({ ...prodForm, stock: e.target.value })}
                    className="w-full px-3 py-2 font-mono border border-zinc-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={prodForm.description}
                  onChange={(e) =>
                    setProdForm({
                      ...prodForm,
                      description: e.target.value,
                      shortDescription: e.target.value.slice(0, 120),
                    })
                  }
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md"
                />
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={prodForm.isTrending}
                    onChange={(e) => setProdForm({ ...prodForm, isTrending: e.target.checked })}
                  />
                  Trending
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={prodForm.isBestSeller}
                    onChange={(e) => setProdForm({ ...prodForm, isBestSeller: e.target.checked })}
                  />
                  Best Seller
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={prodForm.isNewArrival}
                    onChange={(e) => setProdForm({ ...prodForm, isNewArrival: e.target.checked })}
                  />
                  New Arrival
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={prodForm.isSpecialOffer}
                    onChange={(e) => setProdForm({ ...prodForm, isSpecialOffer: e.target.checked })}
                  />
                  Special Offer
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 border border-zinc-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold bg-zinc-900 text-white rounded-md"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
