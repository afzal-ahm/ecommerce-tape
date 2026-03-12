import { Award, Zap, BadgeCheck, Truck, Shield, ThumbsUp, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/ui/PageHero";
import Link from "next/link";

export const metadata = {
    title: "Why Choose Us | DJ-Challenger - India's Best Audio Store",
    description: "Discover why 50,000+ customers trust DJ-Challenger for professional audio equipment. Best prices, quality products, and excellent service.",
};

const reasons = [
    {
        icon: Award,
        title: "Premium Quality",
        description: "Every product is manufactured with precision and tested before shipping. ISO certified quality control.",
    },
    {
        icon: Zap,
        title: "Factory Direct Prices",
        description: "No middlemen. Buy directly from the manufacturer and save up to 40% compared to retail stores.",
    },
    {
        icon: BadgeCheck,
        title: "1 Year Warranty",
        description: "All products come with full 1-year warranty. Easy claims with quick resolution and excellent service.",
    },
    {
        icon: Truck,
        title: "Free Shipping",
        description: "Free delivery across India on orders above ₹25,000. Fast and secure shipping with tracking.",
    },
    {
        icon: Shield,
        title: "Secure Payments",
        description: "Multiple payment options including UPI, Cards, Net Banking, and Cash on Delivery.",
    },
    {
        icon: ThumbsUp,
        title: "Expert Support",
        description: "Dedicated team to help you choose the right equipment for your specific needs and budget.",
    },
];

const reviews = [
    { name: "Rajesh Kumar", rating: 5, text: "Best quality speakers I've ever bought. Fast delivery and great price!", location: "Delhi" },
    { name: "Amit Sharma", rating: 5, text: "Factory direct pricing is unbeatable. Saved ₹15,000 compared to other stores.", location: "Mumbai" },
    { name: "Vikram Singh", rating: 5, text: "Excellent support team. They helped me choose the perfect setup for my venue.", location: "Jaipur" },
    { name: "Priya Patel", rating: 5, text: "Warranty claim was processed in 3 days. Very professional service!", location: "Ahmedabad" },
    { name: "Suresh Reddy", rating: 5, text: "Been buying from DJ-Challenger for 5 years. Never disappointed.", location: "Hyderabad" },
    { name: "Karan Gupta", rating: 5, text: "Free shipping and COD option made it so easy to order.", location: "Chandigarh" },
];

const stats = [
    { value: "25+", label: "Years Experience" },
    { value: "50,000+", label: "Happy Customers" },
    { value: "500+", label: "Products" },
    { value: "99%", label: "Satisfaction Rate" }
];

export default function WhyUsPage() {
    return (
        <div className="bg-page min-h-screen">
            <PageHero
                title="Why Choose DJ-Challenger"
                description="Join 50,000+ satisfied customers who trust us for their professional audio needs"
                breadcrumbs={[{ label: "Why Us" }]}
                variant="default"
                size="md"
            />

            {/* Stats */}
            <section className="bg-foreground py-12">
                <div className="section-container">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-white text-center">
                        {stats.map((stat, index) => (
                            <div key={index}>
                                <p className="font-display text-4xl font-bold text-primary mb-2">{stat.value}</p>
                                <p className="text-white/70">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Reasons Grid */}
            <section className="section-padding">
                <div className="section-container">
                    <div className="text-center mb-12">
                        <h2 className="font-display text-3xl font-bold text-foreground mb-3">
                            What Sets Us Apart
                        </h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            We&apos;re not just another audio equipment store. Here&apos;s why thousands choose us.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {reasons.map((reason, index) => (
                            <div key={index} className="bg-muted/30 rounded-2xl p-8 hover:shadow-lg transition-shadow">
                                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                                    <reason.icon className="h-7 w-7 text-primary" />
                                </div>
                                <h3 className="font-display font-bold text-xl text-foreground mb-3">
                                    {reason.title}
                                </h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {reason.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Reviews */}
            <section className="section-padding bg-muted/30">
                <div className="section-container">
                    <div className="text-center mb-12">
                        <h2 className="font-display text-3xl font-bold text-foreground mb-3">
                            Customer Reviews
                        </h2>
                        <p className="text-muted-foreground">
                            Don&apos;t just take our word for it. Here&apos;s what our customers have to say.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {reviews.map((review, index) => (
                            <div key={index} className="bg-white rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-1 mb-4">
                                    {[...Array(review.rating)].map((_, i) => (
                                        <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                    ))}
                                </div>
                                <p className="text-foreground mb-6 leading-relaxed">
                                    &quot;{review.text}&quot;
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                                        <span className="font-bold text-primary">{review.name.charAt(0)}</span>
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
            </section>

            {/* CTA */}
            <section className="section-padding bg-foreground">
                <div className="section-container text-center">
                    <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
                        Ready to Experience the Difference?
                    </h2>
                    <p className="text-white/70 text-lg max-w-2xl mx-auto mb-8">
                        Join thousands of satisfied customers. Shop now with free shipping on orders above ₹25,000.
                    </p>
                    <Link href="/products">
                        <Button size="lg" className="bg-white text-foreground hover:bg-white/90 rounded-full px-10 h-14">
                            Shop Now
                        </Button>
                    </Link>
                </div>
            </section>
        </div>
    );
}
