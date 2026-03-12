import { ArrowRight, Speaker, Radio, Music2, Headphones, Mic2, Volume1 } from "lucide-react";
import Link from "next/link";

const productCategories = [
  {
    name: "DJ Speakers",
    slug: "dj-speakers",
    description: "High-power speakers for events & DJs (12\", 15\", 18\")",
    icon: Speaker,
  },
  {
    name: "PD Series",
    slug: "pd-series",
    description: "Premium driver units for professional setups",
    icon: Radio,
  },
  {
    name: "Challenger Series",
    slug: "challenger-series",
    description: "Our flagship heavy-duty speaker lineup",
    icon: Music2,
  },
  {
    name: "PA Series",
    slug: "pa-series",
    description: "Versatile public address system speakers",
    icon: Volume1,
  },
  {
    name: "NEO Series",
    slug: "neo-series",
    description: "Lightweight neodymium magnet speakers",
    icon: Headphones,
  },
  {
    name: "Amplifiers",
    slug: "amplifiers",
    description: "Professional power amplifiers for all needs",
    icon: Music2,
  },
  {
    name: "Driver Units",
    slug: "driver-units",
    description: "High-frequency compression drivers & tweeters",
    icon: Radio,
  },
  {
    name: "Megaphones",
    slug: "megaphones",
    description: "Portable loudspeakers for announcements",
    icon: Mic2,
  },
  {
    name: "Trolley Speakers",
    slug: "trolley-speakers",
    description: "Portable speakers with built-in battery",
    icon: Speaker,
  },
];

export const ProductsSection = () => {
  return (
    <section id="products" className="section-padding bg-muted">
      <div className="section-container">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">Our Products</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
            Comprehensive Range of P.A Equipment
          </h2>
          <p className="text-muted-foreground">
            From powerful DJ speakers to precision driver units, explore our complete range of 
            professional audio equipment designed for every application.
          </p>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {productCategories.map((product, index) => (
            <Link
              key={index}
              href={`/products?category=${product.slug}`}
              className="bg-card rounded-xl p-6 card-shadow card-hover group block"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary transition-colors">
                <product.icon className="h-7 w-7 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
                {product.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {product.description}
              </p>
              <div className="flex items-center gap-2 text-primary font-medium text-sm">
                Shop Now
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-10">
          <Link 
            href="/products"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            View All Products
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
};
