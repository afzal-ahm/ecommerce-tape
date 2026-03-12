"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useState, useEffect, useRef } from "react";
import {
  ShoppingCart,
  User,
  Menu,
  X,
  Search,
  Heart,
  ChevronDown,
  Phone,
  Shield,
  Truck,
  LogOut,
  MapPin,
  Package as PackageIcon,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";
import { fetchApi, cn, formatCurrency } from "@/lib/utils";
import { ClientOnly } from "@/components/client-only";
import Image from "next/image";
import { toast, Toaster } from "sonner";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { cart, getCartItemCount } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showResults, setShowResults] = useState(false);

  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const navbarRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsSearchOpen(false);
    setActiveDropdown(null);
  }, [pathname]);

  // Fetch Categories for Mobile Menu
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetchApi("/public/categories");
        setCategories(response.data.categories || []);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
  }, []);

  // Real-time Search Logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const response = await fetchApi(`/public/products?search=${encodeURIComponent(searchQuery)}&limit=5`);
          if (response.data?.products) {
            setSearchResults(response.data.products);
            setShowResults(true);
          }
        } catch (error) {
          console.error("Search failed:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
        setSelectedIndex(-1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleKeyDown = (e) => {
    if (!showResults || searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      const product = searchResults[selectedIndex];
      router.push(`/products/${product.slug || product._id}`);
      setShowResults(false);
      setSearchQuery("");
    } else if (e.key === "Escape") {
      setShowResults(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    router.push("/");
  };

  return (
    <>
      <header ref={navbarRef} className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)]">
        <Toaster position="top-center" richColors />

        {/* Top Bar - Premium Black */}
        <div className="bg-[#1A1A1A] text-white text-[11px] font-medium py-2 px-4 hidden lg:block tracking-wide">
          <div className="section-container flex justify-between items-center">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2 font-sans opacity-90 tracking-tight"><Truck className="w-3.5 h-3.5 text-[#F7941D]" /> Free Shipping on ₹999+</span>
              <span className="flex items-center gap-2 font-sans opacity-90 tracking-tight"><Shield className="w-3.5 h-3.5 text-[#F7941D]" /> 100% Genuine Products</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="tel:+918851907674" className="hover:text-[#F7941D] transition-colors flex items-center gap-2 font-sans opacity-90 tracking-tight transition-all"><Phone className="w-3.5 h-3.5" /> +91 88519 07674</a>
            </div>
          </div>
        </div>

        {/* Main Header */}
        <div className="bg-white border-b border-gray-50">
          <div className="section-container h-[76px] px-4 flex items-center justify-between">

            {/* Hamburger (Mobile) */}
            <button onClick={() => setIsMenuOpen(true)} className="lg:hidden p-2 -ml-2 text-black hover:text-[#F7941D] transition-colors">
              <Menu className="w-6 h-6" />
            </button>

            {/* Logo */}
            <Link href="/" className="flex-shrink-0 transition-transform active:scale-95">
              <Image src="/logo.png" alt="D-Fix Kart" width={130} height={48} className="h-11 w-auto object-contain" priority />
            </Link>

            {/* Nav Links (Desktop) */}
            <nav className="hidden lg:flex items-center gap-8 ml-auto mr-12">
              <Link href="/products" className="text-[14px] font-medium text-gray-700 hover:text-black transition-colors">All Products</Link>
              <div className="relative group">
                <button className="flex items-center gap-1 text-[14px] font-medium text-gray-700 hover:text-black transition-colors cursor-pointer">
                  Categories <ChevronDown className="w-3.5 h-3.5 opacity-50 group-hover:rotate-180 transition-transform" />
                </button>
                <div className="absolute top-full left-0 pt-4 w-56 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-white rounded-lg shadow-2xl border border-gray-100 py-3 overflow-hidden">
                    {categories.slice(0, 10).map((cat, index) => (
                      <Link key={cat.id || cat._id || index} href={`/products?category=${cat.slug}`} className="block px-5 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        {cat.name}
                      </Link>
                    ))}
                    <div className="h-[1px] bg-gray-100 my-2 mx-5"></div>
                    <Link href="/categories" className="block px-5 py-2 text-[13px] font-bold text-[#F7941D] hover:underline">Explore All</Link>
                  </div>
                </div>
              </div>
              <Link href="/about" className="text-[14px] font-medium text-gray-700 hover:text-black transition-colors">About</Link>
              <Link href="/contact" className="text-[14px] font-medium text-gray-700 hover:text-black transition-colors">Contact</Link>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Search (Desktop) */}
              <div className="hidden lg:block relative group" ref={searchContainerRef}>
                <form onSubmit={handleSearch} className="relative">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowResults(true);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowResults(true)}
                    className="w-[320px] h-[44px] pl-12 pr-4 bg-[#F8F8F8] border-none rounded-lg text-[14px] focus:ring-1 focus:ring-gray-200 transition-all placeholder:text-gray-400"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />

                  {/* Results Dropdown */}
                  {showResults && (searchQuery.trim().length >= 2) && (
                    <div className="absolute top-full left-0 w-full mt-2 z-[100] animate-in fade-in slide-in-from-top-2">
                      <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden">
                        {isSearching ? (
                          <div className="p-4 text-center">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#F7941D]" />
                          </div>
                        ) : searchResults.length > 0 ? (
                          <>
                            <div className="py-2 max-h-[420px] overflow-y-auto custom-scrollbar">
                              {searchResults.map((product, index) => (
                                <Link
                                  key={product.id || product._id}
                                  href={`/products/${product.slug || product._id}`}
                                  onMouseEnter={() => setSelectedIndex(index)}
                                  onClick={() => {
                                    setShowResults(false);
                                    setSearchQuery("");
                                  }}
                                  className={cn(
                                    "flex items-center gap-4 px-4 py-3 transition-colors border-b border-gray-50 last:border-0",
                                    selectedIndex === index ? "bg-gray-50" : "hover:bg-gray-50/50"
                                  )}
                                >
                                  <div className="w-12 h-12 rounded-lg bg-gray-50 flex-shrink-0 overflow-hidden border border-gray-100 p-1">
                                    <Image
                                      src={product.image || "/product-placeholder.jpg"}
                                      alt={product.name}
                                      width={48}
                                      height={48}
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-[13px] font-bold text-gray-900 truncate">
                                      {product.name}
                                    </h4>
                                    <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                      {product.category?.name || "Premium Quality Product"}
                                    </p>
                                  </div>
                                  <div className="text-right flex flex-col items-end">
                                    <p className="text-[12px] font-bold text-[#F7941D]">
                                      {formatCurrency(product.basePrice)}
                                    </p>
                                    {product.hasSale && (
                                      <p className="text-[10px] text-gray-400 line-through">
                                        {formatCurrency(product.regularPrice)}
                                      </p>
                                    )}
                                  </div>
                                </Link>
                              ))}
                            </div>
                            <div className="p-3 bg-gray-50/50 border-t border-gray-50">
                              <Link
                                href={`/products?search=${encodeURIComponent(searchQuery)}`}
                                className="flex items-center justify-center gap-2 w-full py-2 bg-white border border-gray-200 rounded-lg text-[12px] font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                onClick={() => setShowResults(false)}
                              >
                                View all {searchResults.length > 0 ? "results" : ""}
                              </Link>
                            </div>
                          </>
                        ) : (
                          <div className="p-6 text-center">
                            <p className="text-[13px] text-gray-500">No products found for "{searchQuery}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Icons Group */}
              <div className="flex items-center gap-1">
                <Link href="/wishlist" className="p-2 text-black hover:text-[#F7941D] transition-colors">
                  <Heart className="w-5 h-5" />
                </Link>

                <ClientOnly>
                  <Link href="/cart" className="p-2 text-black hover:text-[#F7941D] transition-colors relative group">
                    <ShoppingCart className="w-5 h-5" />
                    {getCartItemCount() > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-black text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                        {getCartItemCount()}
                      </span>
                    )}
                  </Link>
                </ClientOnly>

                {isAuthenticated ? (
                  <div className="relative group ml-2">
                    <button className="flex items-center py-2">
                      <div className="w-9 h-9 bg-[#F7941D] rounded-full flex items-center justify-center text-white text-[14px] font-bold shadow-sm group-hover:bg-[#e68a1a] transition-colors">
                        {user?.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    </button>

                    {/* Desktop Dropdown */}
                    <div className="absolute top-full right-0 w-64 pt-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
                        {/* User Header */}
                        <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50">
                          <p className="text-[14px] font-bold text-gray-900 truncate">{user?.name || "User"}</p>
                          <p className="text-[12px] text-gray-500 truncate mt-0.5">{user?.email}</p>
                        </div>

                        {/* Links */}
                        <div className="p-2">
                          <Link href="/account" className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 hover:text-black rounded-lg transition-colors">
                            <User className="w-4 h-4 opacity-70" />
                            My Profile
                          </Link>
                          <Link href="/account/orders" className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 hover:text-black rounded-lg transition-colors">
                            <PackageIcon className="w-4 h-4 opacity-70" />
                            My Orders
                          </Link>
                          <Link href="/account/addresses" className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50 hover:text-black rounded-lg transition-colors">
                            <MapPin className="w-4 h-4 opacity-70" />
                            Addresses
                          </Link>
                        </div>

                        {/* Logout */}
                        <div className="p-2 border-t border-gray-50">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative group ml-2">
                    <button className="flex items-center py-2">
                      <User className="w-5 h-5 text-[#F7941D]" />
                    </button>

                    {/* Desktop Dropdown */}
                    <div className="absolute top-full right-0 w-64 pt-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden p-5">
                        <p className="text-[14px] font-medium text-gray-700 mb-4">Sign in to access your account</p>
                        <div className="space-y-2">
                          <Link href="/auth" className="block">
                            <Button className="w-full bg-[#F7941D] hover:bg-[#e68a1a] text-white h-11 text-[14px] font-bold">
                              Sign In
                            </Button>
                          </Link>
                          <Link href="/auth?tab=register" className="block">
                            <Button variant="outline" className="w-full h-11 text-[14px] font-medium border-gray-200 hover:bg-gray-50">
                              Create Account
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Search Overlay */}
      {
        isSearchOpen && (
          <div className="fixed inset-0 z-[60] bg-black/50 lg:hidden" onClick={() => setIsSearchOpen(false)}>
            <div className="bg-white p-4" onClick={(e) => e.stopPropagation()}>
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#F7941D]/20 focus:border-[#F7941D]"
                />
                <button type="button" onClick={() => setIsSearchOpen(false)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </form>

              {/* Mobile Results */}
              {showResults && (searchQuery.trim().length >= 2) && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-white border border-gray-100 rounded-xl overflow-y-auto max-h-[60vh] shadow-sm">
                    {isSearching ? (
                      <div className="p-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#F7941D]" />
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="divide-y divide-gray-50 uppercase">
                        {searchResults.map((product) => (
                          <Link
                            key={product.id || product._id}
                            href={`/products/${product.slug || product._id}`}
                            onClick={() => {
                              setIsSearchOpen(false);
                              setShowResults(false);
                              setSearchQuery("");
                            }}
                            className="flex items-center gap-4 p-4 active:bg-gray-50 transition-colors"
                          >
                            <div className="w-14 h-14 rounded-lg bg-gray-50 flex-shrink-0 overflow-hidden border border-gray-100 p-1">
                              <Image
                                src={product.image || "/product-placeholder.jpg"}
                                alt={product.name}
                                width={56}
                                height={56}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[14px] font-bold text-gray-900 truncate">
                                {product.name}
                              </h4>
                              <p className="text-[12px] text-gray-500 truncate mt-1">
                                {product.category?.name || "Premium Quality Product"}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-[13px] font-bold text-[#F7941D]">
                                  {formatCurrency(product.basePrice)}
                                </p>
                                {product.hasSale && (
                                  <p className="text-[11px] text-gray-400 line-through">
                                    {formatCurrency(product.regularPrice)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                        <Link
                          href={`/products?search=${encodeURIComponent(searchQuery)}`}
                          className="block p-4 text-center text-sm font-bold text-[#F7941D]"
                          onClick={() => {
                            setIsSearchOpen(false);
                            setShowResults(false);
                          }}
                        >
                          VIEW ALL RESULTS
                        </Link>
                      </div>
                    ) : (
                      <div className="p-10 text-center">
                        <p className="text-gray-500">No products found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      }

      {/* Mobile Menu Sidebar */}
      {
        isMenuOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsMenuOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <Image src="/logo.png" alt="D-Fix Kart" width={100} height={35} className="h-8 w-auto" />
                <button onClick={() => setIsMenuOpen(false)} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <ClientOnly>
                {isAuthenticated ? (
                  <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#F7941D] rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                        {user?.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{user?.name || "User"}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-b border-gray-100 flex gap-2">
                    <Link href="/auth" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full bg-[#2D2D2D] hover:bg-black text-white">Sign In</Button>
                    </Link>
                    <Link href="/auth?tab=register" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="w-full">Register</Button>
                    </Link>
                  </div>
                )}
              </ClientOnly>

              <div className="p-4 space-y-1">
                <Link href="/" className="block px-4 py-3 text-gray-700 hover:text-[#F7941D] hover:bg-gray-50 rounded-lg font-medium" onClick={() => setIsMenuOpen(false)}>Home</Link>
                <Link href="/products" className="block px-4 py-3 text-gray-700 hover:text-[#F7941D] hover:bg-gray-50 rounded-lg font-medium" onClick={() => setIsMenuOpen(false)}>All Products</Link>
                <Link href="/categories" className="block px-4 py-3 text-gray-700 hover:text-[#F7941D] hover:bg-gray-50 rounded-lg font-medium" onClick={() => setIsMenuOpen(false)}>Categories</Link>
                <Link href="/about" className="block px-4 py-3 text-gray-700 hover:text-[#F7941D] hover:bg-gray-50 rounded-lg font-medium" onClick={() => setIsMenuOpen(false)}>About Us</Link>
                <Link href="/contact" className="block px-4 py-3 text-gray-700 hover:text-[#F7941D] hover:bg-gray-50 rounded-lg font-medium" onClick={() => setIsMenuOpen(false)}>Contact</Link>
              </div>

              <ClientOnly>
                {isAuthenticated && (
                  <div className="mt-2 border-t border-gray-100 pt-4 px-4 space-y-1">
                    <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Account</p>
                    <Link href="/account" className="block px-4 py-2.5 text-sm text-gray-600 hover:text-[#F7941D] hover:bg-gray-50 rounded-lg" onClick={() => setIsMenuOpen(false)}>Profile</Link>
                    <Link href="/account/orders" className="block px-4 py-2.5 text-sm text-gray-600 hover:text-[#F7941D] hover:bg-gray-50 rounded-lg" onClick={() => setIsMenuOpen(false)}>My Orders</Link>
                    <Link href="/wishlist" className="block px-4 py-2.5 text-sm text-gray-600 hover:text-[#F7941D] hover:bg-gray-50 rounded-lg" onClick={() => setIsMenuOpen(false)}>My Wishlist</Link>
                    <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg">Sign Out</button>
                  </div>
                )}
              </ClientOnly>
            </div>
          </div>
        )
      }
    </>
  );
}

export default Navbar;
