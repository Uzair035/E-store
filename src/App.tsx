import React, { useState } from 'react';
import { RouterProvider, useRouter } from './lib/router.tsx';
import { StoreProvider } from './context/StoreContext.tsx';
import { Header } from './components/Header.tsx';
import { Footer } from './components/Footer.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { ToastContainer } from './components/ToastContainer.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { ShopPage } from './pages/ShopPage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { CartPage } from './pages/CartPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { OrderConfirmedPage } from './pages/OrderConfirmedPage.tsx';
import { TrackOrderPage } from './pages/TrackOrderPage.tsx';
import { AccountPage } from './pages/AccountPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';

function AppShell() {
  const { pathname } = useRouter();
  const [announcementText, setAnnouncementText] = useState(
    'Complimentary Express Shipping on orders over $150 · Use code NOVA15 for 15% off'
  );

  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  if (isAdminRoute) {
    return (
      <>
        <AdminPage />
        <ToastContainer />
      </>
    );
  }

  let pageView: React.ReactNode;
  if (pathname === '/' || pathname === '') {
    pageView = <HomePage onAnnouncementLoad={setAnnouncementText} />;
  } else if (pathname === '/shop') {
    pageView = <ShopPage />;
  } else if (pathname.startsWith('/product/')) {
    const slug = decodeURIComponent(pathname.replace('/product/', '').split('/')[0] || '');
    pageView = <ProductDetailPage slug={slug} />;
  } else if (pathname === '/cart') {
    pageView = <CartPage />;
  } else if (pathname === '/checkout') {
    pageView = <CheckoutPage />;
  } else if (pathname.startsWith('/order-confirmed/')) {
    const orderNumber = decodeURIComponent(
      pathname.replace('/order-confirmed/', '').split('/')[0] || ''
    );
    pageView = <OrderConfirmedPage orderNumber={orderNumber} />;
  } else if (pathname === '/track') {
    pageView = <TrackOrderPage />;
  } else if (pathname === '/account') {
    pageView = <AccountPage />;
  } else {
    pageView = <HomePage onAnnouncementLoad={setAnnouncementText} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900">
      <Header announcementText={announcementText} />
      <main className="flex-1">{pageView}</main>
      <Footer />
      <CartDrawer />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    </RouterProvider>
  );
}
