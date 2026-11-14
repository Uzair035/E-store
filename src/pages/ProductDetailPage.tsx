import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  ZoomIn,
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useDocumentMeta, useRouter } from '../lib/router.tsx';
import { useStore } from '../context/StoreContext.tsx';
import type { Product, Review } from '../types/ecommerce.ts';
import { MediaImage } from '../components/MediaImage.tsx';
import { ProductCard } from '../components/ProductCard.tsx';

interface ProductDetailResponse {
  product: Product;
  reviews: Review[];
  related: Product[];
}

export function ProductDetailPage({ slug }: { slug: string }) {
  const { navigate } = useRouter();
  const { user, addToCart, toggleWishlist, isWishlisted, notify } = useStore();

  const [data, setData] = useState<ProductDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  // Review form state
  const [revRating, setRevRating] = useState(5);
  const [revTitle, setRevTitle] = useState('');
  const [revComment, setRevComment] = useState('');
  const [revLocation, setRevLocation] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useDocumentMeta(
    data ? `${data.product.name} — NOVA` : 'Product Details — NOVA',
    data?.product.shortDescription || 'Explore specifications and verified reviews at NOVA.'
  );

  useEffect(() => {
    setLoading(true);
    setError('');
    setActiveImageIdx(0);
    setQuantity(1);
    apiRequest<ProductDetailResponse>(`/api/products/${encodeURIComponent(slug)}`)
      .then((res) => {
        setData(res);
        setSelectedColor(res.product.variants.colors[0]?.name || '');
        setSelectedSize(res.product.variants.sizes[0] || '');
      })
      .catch((err: any) => {
        setError(err?.message || 'Product not found');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    if (!user) {
      notify('Please sign in to submit a verified review.', 'error');
      navigate('/account');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await apiRequest<{ review: Review; product: Product }>(
        `/api/products/${data.product.id}/reviews`,
        {
          method: 'POST',
          body: JSON.stringify({
            rating: revRating,
            title: revTitle,
            comment: revComment,
            authorLocation: revLocation || 'Verified Customer',
          }),
        }
      );
      setData((prev) =>
        prev
          ? {
              ...prev,
              product: res.product,
              reviews: [res.review, ...prev.reviews],
            }
          : prev
      );
      setRevTitle('');
      setRevComment('');
      setRevLocation('');
      notify('Thank you — your review is now live.', 'success');
    } catch (err: any) {
      notify(err?.message || 'Failed to publish review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 aspect-[4/3] bg-zinc-100 animate-pulse rounded-xl" />
        <div className="lg:col-span-5 space-y-4">
          <div className="h-4 w-32 bg-zinc-100 animate-pulse rounded" />
          <div className="h-9 w-3/4 bg-zinc-100 animate-pulse rounded" />
          <div className="h-24 w-full bg-zinc-100 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Product Unavailable</h1>
        <p className="text-sm text-zinc-600 mb-6">{error || 'We could not find the requested product.'}</p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-5 py-2.5 text-sm font-medium bg-zinc-900 text-white rounded-md"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const { product, reviews, related } = data;
  const effectivePrice = product.salePrice ?? product.price;
  const discountPct =
    product.salePrice !== null && product.salePrice < product.price
      ? Math.round(((product.price - product.salePrice) / product.price) * 100)
      : 0;
  const wishlisted = isWishlisted(product.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-zinc-500 mb-8" aria-label="Breadcrumb">
        <button onClick={() => navigate('/')} className="hover:text-zinc-900">
          Home
        </button>
        <span aria-hidden="true">/</span>
        <button
          onClick={() => navigate(`/shop?category=${product.categorySlug}`)}
          className="hover:text-zinc-900"
        >
          {product.categoryName}
        </button>
        <span aria-hidden="true">/</span>
        <span className="text-zinc-900 font-medium truncate">{product.name}</span>
      </nav>

      {/* Main Split: Sticky Gallery + Contiguous Purchase Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        {/* Left Gallery with Image Zoom */}
        <div className="lg:col-span-7 lg:sticky lg:top-24 space-y-4">
          <div
            className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 cursor-zoom-in select-none"
            onMouseEnter={() => setZoomActive(true)}
            onMouseLeave={() => setZoomActive(false)}
            onMouseMove={handleMouseMove}
            onClick={() => setZoomActive((z) => !z)}
          >
            <div
              className="w-full h-full transition-transform duration-150 ease-out"
              style={{
                transform: zoomActive ? 'scale(1.85)' : 'scale(1)',
                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
              }}
            >
              <MediaImage
                imageKey={product.imageKeys[activeImageIdx] || product.imageKeys[0]}
                alt={`${product.name} view ${activeImageIdx + 1}`}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="absolute bottom-3 right-3 px-2.5 py-1.5 rounded-md bg-white/90 backdrop-blur-sm border border-zinc-200 text-xs text-zinc-700 inline-flex items-center gap-1.5 pointer-events-none">
              <ZoomIn className="w-3.5 h-3.5" />
              <span>{zoomActive ? 'Zoom Active' : 'Hover to Zoom'}</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {product.imageKeys.map((imgKey, idx) => (
              <button
                key={`${imgKey}-${idx}`}
                type="button"
                onClick={() => setActiveImageIdx(idx)}
                className={`aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${
                  activeImageIdx === idx
                    ? 'border-zinc-900'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <MediaImage
                  imageKey={imgKey}
                  alt={`${product.name} thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right Purchase Module */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3 pb-6 border-b border-zinc-200">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span className="uppercase tracking-wider font-semibold">
                {product.brand} <span aria-hidden="true">·</span> {product.sku}
              </span>
              <span className={product.stock > 0 ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>
                {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 leading-tight">
              {product.name}
            </h1>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(product.rating)
                        ? 'fill-amber-500 text-amber-500'
                        : 'text-zinc-300'
                    }`}
                  />
                ))}
              </div>
              <a href="#reviews" className="text-xs text-zinc-600 hover:underline font-mono tabular-nums">
                {product.rating.toFixed(1)} · {product.reviewCount} reviews
              </a>
            </div>

            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-2xl font-bold text-zinc-900 font-mono tabular-nums">
                ${effectivePrice.toFixed(2)}
              </span>
              {discountPct > 0 && (
                <>
                  <span className="text-base text-zinc-400 line-through font-mono tabular-nums">
                    ${product.price.toFixed(2)}
                  </span>
                  <span className="text-xs font-semibold text-amber-700 font-mono tabular-nums">
                    Save {discountPct}%
                  </span>
                </>
              )}
            </div>

            <p className="text-sm text-zinc-600 leading-relaxed pt-1">{product.description}</p>
          </div>

          {/* Variants */}
          <div className="space-y-4">
            {product.variants.colors.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                  Finish: <span className="text-zinc-900">{selectedColor}</span>
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {product.variants.colors.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setSelectedColor(c.name)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                        selectedColor === c.name
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-black/20"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.variants.sizes.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                  Edition / Size
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`px-3.5 py-2 text-xs font-medium rounded-md border transition-colors ${
                        selectedSize === size
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Actions */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center border border-zinc-300 rounded-md bg-white">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-3 text-zinc-600 hover:text-zinc-900"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 text-sm font-mono tabular-nums font-semibold text-zinc-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQuantity((q) => Math.min(Math.max(1, product.stock), q + 1))}
                    className="p-3 text-zinc-600 hover:text-zinc-900"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={product.stock === 0}
                  onClick={() =>
                    addToCart(product, quantity, { color: selectedColor, size: selectedSize })
                  }
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-500 transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{product.stock === 0 ? 'Out of Stock' : 'Add to Bag'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  aria-label="Toggle wishlist"
                  className={`p-3 rounded-md border transition-colors ${
                    wishlisted
                      ? 'border-zinc-900 bg-zinc-100 text-zinc-900'
                      : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${wishlisted ? 'fill-zinc-900' : ''}`} />
                </button>
              </div>

              <button
                type="button"
                disabled={product.stock === 0}
                onClick={() => {
                  addToCart(product, quantity, {
                    color: selectedColor,
                    size: selectedSize,
                    openDrawer: false,
                  });
                  navigate('/checkout');
                }}
                className="w-full px-6 py-3 text-sm font-semibold border border-zinc-900 text-zinc-900 bg-white rounded-md hover:bg-zinc-50 disabled:opacity-40 transition-colors"
              >
                Buy Now — Express Checkout
              </button>
            </div>
          </div>

          {/* Delivery & Specifications */}
          <div className="pt-5 border-t border-zinc-200 space-y-3 text-xs text-zinc-600">
            <div className="flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-zinc-700 shrink-0" />
              <span>Free standard delivery over $150 · Express DHL & FedEx available</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-zinc-700 shrink-0" />
              <span>Supports Card Gateway, Direct Bank Transfer, and Cash on Delivery</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-zinc-700 shrink-0" />
              <span>30-day studio trial and full manufacturer warranty</span>
            </div>
          </div>

          {product.specs.length > 0 && (
            <div className="pt-5 border-t border-zinc-200">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Technical Specifications
              </h2>
              <dl className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg bg-zinc-50">
                {product.specs.map((spec) => (
                  <div key={spec.label} className="px-4 py-2.5 flex justify-between gap-4 text-xs">
                    <dt className="text-zinc-500 font-medium">{spec.label}</dt>
                    <dd className="text-zinc-900 text-right font-mono tabular-nums">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Customer Reviews + Write Review */}
      <section id="reviews" className="mt-16 pt-12 border-t border-zinc-200">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <h2 className="text-2xl font-bold text-zinc-900">Customer Reviews</h2>
            <p className="text-sm text-zinc-600 mt-1">
              {product.rating.toFixed(1)} out of 5 stars based on {reviews.length} published reviews.
            </p>

            <form
              onSubmit={handleReviewSubmit}
              className="mt-6 p-5 bg-zinc-50 border border-zinc-200 rounded-lg space-y-4"
            >
              <h3 className="text-sm font-semibold text-zinc-900">Write a Review</h3>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">Rating</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRevRating(r)}
                      className="p-1"
                      aria-label={`Rate ${r} stars`}
                    >
                      <Star
                        className={`w-5 h-5 ${
                          r <= revRating ? 'fill-amber-500 text-amber-500' : 'text-zinc-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Review Title</label>
                <input
                  type="text"
                  required
                  value={revTitle}
                  onChange={(e) => setRevTitle(e.target.value)}
                  placeholder="Summarize your experience"
                  className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Role or City (optional)
                </label>
                <input
                  type="text"
                  value={revLocation}
                  onChange={(e) => setRevLocation(e.target.value)}
                  placeholder="e.g. Designer, Zurich"
                  className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Review Details</label>
                <textarea
                  required
                  rows={3}
                  value={revComment}
                  onChange={(e) => setRevComment(e.target.value)}
                  placeholder="Share build quality, ergonomics, or performance notes..."
                  className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
                />
              </div>
              <button
                type="submit"
                disabled={submittingReview}
                className="w-full px-4 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-50"
              >
                {user ? (submittingReview ? 'Publishing...' : 'Publish Review') : 'Sign In to Review'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {reviews.length === 0 ? (
              <div className="p-8 border border-zinc-200 rounded-lg text-center text-sm text-zinc-500">
                No reviews published yet for this item. Be the first to review it.
              </div>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="p-5 border border-zinc-200 rounded-lg bg-white space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      ))}
                    </div>
                    <span className="text-xs text-zinc-400 font-mono tabular-nums">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-900">{rev.title}</h4>
                  <p className="text-sm text-zinc-600 leading-relaxed">{rev.comment}</p>
                  <div className="pt-2 text-xs text-zinc-500 flex items-center gap-2">
                    <span className="font-medium text-zinc-800">{rev.authorName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{rev.authorLocation}</span>
                    {rev.verifiedPurchase && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-700 font-medium">Verified Purchase</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-16 pt-12 border-t border-zinc-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-zinc-900">Related Objects</h2>
            <button
              onClick={() => navigate('/shop')}
              className="text-sm font-medium text-zinc-700 hover:text-zinc-900 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Catalog
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
