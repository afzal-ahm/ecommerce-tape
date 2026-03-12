import { CheckCircle2, Star, ThumbsUp, Zap, Award, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const reasons = [
  {
    icon: Award,
    title: "Premium Quality",
    description: "Every product tested for peak performance",
  },
  {
    icon: Zap,
    title: "Best Prices",
    description: "Direct from manufacturer, no middlemen",
  },
  {
    icon: BadgeCheck,
    title: "Genuine Products",
    description: "100% authentic with warranty",
  },
  {
    icon: ThumbsUp,
    title: "Expert Support",
    description: "Dedicated team to help you choose",
  },
];

const reviews = [
  { name: "Rajesh Kumar", rating: 5, text: "Best quality speakers I've ever bought. Fast delivery!", location: "Delhi" },
  { name: "Amit Sharma", rating: 5, text: "Great prices compared to other stores. Highly recommended!", location: "Mumbai" },
  { name: "Vikram Singh", rating: 5, text: "Excellent customer service. They helped me choose the right amplifier.", location: "Jaipur" },
];

export const WhyChooseSection = () => {
  return (
    <section className="section-padding bg-background">
      <div className="section-container">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">Why Choose Us</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
            Trusted by 50,000+ Customers
          </h2>
          <p className="text-muted-foreground">
            Join thousands of satisfied customers who trust us for their audio equipment needs.
          </p>
        </div>

        {/* Reasons Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {reasons.map((reason, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <reason.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{reason.title}</h3>
              <p className="text-sm text-muted-foreground">{reason.description}</p>
            </div>
          ))}
        </div>

        {/* Customer Reviews */}
        <div className="bg-muted rounded-2xl p-8 md:p-10">
          <h3 className="font-display text-2xl font-bold text-foreground text-center mb-8">
            What Our Customers Say
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {reviews.map((review, index) => (
              <div key={index} className="bg-card p-6 rounded-xl card-shadow">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-foreground mb-4">&quot;{review.text}&quot;</p>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="font-semibold text-primary">{review.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{review.name}</p>
                    <p className="text-xs text-muted-foreground">{review.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <Link href="/products">
            <Button variant="hero" size="lg">
              Shop Now & Save
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
