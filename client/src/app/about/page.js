import { Award, Users, ShoppingBag, Target, CheckCircle, ArrowRight, Truck, Shield, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = {
    title: "About Us | D-Fix Kart",
    description: "Learn about D-Fix Kart, your trusted destination for premium quality products.",
};

const stats = [
    { value: "50K+", label: "Happy Customers", icon: <Users className="w-5 h-5" /> },
    { value: "10K+", label: "Products", icon: <ShoppingBag className="w-5 h-5" /> },
    { value: "99%", label: "Satisfaction", icon: <Heart className="w-5 h-5" /> },
    { value: "24/7", label: "Support", icon: <Award className="w-5 h-5" /> },
];

const values = [
    {
        icon: Shield,
        title: "Quality Guaranteed",
        description: "Every product goes through strict quality checks. We only sell 100% genuine products."
    },
    {
        icon: Truck,
        title: "Fast Delivery",
        description: "Quick and reliable delivery across India. Free shipping on orders above ₹999."
    },
    {
        icon: Target,
        title: "Customer First",
        description: "Your satisfaction is our priority. Easy returns and dedicated support."
    },
    {
        icon: Award,
        title: "Best Prices",
        description: "Competitive prices on all products. Great value for your money."
    }
];

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-white">
            {/* Hero */}
            <section className="py-16 md:py-20 bg-gradient-section">
                <div className="section-container">
                    <div className="max-w-3xl">
                        <span className="section-badge mb-4">
                            <Award className="w-4 h-4" />
                            About Us
                        </span>
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-gray-900 mb-4">
                            Your Trusted Shopping <span className="text-primary">Destination</span>
                        </h1>
                        <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                            At D-Fix Kart, we bring you the best quality products at great prices. With fast delivery, secure payments, and excellent customer service, we make online shopping easy and enjoyable.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {["100% Genuine", "Free Shipping", "Easy Returns", "Secure Checkout"].map((item) => (
                                <span key={item} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700">
                                    <CheckCircle className="w-4 h-4 text-primary" /> {item}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="py-10 bg-[#2D2D2D]">
                <div className="section-container">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {stats.map((stat, index) => (
                            <div key={index} className="text-center">
                                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mx-auto mb-3 text-primary">
                                    {stat.icon}
                                </div>
                                <p className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</p>
                                <p className="text-gray-400 text-sm">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="section-padding">
                <div className="section-container">
                    <div className="section-header">
                        <span className="section-badge">Our Values</span>
                        <h2 className="section-title">Why Choose D-Fix Kart?</h2>
                        <p className="section-subtitle">We are committed to delivering the best shopping experience</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {values.map((value, index) => (
                            <div key={index} className="card-premium p-6 hover:border-primary/20">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                                    <value.icon className="h-7 w-7 text-primary" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{value.title}</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">{value.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="section-padding-sm bg-gradient-section border-t border-gray-100">
                <div className="section-container text-center">
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 mb-4">
                        Ready to Start Shopping?
                    </h2>
                    <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                        Join thousands of happy customers and experience the D-Fix Kart difference.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="/products">
                            <Button size="lg" className="btn-primary h-12 px-8">
                                Shop Now
                            </Button>
                        </Link>
                        <Link href="/contact">
                            <Button size="lg" variant="outline" className="btn-outline h-12 px-8">
                                Contact Us
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
