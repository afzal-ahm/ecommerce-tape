import { ShoppingBag, Truck, Shield, Headphones,  CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const features = [
  {
    icon: Truck,
    title: "Free Shipping",
    description: "Free delivery on orders above ₹25,000",
  },
  {
    icon: Shield,
    title: "1 Year Warranty",
    description: "Full warranty on all products",
  },
  {
    icon: CreditCard,
    title: "Secure Payment",
    description: "Multiple payment options available",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Expert help whenever you need",
  },
];

const stats = [ 
  { value: "25+", label: "Years in Business" },
  { value: "50K+", label: "Happy Customers" },
  { value: "500+", label: "Products" },
  { value: "50+", label: "Countries" },
];

export const AboutSection = () => {
  return (
    <section className="section-padding bg-muted">
      <div className="section-container">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">Why Shop With Us</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
            India&apos;s Trusted Audio Equipment Store
          </h2>
          <p className="text-muted-foreground text-lg">
            25+ years of excellence in professional audio. Quality products, best prices, and exceptional service.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
            <div key={index} className="bg-card p-6 rounded-2xl text-center card-shadow hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 md:p-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl md:text-4xl font-display font-bold text-primary">{stat.value}</p>
                <p className="text-white/70 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <Link href="/products">
            <Button variant="hero" size="lg" className="gap-2">
              <ShoppingBag className="h-5 w-5" />
              Start Shopping
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
