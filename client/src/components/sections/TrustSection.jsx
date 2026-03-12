"use client";

import { Truck, Shield, RotateCcw, CreditCard, Headphones, Award } from "lucide-react";

const trustItems = [
  {
    icon: Truck,
    title: "Free Shipping",
    description: "Free delivery on orders above ₹999",
  },
  {
    icon: Shield,
    title: "100% Genuine",
    description: "Authentic products guaranteed",
  },
  {
    icon: RotateCcw,
    title: "Easy Returns",
    description: "30-day hassle-free returns",
  },
  {
    icon: CreditCard,
    title: "Secure Payment",
    description: "SSL encrypted checkout",
  },
];

export function TrustSection() {
  return (
    <section className="section-padding-sm bg-[#2D2D2D]">
      <div className="section-container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {trustItems.map((item, index) => (
            <div
              key={index}
              className="flex flex-col md:flex-row items-center md:items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 text-center md:text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TrustSection;
