import React, { useState } from 'react';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { useRouter } from '../lib/router.tsx';

interface HeaderProps {
  announcementText?: string;
}

export function Header({ announcementText }: HeaderProps) {
  const { pathname, navigate } = useRouter();
  const { user, cartCount, wishlistIds, setCartOpen } = useStore();
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setSearchOpen(false);
    setMobileMenuOpen(false);
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  };

  const navItems = [
    { label: 'Shop All', href: '/shop' },
    { label: 'New Arrivals', href: '/shop?tag=new' },
    { label: 'Special Offers', href: '/shop?offer=true' },
    { label: 'Track Order', href: '/track' },
    { label: 'Admin', href: '/admin' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200">
      {showAnnouncement && announcementText && (
        <div className="bg-zinc-900 text-zinc-100 text-xs h-9 px-4 flex items-center justify-between">
          <div className="w-6 hidden sm:block" />
          <p className="truncate text-center font-medium tracking-wide">
            {announcementText}
          </p>
          <button
            type="button"
            onClick={() => setShowAnnouncement(false)}
            aria-label="Dismiss promotion banner"
            className="p-1 text-zinc-400 hover:text-white transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-2 -ml-2 text-zinc-700 hover:text-zinc-900"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xl font-bold tracking-tight text-zinc-900 font-display whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 rounded"
          >
            NOVA
          </button>
        </div>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600" aria-label="Main Navigation">
          {navItems.map((item) => {
            const active =
              item.href === '/shop'
                ? pathname === '/shop'
                : pathname === item.href.split('?')[0];
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.href)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
                  active
                    ? 'border-zinc-900 text-zinc-900'
                    : 'border-transparent hover:text-zinc-900 hover:border-zinc-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Search, Wishlist, Account & Primary Bag Action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {searchOpen ? (
            <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center">
              <div className="relative">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  autoFocus
                  className="w-48 lg:w-64 pl-3 pr-8 py-1.5 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Close search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search catalog"
              className="p-2 text-zinc-600 hover:text-zinc-900 rounded-md hover:bg-zinc-100 transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/account?tab=wishlist')}
            aria-label="Wishlist"
            className="relative p-2 text-zinc-600 hover:text-zinc-900 rounded-md hover:bg-zinc-100 transition-colors hidden sm:inline-flex"
          >
            <Heart className="w-4 h-4" />
            {wishlistIds.length > 0 && (
              <span className="ml-1 text-xs font-mono tabular-nums text-zinc-700">
                {wishlistIds.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/account')}
            aria-label="Customer account"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 rounded-md hover:bg-zinc-100 transition-colors whitespace-nowrap shrink-0"
          >
            <User className="w-4 h-4" />
            <span className="hidden lg:inline">{user ? user.name.split(' ')[0] : 'Account'}</span>
          </button>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-zinc-900 rounded-md hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="font-mono tabular-nums">Bag ({cartCount})</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 bg-white px-4 py-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, brands..."
              className="flex-1 px-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-zinc-900 text-white rounded-md"
            >
              Search
            </button>
          </form>
          <div className="flex flex-col divide-y divide-zinc-100">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate(item.href);
                }}
                className="py-3 text-left text-sm font-medium text-zinc-800 hover:text-zinc-900"
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/account?tab=wishlist');
              }}
              className="py-3 text-left text-sm font-medium text-zinc-800 hover:text-zinc-900"
            >
              Wishlist ({wishlistIds.length})
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
