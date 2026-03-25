"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone, Facebook, Instagram, Youtube, ShieldCheck, Shield, CreditCard, RotateCcw } from "lucide-react";

const shopLinks = [
  { name: "All Products", href: "/products" },
  { name: "New Arrivals", href: "/products?sort=newest" },
  { name: "Best Sellers", href: "/products?sort=popular" },
  { name: "On Sale", href: "/products?sale=true" },
  { name: "Categories", href: "/categories" },
];

const companyLinks = [
  { name: "About Us", href: "/about" },
  { name: "Contact", href: "/contact" },
  { name: "FAQs", href: "/faqs" },
];

const policyLinks = [
  { name: "Shipping Policy", href: "/shipping-policy" },
  { name: "Return Policy", href: "/return-policy" },
  { name: "Terms & Conditions", href: "/terms" },
  { name: "Privacy Policy", href: "/privacy" },
];

const socialLinks = [
  { name: "Instagram", href: "https://www.instagram.com/dfixkart/", icon: Instagram },
  { name: "Facebook", href: "https://www.facebook.com/dfixkart/", icon: Facebook },
  { name: "YouTube", href: "https://youtube.com/@dfixkart", icon: Youtube },
];

const trustFeatures = [
  { icon: ShieldCheck, title: "Better Pricing", desc: "with Online Payment" },
  { icon: Shield, title: "100% Genuine", desc: "Authentic products" },
  { icon: RotateCcw, title: "Easy Returns", desc: "30-day returns" },
  { icon: CreditCard, title: "Secure Pay", desc: "SSL encrypted" },
];

export const Footer = () => {
  return (
    <footer className="bg-[#0A0A0A] text-white pt-16 pb-8">
      <div className="section-container">
        {/* Trust Bar - Premium Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          {trustFeatures.map((feature, index) => (
            <div key={index} className="flex items-center gap-5 bg-[#1A1A1A] p-6 rounded-xl border border-white/5 group hover:border-[#F7941D]/30 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-[#252525] flex items-center justify-center text-[#F7941D] group-hover:scale-110 transition-transform">
                <feature.icon className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-sans font-bold text-[15px] text-white mb-0.5">{feature.title}</h4>
                <p className="text-gray-500 text-[12px] font-medium">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-20">
          {/* Brand Info */}
          <div className="lg:col-span-4 space-y-6 pr-0 lg:pr-12">
            <Link href="/" className="inline-block">
              <Image src="/logo.png" alt="D-Fix Kart" width={140} height={50} className="h-10 w-auto brightness-0 invert" />
            </Link>
            <p className="text-gray-400 text-[14px] leading-relaxed font-medium">
              Your trusted destination for premium quality products. We ensure fast delivery, secure payments, and 100% genuine products guaranteed for your satisfaction.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a key={social.name} href={social.href} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-white transition-all">
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div className="lg:col-span-2">
            <h3 className="font-sans font-bold text-[16px] text-white mb-8">Shop</h3>
            <ul className="space-y-4">
              {shopLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-gray-400 hover:text-white transition-colors text-[14px]">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="lg:col-span-2">
            <h3 className="font-sans font-bold text-[16px] text-white mb-8">Company</h3>
            <ul className="space-y-4">
              {companyLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-gray-400 hover:text-white transition-colors text-[14px]">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies */}
          <div className="lg:col-span-2">
            <h3 className="font-sans font-bold text-[16px] text-white mb-8">POLICIES</h3>
            <ul className="space-y-4">
              {policyLinks.slice(0, 2).map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-gray-400 hover:text-white transition-colors text-[14px]">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-8">
            <h3 className="font-sans font-bold text-[16px] text-white mb-8">Contact Us</h3>
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                <span className="text-gray-400 text-[14px] leading-tight font-medium">
                  B 19/1 Double Story Ramesh nagar<br />New Delhi 110015
                </span>
              </div>
              <div className="flex items-center gap-4">
                <Mail className="h-5 w-5 text-gray-500" />
                <a href="mailto:dfixventure@gmail.com" className="text-gray-400 hover:text-white text-[14px] font-medium transition-colors">
                  dfixventure@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-4">
                <Phone className="h-5 w-5 text-gray-500" />
                <a href="tel:+918851907674" className="text-gray-400 hover:text-white text-[14px] font-medium transition-colors">
                  +91 88519 07674
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-gray-500 text-[12px] font-medium">
            © {new Date().getFullYear()} D-Fix Kart. All rights reserved |  Developed & Managed by <a href="https://lso360seoplugin.com/" target="_blank" rel="noopener noreferrer"><u>Advertising India</u></a> 
          </p>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-[11px] font-bold uppercase mr-2 opacity-60">SECURE PAYMENT:</span>
            {["UPI", "VISA", "MASTERCARD", "RUPAY"].map((pay) => (
              <span key={pay} className="px-2.5 py-1 bg-[#1A1A1A] border border-white/5 rounded text-gray-400 text-[10px] font-bold tracking-tight">{pay}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
