import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, ShieldCheck, Star, Truck, RefreshCw } from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useDocumentMeta, useRouter } from '../lib/router.tsx';
import { useStore } from '../context/StoreContext.tsx';
import type { Banner, Category, Product, Review } from '../types/ecommerce.ts';
import { MediaImage } from '../components/MediaImage.tsx';
import { ProductCard } from '../components/ProductCard.tsx';

interface StorefrontResponse {
  banners: Banner[];
  categories: (Category & { productCount?: number })[];
  trending: Product[];
  bestSellers: Product[];
  newArrivals: Product[];
  specialOffers: Product[];
  reviews: Review[];
}

type ShowcaseTab = 'trending' | 'bestsellers' | 'new' | 'offers';

export function HomePage({ onAnnouncementLoad }: { onAnnouncementLoad?: (text: string) => void }) {
  useDocumentMeta(
    'KOVA — Curated Modern Commerce',
    'Shop studio audio, Swiss horology, leather carry, espresso hardware, and architectural home goods.'
  );

  const { navigate } = useRouter();
  const { notify } = useStore();
  const [data, setData] = useState<StorefrontResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('trending');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    let mounted = true;
    apiRequest<StorefrontResponse>('/api/storefront')
      .then((res) => {
        if (!mounted) return;
        setData(res);
        const announcement = res.banners.find((b) => b.slot === 'announcement');
        if (announcement && onAnnouncementLoad) {
          onAnnouncementLoad(announcement.title);
        }
      })
      .catch(() => {
        // handled cleanly with empty/error fallback
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [onAnnouncementLoad]);

  const heroBanner = data?.banners.find((b) => b.slot === 'hero');
  const promoBanner = data?.banners.find((b) => b.slot === 'promo');

  const tabProducts: Product[] = !data
    ? []
    : activeTab === 'trending'
    ? data.trending
    : activeTab === 'bestsellers'
    ? data.bestSellers
    : activeTab === 'new'
    ? data.newArrivals
    : data.specialOffers;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText('KOVA15').catch(() => {});
    setCopiedCode(true);
    notify('Copied promo code KOVA15', 'success');
    window.setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterSubmitting(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email: newsletterEmail }),
      });
      setNewsletterSubscribed(true);
      setNewsletterEmail('');
      notify(res.message, 'success');
    } catch (err: any) {
      notify(err?.message || 'Unable to subscribe right now.', 'error');
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  return (
    <div>
      {/* 1. Promotional Storefront Hero */}
      <section className="relative bg-zinc-50 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
                {heroBanner?.kicker || '2026 Studio & Living Collection'}
              </p>
              <h1
                className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900 leading-[1.08]"
                style={{ textWrap: 'balance' }}
              >
                {heroBanner?.title || 'Precision objects crafted for daily work and quiet rituals.'}
              </h1>
              <p className="text-base text-zinc-600 leading-relaxed max-w-xl">
                {heroBanner?.subtitle ||
                  'Discover reference wireless acoustics, Swiss automatic horology, full-grain carry, and PID home espresso hardware—shipped globally.'}
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(heroBanner?.ctaHref || '/shop')}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                >
                  <span>{heroBanner?.ctaText || 'Explore Collection'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/shop?offer=true')}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-zinc-900 bg-white border border-zinc-300 rounded-md hover:bg-zinc-100 transition-colors whitespace-nowrap shrink-0"
                >
                  Seasonal Offers
                </button>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="aspect-[16/9] lg:h-full w-full rounded-xl overflow-hidden border border-zinc-200 bg-zinc-200">
                <MediaImage
                  imageKey={heroBanner?.imageKey || 'hero-banner'}
                  alt="KOVA Curated Studio Collection"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* 4-column Service Assurance Strip */}
          <div className="mt-10 pt-8 border-t border-zinc-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <Truck className="w-5 h-5 text-zinc-700 shrink-0 mt-0.5" strokeWidth={1.6} />
              <div>
                <p className="text-sm font-semibold text-zinc-900">Free Shipping Over $150</p>
                <p className="text-xs text-zinc-500 mt-0.5">Express tracked global dispatch</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-zinc-700 shrink-0 mt-0.5" strokeWidth={1.6} />
              <div>
                <p className="text-sm font-semibold text-zinc-900">3-Year Hardware Warranty</p>
                <p className="text-xs text-zinc-500 mt-0.5">Direct manufacturer coverage</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-zinc-700 shrink-0 mt-0.5" strokeWidth={1.6} />
              <div>
                <p className="text-sm font-semibold text-zinc-900">30-Day Studio Trial</p>
                <p className="text-xs text-zinc-500 mt-0.5">Hassle-free returns & exchanges</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Star className="w-5 h-5 text-zinc-700 shrink-0 mt-0.5" strokeWidth={1.6} />
              <div>
                <p className="text-sm font-semibold text-zinc-900">Flexible Payment Options</p>
                <p className="text-xs text-zinc-500 mt-0.5">Card, Bank Transfer & COD</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Departments</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-1">Shop by Category</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="text-sm font-medium text-zinc-900 hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            All Categories <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {(data?.categories || []).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/shop?category=${cat.slug}`)}
              className="group text-left bg-white border border-zinc-200 rounded-lg overflow-hidden hover:border-zinc-400 transition-all hover:-translate-y-0.5"
            >
              <div className="aspect-[4/3] w-full bg-zinc-100 overflow-hidden">
                <MediaImage
                  imageKey={cat.imageKey}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-zinc-900 truncate">{cat.name}</h3>
                <p className="text-xs text-zinc-500 mt-0.5 font-mono tabular-nums">
                  {cat.productCount ?? 0} items
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Curated Collections Showcase (Trending, Best Sellers, New Arrivals, Special Offers) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-zinc-200 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Curated Catalog</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-1">Featured Selections</h2>
          </div>

          <div
            className="inline-flex items-center gap-1 p-1 bg-zinc-100 rounded-lg overflow-x-auto max-w-full"
            role="tablist"
            aria-label="Product collections"
          >
            {(
              [
                { id: 'trending', label: 'Trending' },
                { id: 'bestsellers', label: 'Best Sellers' },
                { id: 'new', label: 'New Arrivals' },
                { id: 'offers', label: 'Special Offers' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
                <div className="aspect-[4/3] bg-zinc-100 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-3 w-24 bg-zinc-100 animate-pulse rounded" />
                  <div className="h-5 w-3/4 bg-zinc-100 animate-pulse rounded" />
                  <div className="h-8 w-full bg-zinc-100 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tabProducts.slice(0, 6).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() =>
              navigate(
                activeTab === 'offers'
                  ? '/shop?offer=true'
                  : activeTab === 'new'
                  ? '/shop?tag=new'
                  : '/shop'
              )
            }
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium border border-zinc-300 bg-white text-zinc-900 rounded-md hover:bg-zinc-50 transition-colors"
          >
            View Full Collection <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 4. Special Discount Offer Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="bg-zinc-900 text-white rounded-xl overflow-hidden border border-zinc-800 grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-400">
              {promoBanner?.kicker || 'Seasonal Workspace Edit'}
            </p>
            <h2
              className="text-2xl sm:text-3xl font-bold leading-tight text-white"
              style={{ textWrap: 'balance' }}
            >
              {promoBanner?.title || 'Upgrade the modern studio desk and save 15% with code KOVA15.'}
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed max-w-lg">
              {promoBanner?.subtitle ||
                'Valid on orders over $150 across Studio Audio, Horology, Espresso, and Desk Lighting.'}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(promoBanner?.ctaHref || '/shop?offer=true')}
                className="px-5 py-2.5 text-sm font-medium bg-white text-zinc-900 rounded-md hover:bg-zinc-100 transition-colors whitespace-nowrap shrink-0"
              >
                {promoBanner?.ctaText || 'Shop Offers'}
              </button>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-mono bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-md hover:bg-zinc-700 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Code: KOVA15</span>
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="lg:col-span-6 aspect-[16/9] lg:aspect-auto">
            <MediaImage
              imageKey={promoBanner?.imageKey || 'promo-atelier'}
              alt="KOVA Workspace Collection"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* 5. Verified Customer Reviews + Newsletter */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Verified Owners</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-1">Customer Reviews</h2>
          </div>
          <p className="text-sm text-zinc-600 font-mono tabular-nums">
            4.8 / 5.0 Average Rating · 236+ Verified Reviews
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {(data?.reviews || []).slice(0, 4).map((rev) => (
            <div
              key={rev.id}
              className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: rev.rating }).map((_, idx) => (
                    <Star key={idx} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 mb-1.5">{rev.title}</h3>
                <p className="text-xs text-zinc-600 leading-relaxed line-clamp-4">{rev.comment}</p>
              </div>
              <div className="pt-3 border-t border-zinc-200">
                <p className="text-xs font-semibold text-zinc-900">{rev.authorName}</p>
                <p className="text-xs text-zinc-500 truncate">{rev.authorLocation}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Newsletter Subscription */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-8 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-lg">
            <h2 className="text-xl font-bold text-zinc-900">Subscribe to KOVA Dispatches</h2>
            <p className="text-sm text-zinc-600 mt-1">
              Receive early access to small-batch hardware drops, seasonal discounts, and member-only offers.
            </p>
          </div>
          <form onSubmit={handleNewsletterSubmit} className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full sm:w-72 px-4 py-2.5 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
            />
            <button
              type="submit"
              disabled={newsletterSubmitting}
              className="px-6 py-2.5 text-sm font-medium bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
            >
              {newsletterSubscribed ? 'Subscribed' : newsletterSubmitting ? 'Saving...' : 'Subscribe'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
