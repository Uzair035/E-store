import heroBannerImg from '../assets/images/hero_flagship_banner_1794660254319.jpg';
import promoAtelierImg from '../assets/images/promo_atelier_collection_1794660256656.jpg';
import headphonesImg from '../assets/images/product_studio_headphones_1794660255540.jpg';
import watchImg from '../assets/images/product_chrono_watch_1794660255737.jpg';
import toteImg from '../assets/images/product_leather_tote_1794660256322.jpg';
import espressoImg from '../assets/images/product_espresso_machine_1794660256686.jpg';
import keyboardImg from '../assets/images/product_mechanical_keyboard_1794660257533.jpg';
import lampImg from '../assets/images/product_ceramic_lamp_1794660256910.jpg';
import sneakersImg from '../assets/images/product_running_sneakers_1794660257159.jpg';
import skincareImg from '../assets/images/product_skincare_set_1794660258167.jpg';

export const PRODUCT_MEDIA_MAP: Record<string, string> = {
  'hero-banner': heroBannerImg,
  'promo-atelier': promoAtelierImg,
  'studio-headphones': headphonesImg,
  'chrono-watch': watchImg,
  'leather-tote': toteImg,
  'espresso-machine': espressoImg,
  'mechanical-keyboard': keyboardImg,
  'ceramic-lamp': lampImg,
  'running-sneakers': sneakersImg,
  'skincare-set': skincareImg,
};

export const MEDIA_KEY_OPTIONS = [
  { key: 'studio-headphones', label: 'Studio Headphones' },
  { key: 'chrono-watch', label: 'Automatic Chronograph' },
  { key: 'leather-tote', label: 'Full-Grain Leather Tote' },
  { key: 'espresso-machine', label: 'PID Espresso Machine' },
  { key: 'mechanical-keyboard', label: 'CNC Mechanical Keyboard' },
  { key: 'ceramic-lamp', label: 'Sculpted Ceramic Lamp' },
  { key: 'running-sneakers', label: 'Technical Knit Sneakers' },
  { key: 'skincare-set', label: 'Botanical Skincare Duo' },
  { key: 'hero-banner', label: 'Flagship Studio Edit' },
  { key: 'promo-atelier', label: 'Workspace Desk Edit' },
];

export function resolveMediaUrl(key?: string): string {
  if (!key) return headphonesImg;
  if (PRODUCT_MEDIA_MAP[key]) return PRODUCT_MEDIA_MAP[key];
  if (key.startsWith('http') || key.startsWith('/')) return key;
  return headphonesImg;
}
