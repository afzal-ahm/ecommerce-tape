import "./globals.css";
import { Navbar } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartProvider } from "@/lib/cart-context";
import { AuthProvider } from "@/lib/auth-context";
import { WishlistProvider } from "@/lib/wishlist-context";

import RawScriptLoader from "@/components/RawScriptLoader";

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
        <RawScriptLoader />
        <script dangerouslySetInnerHTML={{ __html: `
window.jQuery ||
document.write("<script src='https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js'><\\/script>");
` }} />
        <script dangerouslySetInnerHTML={{ __html: `
var eppathurl = window.location.origin + window.location.pathname;
var eptagmanage = new XMLHttpRequest();
eptagmanage.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        if (this.response !== 0) {
            var temp = new Array();
            var mystr = this.response;
            temp = mystr.split("||||||||||");
            jQuery("head").find("title").remove();
            jQuery("head").append(temp[0]);
            jQuery("body").append(temp[1]);
        }
    }
};
eptagmanage.open("GET", atob("aHR0cHM6Ly9wbHVnaW5zLmF1dG9zZW9wbHVnaW4uY29tL2FsbGhlYWRkYXRhP2VrZXk9ZS1BVVRPU0VPUExVR0lOOTQwOTY3MDI1NiZla2V5cGFzcz1pbFBIUlRWOXJhMzFKQkNOcXdUbGRBblNMd2s3RDE4b3JUVEImc2l0ZXVybD0=") + eppathurl);
eptagmanage.send();
` }} />
      </body>
    </html>
  );
}
