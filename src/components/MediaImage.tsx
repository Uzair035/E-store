import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { resolveMediaUrl } from '../lib/productMedia.ts';

interface MediaImageProps {
  imageKey?: string;
  alt: string;
  className?: string;
  aspectClass?: string;
}

export function MediaImage({ imageKey, alt, className = '', aspectClass = '' }: MediaImageProps) {
  const [failed, setFailed] = useState(false);
  const src = resolveMediaUrl(imageKey);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-500 p-4 text-center ${aspectClass} ${className}`}
        role="img"
        aria-label={alt}
      >
        <Package className="w-7 h-7 mb-2 text-zinc-400" strokeWidth={1.5} />
        <span className="text-xs font-medium text-zinc-600 line-clamp-2 max-w-[180px]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${aspectClass} ${className}`}
    />
  );
}
