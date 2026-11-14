import React, { useEffect, useState } from 'react';
import {
  Heart,
  LogOut,
  MapPin,
  Package,
  Plus,
  Settings,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { apiRequest } from '../lib/api.ts';
import { useDocumentMeta, useRouter } from '../lib/router.tsx';
import type { Order, Product } from '../types/ecommerce.ts';
import { ProductCard } from '../components/ProductCard.tsx';

type AuthMode = 'login' | 'register' | 'forgot';
type AccountTab = 'orders' | 'addresses' | 'wishlist' | 'settings';

export function AccountPage() {
  useDocumentMeta('Customer Account — KOVA', 'Manage your orders, saved addresses, wishlist, and account settings.');

  const { search, navigate } = useRouter();
  const { user, authLoading, login, register, logout, refreshUser, wishlistIds, notify } = useStore();

  const initialTab = (new URLSearchParams(search).get('tab') as AccountTab) || 'orders';
  const [activeTab, setActiveTab] = useState<AccountTab>(initialTab);

  // Auth form states
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Forgot / Reset password states
  const [resetRequested, setResetRequested] = useState(false);
  const [previewResetCode, setPreviewResetCode] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Account data states
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');

  // Add address form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addrForm, setAddrForm] = useState({
    label: 'Home',
    fullName: '',
    phone: '',
    line1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
    isDefault: true,
  });

  useEffect(() => {
    const tabParam = new URLSearchParams(search).get('tab') as AccountTab | null;
    if (tabParam && ['orders', 'addresses', 'wishlist', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [search]);

  useEffect(() => {
    if (!user) return;
    setProfileName(user.name);
    setProfilePhone(user.phone || '');
    apiRequest<{ orders: Order[] }>('/api/orders')
      .then((res) => setOrders(res.orders))
      .catch(() => setOrders([]));
  }, [user]);

  useEffect(() => {
    if (wishlistIds.length === 0) {
      setWishlistProducts([]);
      return;
    }
    apiRequest<{ items: Product[] }>('/api/products?limit=48')
      .then((res) => {
        setWishlistProducts(res.items.filter((p) => wishlistIds.includes(p.id)));
      })
      .catch(() => {});
  }, [wishlistIds]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthBusy(true);
    try {
      await login(email, password);
      notify('Welcome back to KOVA', 'success');
    } catch (err: any) {
      setAuthError(err?.message || 'Sign in failed.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthBusy(true);
    try {
      await register({ name, email, password, phone });
      notify('Account created successfully', 'success');
    } catch (err: any) {
      setAuthError(err?.message || 'Registration failed.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthBusy(true);
    try {
      const res = await apiRequest<{ message: string; previewCode?: string }>(
        '/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        }
      );
      setResetRequested(true);
      if (res.previewCode) setPreviewResetCode(res.previewCode);
      notify(res.message, 'success');
    } catch (err: any) {
      setAuthError(err?.message || 'Unable to process request.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthBusy(true);
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code: resetCode, newPassword }),
      });
      notify('Password updated. Please sign in.', 'success');
      setAuthMode('login');
      setResetRequested(false);
      setPreviewResetCode('');
      setPassword('');
    } catch (err: any) {
      setAuthError(err?.message || 'Reset failed.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: profileName, phone: profilePhone }),
      });
      await refreshUser();
      notify('Profile updated', 'success');
    } catch (err: any) {
      notify(err?.message || 'Could not update profile', 'error');
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/auth/addresses', {
        method: 'POST',
        body: JSON.stringify(addrForm),
      });
      await refreshUser();
      setShowAddressForm(false);
      setAddrForm({
        label: 'Home',
        fullName: '',
        phone: '',
        line1: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'United States',
        isDefault: false,
      });
      notify('Shipping address saved', 'success');
    } catch (err: any) {
      notify(err?.message || 'Failed to save address', 'error');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await apiRequest(`/api/auth/addresses/${id}`, { method: 'DELETE' });
      await refreshUser();
      notify('Address removed');
    } catch (err: any) {
      notify(err?.message || 'Failed to remove address', 'error');
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      await apiRequest(`/api/auth/addresses/${id}/default`, { method: 'PATCH' });
      await refreshUser();
      notify('Default shipping address updated', 'success');
    } catch (err: any) {
      notify(err?.message || 'Failed to update default address', 'error');
    }
  };

  if (authLoading) {
    return <div className="max-w-4xl mx-auto px-4 py-20 text-center text-sm text-zinc-500">Loading account...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
        <div className="border border-zinc-200 rounded-xl bg-white p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">
              {authMode === 'login'
                ? 'Customer Sign In'
                : authMode === 'register'
                ? 'Create Account'
                : 'Reset Password'}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {authMode === 'login'
                ? 'Access order history, saved addresses, and your wishlist.'
                : authMode === 'register'
                ? 'Join KOVA for faster checkout and verified reviews.'
                : 'Enter your email to verify and set a new password.'}
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-800">
              {authError}
            </div>
          )}

          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>
              <button
                type="submit"
                disabled={authBusy}
                className="w-full py-2.5 text-sm font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-50"
              >
                {authBusy ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthError('');
                    setAuthMode('forgot');
                  }}
                  className="text-zinc-600 hover:text-zinc-900 underline"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthError('');
                    setAuthMode('register');
                  }}
                  className="text-zinc-900 font-semibold hover:underline"
                >
                  Create account
                </button>
              </div>

              <div className="pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('alex@kova-demo.com');
                    setPassword('Customer123!');
                  }}
                  className="w-full py-2 text-xs font-medium border border-zinc-300 rounded-md text-zinc-700 hover:bg-zinc-50"
                >
                  Fill Demo Customer (alex@kova-demo.com)
                </button>
              </div>
            </form>
          )}

          {authMode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Phone (optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>
              <button
                type="submit"
                disabled={authBusy}
                className="w-full py-2.5 text-sm font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-50"
              >
                {authBusy ? 'Creating Account...' : 'Create Account'}
              </button>
              <p className="text-center text-xs text-zinc-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthError('');
                    setAuthMode('login');
                  }}
                  className="font-semibold text-zinc-900 underline"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {authMode === 'forgot' && (
            <div className="space-y-4">
              {!resetRequested ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Account Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authBusy}
                    className="w-full py-2.5 text-sm font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
                  >
                    {authBusy ? 'Sending Code...' : 'Send Reset Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {previewResetCode && (
                    <div className="p-3 rounded-md bg-zinc-100 border border-zinc-200 text-xs text-zinc-700 font-mono">
                      Verification code: <span className="font-bold">{previewResetCode}</span>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">6-Digit Code</label>
                    <input
                      type="text"
                      required
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-zinc-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={authBusy}
                    className="w-full py-2.5 text-sm font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
                  >
                    Update Password
                  </button>
                </form>
              )}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setResetRequested(false);
                }}
                className="w-full text-xs text-zinc-600 hover:text-zinc-900 underline"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-zinc-900 text-white flex items-center justify-center font-semibold font-display">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{user.name}</h1>
            <p className="text-xs text-zinc-500">
              {user.email} <span aria-hidden="true">·</span> Member since{' '}
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user.role === 'admin' && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-4 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
            >
              Open Admin Dashboard
            </button>
          )}
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-zinc-300 text-zinc-700 rounded-md hover:bg-zinc-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-200">
        {(
          [
            { id: 'orders', label: 'Order History', icon: Package },
            { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
            { id: 'wishlist', label: `Wishlist (${wishlistIds.length})`, icon: Heart },
            { id: 'settings', label: 'Profile Settings', icon: Settings },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                activeTab === tab.id
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="p-10 border border-zinc-200 rounded-lg text-center bg-zinc-50">
                <p className="text-sm font-medium text-zinc-900">No orders placed yet</p>
                <button
                  onClick={() => navigate('/shop')}
                  className="mt-4 px-5 py-2 text-xs font-medium bg-zinc-900 text-white rounded-md"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="border border-zinc-200 rounded-lg p-5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="font-mono font-semibold text-zinc-900">{order.orderNumber}</span>
                      <span aria-hidden="true">·</span>
                      <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize font-medium text-zinc-800">{order.status}</span>
                    </div>
                    <p className="text-sm text-zinc-700">
                      {order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-base font-bold font-mono tabular-nums text-zinc-900">
                      ${order.total.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/track?order=${encodeURIComponent(order.orderNumber)}`)}
                      className="px-3.5 py-2 text-xs font-medium border border-zinc-300 rounded-md hover:bg-zinc-50"
                    >
                      Track Order
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'addresses' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Saved Shipping Addresses</h2>
              <button
                type="button"
                onClick={() => setShowAddressForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-zinc-900 text-white rounded-md"
              >
                <Plus className="w-3.5 h-3.5" /> Add Address
              </button>
            </div>

            {showAddressForm && (
              <form
                onSubmit={handleAddAddress}
                className="p-6 border border-zinc-200 rounded-lg bg-zinc-50 grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <input
                  required
                  placeholder="Label (e.g. Home, Studio)"
                  value={addrForm.label}
                  onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })}
                  className="px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md"
                />
                <input
                  required
                  placeholder="Recipient Full Name"
                  value={addrForm.fullName}
                  onChange={(e) => setAddrForm({ ...addrForm, fullName: e.target.value })}
                  className="px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md"
                />
                <input
                  required
                  placeholder="Phone Number"
                  value={addrForm.phone}
                  onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })}
                  className="px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md"
                />
                <input
                  required
                  placeholder="Street Address"
                  value={addrForm.line1}
                  onChange={(e) => setAddrForm({ ...addrForm, line1: e.target.value })}
                  className="px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md"
                />
                <input
                  required
                  placeholder="City"
                  value={addrForm.city}
                  onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                  className="px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md"
                />
                <input
                  placeholder="State / Province"
                  value={addrForm.state}
                  onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })}
                  className="px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md"
                />
                <input
                  required
                  placeholder="Postal Code"
                  value={addrForm.postalCode}
                  onChange={(e) => setAddrForm({ ...addrForm, postalCode: e.target.value })}
                  className="px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md"
                />
                <input
                  required
                  placeholder="Country"
                  value={addrForm.country}
                  onChange={(e) => setAddrForm({ ...addrForm, country: e.target.value })}
                  className="px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md"
                />
                <div className="sm:col-span-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="px-4 py-2 text-xs border border-zinc-300 rounded-md bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-md"
                  >
                    Save Address
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="p-5 border border-zinc-200 rounded-lg bg-white flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-zinc-900">{addr.label}</span>
                      {addr.isDefault && (
                        <span className="text-xs font-medium text-emerald-700">Default</span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-700">{addr.fullName}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">{addr.line1}</p>
                    <p className="text-xs text-zinc-600">
                      {addr.city}, {addr.state} {addr.postalCode}, {addr.country}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 font-mono">{addr.phone}</p>
                  </div>
                  <div className="flex items-center gap-3 pt-3 border-t border-zinc-100 text-xs">
                    {!addr.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        Set as Default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-zinc-500 hover:text-red-700 inline-flex items-center gap-1 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'wishlist' && (
          <div>
            {wishlistProducts.length === 0 ? (
              <div className="p-10 border border-zinc-200 rounded-lg text-center bg-zinc-50">
                <p className="text-sm font-medium text-zinc-900">Your wishlist is empty</p>
                <button
                  onClick={() => navigate('/shop')}
                  className="mt-4 px-5 py-2 text-xs font-medium bg-zinc-900 text-white rounded-md"
                >
                  Discover Products
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlistProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <form
            onSubmit={handleSaveProfile}
            className="max-w-lg border border-zinc-200 rounded-lg p-6 bg-white space-y-4"
          >
            <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
              <UserIcon className="w-4 h-4" /> Profile Information
            </h2>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Email</label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full px-3 py-2 text-sm border border-zinc-200 bg-zinc-50 text-zinc-500 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-md"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
            >
              Save Changes
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
