import { Factory, Shield, Headphones, Truck } from "lucide-react";

const features = [
  {
    icon: Factory,
    title: "Factory Direct",
    description: "Buy directly from the manufacturer. No middlemen, no markups. Just great prices on professional equipment."
  },
  {
    icon: Shield,
    title: "1 Year Warranty",
    description: "Every product comes with comprehensive warranty coverage. We stand behind our quality."
  },
  {
    icon: Headphones,
    title: "Expert Support",
    description: "Our audio experts help you choose the right equipment. Call us anytime for personalized guidance."
  },
  {
    icon: Truck,
    title: "Free Shipping",
    description: "Free delivery across India on orders above ₹25,000. Fast and secure shipping."
  }
];

export const WhyBuySection = () => {
  return (
    <section className="section-padding bg-white">
      <div className="section-container">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-medium text-primary uppercase tracking-wide mb-2">
            Why DJ-Challenger
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            The Smart Choice
          </h2>
          <p className="text-lg text-muted-foreground">
            25+ years of manufacturing excellence. Trusted by professionals across India.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center group">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6 group-hover:bg-primary transition-colors">
                <feature.icon className="h-7 w-7 text-foreground group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
