import { ShoppingBag, Truck, Shield, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const CTASection = () => {
  return (
    <section className="section-padding bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-secondary blur-3xl" />
      </div>

      <div className="section-container relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              Ready to Experience{" "}
              <span className="text-primary">Premium Sound?</span>
            </h2>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto">
              Shop now and get free shipping on orders above ₹25,000. 
              1 year warranty on all products.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/products">
              <Button variant="hero" size="xl" className="gap-2 w-full sm:w-auto">
                <ShoppingBag className="h-5 w-5" />
                Shop All Products
              </Button>
            </Link>
           
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 pt-8 border-t border-white/10">
            <div className="flex items-center gap-3">
              <Truck className="h-6 w-6 text-primary" />
              <div>
                <p className="text-white font-medium">Free Shipping</p>
                <p className="text-white/60 text-sm">On orders ₹25,000+</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <p className="text-white font-medium">1 Year Warranty</p>
                <p className="text-white/60 text-sm">Full coverage</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-6 w-6 text-primary" />
              <div>
                <p className="text-white font-medium">Expert Support</p>
                
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
