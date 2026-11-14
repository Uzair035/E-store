import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, getStoredToken, setStoredToken } from '../lib/api.ts';
import type { CartItem, PaymentGatewaySettings, Product, UserProfile } from '../types/ecommerce.ts';

interface ToastMessage {
  id: string;
  text: string;
  tone: 'neutral' | 'success' | 'error';
}

interface StoreContextValue {
  user: UserProfile | null;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (payload: { name: string; email: string; password: string; phone?: string }) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (
    product: Product,
    quantity?: number,
    options?: { color?: string; size?: string; openDrawer?: boolean }
  ) => void;
  updateCartQuantity: (productId: string, color: string | undefined, size: string | undefined, quantity: number) => void;
  removeFromCart: (productId: string, color?: string, size?: string) => void;
  clearCart: () => void;
  wishlistIds: string[];
  toggleWishlist: (productId: string) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
  paymentSettings: PaymentGatewaySettings;
  refreshPaymentSettings: () => Promise<void>;
  notify: (text: string, tone?: 'neutral' | 'success' | 'error') => void;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
}

const DEFAULT_PAYMENT_SETTINGS: PaymentGatewaySettings = {
  activeCardProvider: 'stripe',
  cardEnabled: true,
  bankTransferEnabled: true,
  bankAccountName: 'KOVA Commerce International Ltd.',
  bankName: 'Mercury / Citi Commercial Banking',
  bankIban: 'US89-CITB-0004-8921-4402',
  bankSwift: 'CITIUS33',
  codEnabled: true,
  codFee: 4,
  standardShippingFee: 12,
  expressShippingFee: 24,
  freeShippingThreshold: 150,
};

const CART_STORAGE_KEY = 'kova_cart_items';
const GUEST_WISHLIST_KEY = 'kova_guest_wishlist';

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isCartOpen, setCartOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentGatewaySettings>(DEFAULT_PAYMENT_SETTINGS);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [guestWishlist, setGuestWishlist] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(GUEST_WISHLIST_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((text: string, tone: 'neutral' | 'success' | 'error' = 'neutral') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, text, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(guestWishlist));
    } catch {
      // ignore
    }
  }, [guestWishlist]);

  const refreshPaymentSettings = useCallback(async () => {
    try {
      const data = await apiRequest<{ paymentSettings: PaymentGatewaySettings }>('/api/storefront');
      if (data.paymentSettings) {
        setPaymentSettings(data.paymentSettings);
      }
    } catch {
      // fallback to defaults
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getStoredToken()) {
      setAuthLoading(false);
      return;
    }
    try {
      const data = await apiRequest<{ user: UserProfile }>('/api/auth/me');
      setUser(data.user);
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
    refreshPaymentSettings();
  }, [refreshUser, refreshPaymentSettings]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiRequest<{ user: UserProfile; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(
    async (payload: { name: string; email: string; password: string; phone?: string }) => {
      const data = await apiRequest<{ user: UserProfile; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setStoredToken(data.token);
      setUser(data.user);
      return data.user;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setStoredToken(null);
    setUser(null);
    notify('Signed out of your account');
  }, [notify]);

  const addToCart = useCallback(
    (
      product: Product,
      quantity = 1,
      options?: { color?: string; size?: string; openDrawer?: boolean }
    ) => {
      if (product.stock <= 0) {
        notify(`${product.name} is currently out of stock.`, 'error');
        return;
      }
      const color = options?.color ?? product.variants.colors[0]?.name;
      const size = options?.size ?? product.variants.sizes[0];
      const unitPrice = product.salePrice ?? product.price;

      setCart((prev) => {
        const idx = prev.findIndex(
          (i) => i.productId === product.id && i.selectedColor === color && i.selectedSize === size
        );
        if (idx > -1) {
          const updated = [...prev];
          const nextQty = Math.min(product.stock, updated[idx].quantity + quantity);
          updated[idx] = { ...updated[idx], quantity: nextQty, unitPrice, maxStock: product.stock };
          return updated;
        }
        return [
          ...prev,
          {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            brand: product.brand,
            imageKey: product.imageKeys[0] || 'studio-headphones',
            unitPrice,
            originalPrice: product.price,
            quantity: Math.min(product.stock, Math.max(1, quantity)),
            maxStock: product.stock,
            selectedColor: color,
            selectedSize: size,
          },
        ];
      });

      if (options?.openDrawer !== false) {
        setCartOpen(true);
      }
      notify(`Added ${product.name} to bag`, 'success');
    },
    [notify]
  );

  const updateCartQuantity = useCallback(
    (productId: string, color: string | undefined, size: string | undefined, quantity: number) => {
      setCart((prev) => {
        if (quantity <= 0) {
          return prev.filter(
            (i) => !(i.productId === productId && i.selectedColor === color && i.selectedSize === size)
          );
        }
        return prev.map((i) =>
          i.productId === productId && i.selectedColor === color && i.selectedSize === size
            ? { ...i, quantity: Math.min(i.maxStock || 99, quantity) }
            : i
        );
      });
    },
    []
  );

  const removeFromCart = useCallback((productId: string, color?: string, size?: string) => {
    setCart((prev) =>
      prev.filter(
        (i) => !(i.productId === productId && i.selectedColor === color && i.selectedSize === size)
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const wishlistIds = user ? user.wishlist : guestWishlist;

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (user) {
        try {
          const data = await apiRequest<{ wishlist: string[]; user: UserProfile }>('/api/wishlist/toggle', {
            method: 'POST',
            body: JSON.stringify({ productId }),
          });
          setUser(data.user);
          const added = data.wishlist.includes(productId);
          notify(added ? 'Saved to your wishlist' : 'Removed from wishlist', 'neutral');
        } catch (err: any) {
          notify(err?.message || 'Could not update wishlist', 'error');
        }
      } else {
        setGuestWishlist((prev) => {
          const exists = prev.includes(productId);
          notify(exists ? 'Removed from wishlist' : 'Saved to wishlist', 'neutral');
          return exists ? prev.filter((id) => id !== productId) : [...prev, productId];
        });
      }
    },
    [user, notify]
  );

  const isWishlisted = useCallback((productId: string) => wishlistIds.includes(productId), [wishlistIds]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = Number(cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2));

  return (
    <StoreContext.Provider
      value={{
        user,
        authLoading,
        login,
        register,
        logout,
        refreshUser,
        cart,
        cartCount,
        cartSubtotal,
        isCartOpen,
        setCartOpen,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        wishlistIds,
        toggleWishlist,
        isWishlisted,
        paymentSettings,
        refreshPaymentSettings,
        notify,
        toasts,
        dismissToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
