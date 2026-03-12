import { Music2, Radio, Mic2, PartyPopper, Building2, Truck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const industries = [
  {
    icon: PartyPopper,
    name: "Events & Weddings",
    description: "Sound systems for all celebrations",
    products: "DJ Speakers, PA Systems",
  },
  {
    icon: Music2,
    name: "DJs & Artists",
    description: "Professional audio gear",
    products: "Speakers, Amplifiers, Mixers",
  },
  {
    icon: Building2,
    name: "Venues & Clubs",
    description: "Permanent installations",
    products: "Line Arrays, Subwoofers",
  },
  {
    icon: Radio,
    name: "Houses of Worship",
    description: "Clear speech systems",
    products: "PA Series, Driver Units",
  },
  {
    icon: Mic2,
    name: "Schools & Colleges",
    description: "Auditorium solutions",
    products: "Megaphones, PA Systems",
  },
  {
    icon: Truck,
    name: "Mobile Sound",
    description: "Portable solutions",
    products: "Trolley Speakers, Battery Systems",
  },
];

export const IndustriesSection = () => {
  return (
    <section className="section-padding bg-muted">
      <div className="section-container">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">Shop By Use Case</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
            Find the Perfect Sound System
          </h2>
          <p className="text-muted-foreground">
            Tell us your use case and we&apos;ll help you find the right products.
          </p>
        </div>

        {/* Industries Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {industries.map((industry, index) => (
            <Link 
              key={index} 
              href="/products"
              className="bg-card p-6 rounded-xl card-shadow card-hover group"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary transition-colors">
                <industry.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                {industry.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">{industry.description}</p>
              <p className="text-xs text-primary font-medium">{industry.products}</p>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <p className="text-muted-foreground mb-4">Not sure what you need?</p>
          <Link href="/contact">
            <Button variant="outline" size="lg">
              Get Expert Advice
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
