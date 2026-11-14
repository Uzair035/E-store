import React from 'react';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { useRouter } from '../lib/router.tsx';
import type { Product } from '../types/ecommerce.ts';
import { MediaImage } from './MediaImage.tsx';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { navigate } = useRouter();
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const wishlisted = isWishlisted(product.id);

  const effectivePrice = product.salePrice ?? product.price;
  const discountPct =
    product.salePrice !== null && product.salePrice < product.price
      ? Math.round(((product.price - product.salePrice) / product.price) * 100)
      : 0;

  return (
    <article className="group flex flex-col bg-white border border-zinc-200/80 rounded-lg overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100">
        <button
          type="button"
          onClick={() => navigate(`/product/${product.slug}`)}
          className="block w-full h-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
          aria-label={`View ${product.name}`}
        >
          <MediaImage
            imageKey={product.imageKeys[0]}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </button>

        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className="absolute top-3 right-3 w-9 h-9 rounded-md bg-white/90 backdrop-blur-sm border border-zinc-200 flex items-center justify-center text-zinc-700 hover:text-zinc-900 hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
        >
          <Heart
            className={`w-4 h-4 ${wishlisted ? 'fill-zinc-900 text-zinc-900' : 'text-zinc-600'}`}
            strokeWidth={1.75}
          />
        </button>
      </div>

      <div className="flex flex-col flex-1 p-4 justify-between gap-3">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 mb-1.5">
            <span className="truncate font-medium tracking-wide uppercase">
              {product.brand} <span aria-hidden="true">·</span> {product.categoryName}
            </span>
            {product.stock <= 5 && product.stock > 0 && (
              <span className="text-amber-700 font-medium whitespace-nowrap shrink-0">
                {product.stock} left
              </span>
            )}
            {product.stock === 0 && (
              <span className="text-red-700 font-medium whitespace-nowrap shrink-0">Sold out</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate(`/product/${product.slug}`)}
            className="text-left block w-full focus-visible:outline-none focus-visible:underline"
          >
            <h3 className="text-[15px] font-semibold text-zinc-900 leading-snug line-clamp-2 group-hover:text-zinc-700 transition-colors">
              {product.name}
            </h3>
          </button>
        </div>

        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold text-zinc-900 font-mono tabular-nums">
                ${effectivePrice.toFixed(2)}
              </span>
              {discountPct > 0 && (
                <>
                  <span className="text-xs text-zinc-400 line-through font-mono tabular-nums">
                    ${product.price.toFixed(2)}
                  </span>
                  <span className="text-xs font-medium text-amber-700 font-mono tabular-nums">
                    -{discountPct}%
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-zinc-500 mt-0.5">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span className="font-mono tabular-nums font-medium text-zinc-700">
                {product.rating.toFixed(1)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">({product.reviewCount})</span>
            </div>
          </div>

          <button
            type="button"
            disabled={product.stock === 0}
            onClick={() => addToCart(product, 1)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{product.stock === 0 ? 'Sold Out' : 'Add'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
