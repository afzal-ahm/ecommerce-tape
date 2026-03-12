import "./globals.css";
import { Navbar } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartProvider } from "@/lib/cart-context";
import { AuthProvider } from "@/lib/auth-context";

import { WishlistProvider } from "@/lib/wishlist-context";

export const metadata = {
  title: "DfixKart | Premium Quality Products - Shop Online",
  description: "Discover premium quality products at DfixKart. Fast delivery, secure payments, and 100% genuine products. Your trusted online shopping destination.",
  keywords: "DfixKart, online shopping, premium products, quality products, fast delivery, secure payment, India",
  authors: [{ name: "DfixKart" }],
  openGraph: {
    title: "DfixKart | Premium Quality Products - Shop Online",
    description: "Discover premium quality products at DfixKart. Fast delivery, secure payments, and 100% genuine products.",
    type: "website",
    locale: "en_IN",
    siteName: "DfixKart",
  },
  icons: {
    icon: "/dlogo.png?v=2",
    shortcut: "/dlogo.png?v=2",
    apple: "/dlogo.png?v=2",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <Navbar />
              <main className="min-h-screen">
                {children}
              </main>
              <Footer />
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
