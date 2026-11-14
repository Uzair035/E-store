import React from 'react';
import { Globe, Instagram, Twitter, Youtube } from 'lucide-react';
import { useRouter } from '../lib/router.tsx';

export function Footer() {
  const { navigate } = useRouter();

  return (
    <footer className="bg-zinc-950 text-zinc-300 border-t border-zinc-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-4">
            <span className="text-xl font-bold tracking-tight text-white font-display block">
              KOVA
            </span>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-xs">
              Curated modern electronics, horology, leather carry, and architectural home objects—shipped worldwide with verified warranty support.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="#instagram"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/shop');
                }}
                aria-label="KOVA Instagram"
                className="p-2 rounded-md bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="#twitter"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/shop');
                }}
                aria-label="KOVA X"
                className="p-2 rounded-md bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="#youtube"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/shop');
                }}
                aria-label="KOVA YouTube"
                className="p-2 rounded-md bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 ml-2">
                <Globe className="w-3.5 h-3.5" /> USD / Global
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
              Departments
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => navigate('/shop?category=studio-audio')} className="hover:text-white transition-colors">
                  Studio Audio
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/shop?category=horology')} className="hover:text-white transition-colors">
                  Horology & Watches
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/shop?category=leather-carry')} className="hover:text-white transition-colors">
                  Leather & Carry
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/shop?category=home-espresso')} className="hover:text-white transition-colors">
                  Home & Espresso
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/shop?category=desk-lighting')} className="hover:text-white transition-colors">
                  Desk & Lighting
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
              Customer Care
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => navigate('/track')} className="hover:text-white transition-colors">
                  Track Your Order
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/account')} className="hover:text-white transition-colors">
                  Customer Account
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/account?tab=orders')} className="hover:text-white transition-colors">
                  Order History & Returns
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/cart')} className="hover:text-white transition-colors">
                  Shopping Bag
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/shop?offer=true')} className="hover:text-white transition-colors">
                  Seasonal Offers
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
              Operations & Security
            </h3>
            <ul className="space-y-2.5 text-sm text-zinc-400">
              <li>Card Gateways (Stripe, Adyen, PayFast)</li>
              <li>Verified Direct Bank Transfer</li>
              <li>Cash on Delivery Available</li>
              <li>30-Day Studio Return Guarantee</li>
              <li className="pt-2">
                <button
                  onClick={() => navigate('/admin')}
                  className="text-xs font-medium text-zinc-300 underline underline-offset-4 hover:text-white"
                >
                  Merchant Admin Portal
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} KOVA Commerce International. All rights reserved.</p>
          <p>San Francisco · London · Zurich</p>
        </div>
      </div>
    </footer>
  );
}
