import React, { useCallback, useEffect, useState } from 'react';
import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useDocumentMeta, useRouter } from '../lib/router.tsx';
import type { Category, Product } from '../types/ecommerce.ts';
import { ProductCard } from '../components/ProductCard.tsx';

interface ProductsResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  availableBrands: string[];
  categories: Category[];
}

export function ShopPage() {
  const { search, navigate } = useRouter();
  const params = new URLSearchParams(search);

  const [query, setQuery] = useState(params.get('q') || '');
  const [category, setCategory] = useState(params.get('category') || 'all');
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    params.get('brand') ? params.get('brand')!.split(',').filter(Boolean) : []
  );
  const [minPrice, setMinPrice] = useState(params.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') || '');
  const [minRating, setMinRating] = useState(params.get('minRating') || '0');
  const [offerOnly, setOfferOnly] = useState(params.get('offer') === 'true');
  const [tag, setTag] = useState(params.get('tag') || '');
  const [sort, setSort] = useState(params.get('sort') || 'featured');
  const [limit, setLimit] = useState(9);

  const [data, setData] = useState<ProductsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useDocumentMeta(
    'Shop Catalog — KOVA',
    'Filter and explore studio audio, horology, leather goods, espresso hardware, and home lighting.'
  );

  // Sync URL query param changes (e.g. clicking Header nav links)
  useEffect(() => {
    const p = new URLSearchParams(search);
    setQuery(p.get('q') || '');
    setCategory(p.get('category') || 'all');
    setOfferOnly(p.get('offer') === 'true');
    setTag(p.get('tag') || '');
    setLimit(9);
  }, [search]);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (query.trim()) qs.set('q', query.trim());
      if (category && category !== 'all') qs.set('category', category);
      if (selectedBrands.length > 0) qs.set('brand', selectedBrands.join(','));
      if (minPrice) qs.set('minPrice', minPrice);
      if (maxPrice) qs.set('maxPrice', maxPrice);
      if (Number(minRating) > 0) qs.set('minRating', minRating);
      if (offerOnly) qs.set('offer', 'true');
      if (tag) qs.set('tag', tag);
      qs.set('sort', sort);
      qs.set('page', '1');
      qs.set('limit', String(limit));

      const res = await apiRequest<ProductsResponse>(`/api/products?${qs.toString()}`);
      setData(res);
    } catch {
      setData({
        items: [],
        total: 0,
        page: 1,
        limit,
        totalPages: 1,
        availableBrands: [],
        categories: [],
      });
    } finally {
      setLoading(false);
    }
  }, [query, category, selectedBrands, minPrice, maxPrice, minRating, offerOnly, tag, sort, limit]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchCatalog();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [fetchCatalog]);

  const toggleBrand = (brandName: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandName) ? prev.filter((b) => b !== brandName) : [...prev, brandName]
    );
  };

  const resetFilters = () => {
    setQuery('');
    setCategory('all');
    setSelectedBrands([]);
    setMinPrice('');
    setMaxPrice('');
    setMinRating('0');
    setOfferOnly(false);
    setTag('');
    setSort('featured');
    setLimit(9);
    navigate('/shop', true);
  };

  const filterPanel = (
    <div className="space-y-7">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Categories
        </h3>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
              category === 'all'
                ? 'bg-zinc-900 text-white font-medium'
                : 'text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            All Departments
          </button>
          {(data?.categories || []).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.slug)}
              className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                category === cat.slug
                  ? 'bg-zinc-900 text-white font-medium'
                  : 'text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-5 border-t border-zinc-200">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Price Range ($)
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm font-mono border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
          />
          <input
            type="number"
            min="0"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm font-mono border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {[
            { label: 'Under $200', min: '', max: '200' },
            { label: '$200–$500', min: '200', max: '500' },
            { label: '$500+', min: '500', max: '' },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setMinPrice(preset.min);
                setMaxPrice(preset.max);
              }}
              className="px-2.5 py-1 text-xs border border-zinc-200 rounded-md text-zinc-700 hover:bg-zinc-100"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-5 border-t border-zinc-200">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Brands
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {(data?.availableBrands || []).map((brandName) => (
            <label key={brandName} className="flex items-center gap-2.5 text-sm text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedBrands.includes(brandName)}
                onChange={() => toggleBrand(brandName)}
                className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
              />
              <span>{brandName}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-5 border-t border-zinc-200">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          Minimum Rating
        </h3>
        <div className="space-y-1.5">
          {[
            { value: '0', label: 'All Ratings' },
            { value: '4.8', label: '4.8 Stars & Up' },
            { value: '4.5', label: '4.5 Stars & Up' },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2.5 text-sm text-zinc-700 cursor-pointer">
              <input
                type="radio"
                name="minRating"
                checked={minRating === opt.value}
                onChange={() => setMinRating(opt.value)}
                className="text-zinc-900 focus:ring-zinc-900"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-5 border-t border-zinc-200 space-y-3">
        <label className="flex items-center gap-2.5 text-sm font-medium text-zinc-800 cursor-pointer">
          <input
            type="checkbox"
            checked={offerOnly}
            onChange={(e) => setOfferOnly(e.target.checked)}
            className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
          />
          <span>Special Offers & Sale Only</span>
        </label>

        <button
          type="button"
          onClick={resetFilters}
          className="w-full px-3 py-2 text-xs font-medium border border-zinc-300 rounded-md text-zinc-700 hover:bg-zinc-100"
        >
          Reset All Filters
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            KOVA Catalog
          </p>
          <h1 className="text-3xl font-bold text-zinc-900 mt-1">
            {offerOnly
              ? 'Special Offers'
              : tag === 'new'
              ? 'New Arrivals'
              : category !== 'all'
              ? data?.categories.find((c) => c.slug === category)?.name || 'Department'
              : 'All Products'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, SKU..."
              className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm border border-zinc-300 rounded-md focus:outline-none focus:border-zinc-900"
            />
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort products"
            className="px-3 py-2 text-sm border border-zinc-300 rounded-md bg-white focus:outline-none focus:border-zinc-900"
          >
            <option value="featured">Sort: Featured</option>
            <option value="newest">Sort: Newest</option>
            <option value="rating">Sort: Popularity & Rating</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>

          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium border border-zinc-300 rounded-md bg-white"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="hidden lg:block lg:col-span-3 pr-4 border-r border-zinc-200">
          {filterPanel}
        </aside>

        <div className="lg:col-span-9">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-5">
            <span className="font-mono tabular-nums">
              Showing {data?.items.length ?? 0} of {data?.total ?? 0} products
            </span>
            {(query || category !== 'all' || selectedBrands.length > 0 || offerOnly || tag) && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-zinc-900 font-medium hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
                  <div className="aspect-[4/3] bg-zinc-100 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-3 w-20 bg-zinc-100 animate-pulse rounded" />
                    <div className="h-5 w-4/5 bg-zinc-100 animate-pulse rounded" />
                    <div className="h-8 w-full bg-zinc-100 animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (data?.items.length || 0) === 0 ? (
            <div className="border border-zinc-200 rounded-lg p-12 text-center bg-zinc-50">
              <Filter className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
              <h2 className="text-base font-semibold text-zinc-900">No matching products found</h2>
              <p className="text-sm text-zinc-500 mt-1 mb-5">
                Try adjusting your price range, brand selection, or search query.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-5 py-2 text-sm font-medium bg-zinc-900 text-white rounded-md hover:bg-zinc-800"
              >
                Show All Products
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {data?.items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {data && data.items.length < data.total && (
                <div className="mt-10 text-center">
                  <button
                    type="button"
                    onClick={() => setLimit((prev) => prev + 6)}
                    className="px-6 py-2.5 text-sm font-medium border border-zinc-300 bg-white text-zinc-900 rounded-md hover:bg-zinc-50"
                  >
                    Load More Products ({data.total - data.items.length} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-zinc-950/40" onClick={() => setMobileFiltersOpen(false)} />
          <div className="relative z-10 w-80 max-w-full bg-white h-full overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-zinc-200">
              <h2 className="text-base font-semibold text-zinc-900">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="p-1.5 text-zinc-500 hover:text-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {filterPanel}
          </div>
        </div>
      )}
    </div>
  );
}
