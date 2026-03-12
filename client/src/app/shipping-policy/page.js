import { Truck, Package, MapPin, Clock } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";

export const metadata = {
    title: "Shipping Policy | DJ-Challenger",
    description: "Learn about our shipping policy, delivery times, and shipping charges.",
};

const shippingInfo = [
    {
        icon: Truck,
        title: "Free Shipping",
        description: "Free delivery across India on orders above ₹25,000. For orders below ₹25,000, a flat shipping charge of ₹500 applies."
    },
    {
        icon: Clock,
        title: "Delivery Time",
        description: "Orders are typically delivered within 5-7 business days for metro cities and 7-10 business days for other locations."
    },
    {
        icon: Package,
        title: "Order Processing",
        description: "All orders are processed within 1-2 business days. You will receive a tracking number once your order is shipped."
    },
    {
        icon: MapPin,
        title: "Shipping Locations",
        description: "We ship across India. International shipping is available to select countries. Contact us for international orders."
    }
];

export default function ShippingPolicyPage() {
    return (
        <div className="bg-page min-h-screen">
            <PageHero
                title="Shipping Policy"
                description="Everything you need to know about our shipping and delivery"
                breadcrumbs={[{ label: "Shipping Policy" }]}
                variant="default"
                size="sm"
            />

            <section className="bg-section-white section-padding">
                <div className="section-container max-w-4xl">
                    {/* Overview */}
                    <div className="grid md:grid-cols-2 gap-6 mb-12">
                        {shippingInfo.map((info, index) => (
                            <div key={index} className="bg-muted/30 rounded-2xl p-6">
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                                    <info.icon className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="font-display font-bold text-lg mb-2">{info.title}</h3>
                                <p className="text-muted-foreground leading-relaxed">{info.description}</p>
                            </div>
                        ))}
                    </div>

                    {/* Detailed Policy */}
                    <div className="prose prose-lg max-w-none">
                        <h2 className="font-display text-2xl font-bold mb-4">Shipping Charges</h2>
                        <ul className="space-y-2 mb-8">
                            <li>Orders above ₹25,000: <strong>Free Shipping</strong></li>
                            <li>Orders below ₹25,000: <strong>₹500 flat shipping charge</strong></li>
                            <li>Bulk orders (10+ units): Contact us for special shipping rates</li>
                        </ul>

                        <h2 className="font-display text-2xl font-bold mb-4">Delivery Timeline</h2>
                        <p className="mb-4">Estimated delivery times from the date of order placement:</p>
                        <ul className="space-y-2 mb-8">
                            <li><strong>Metro Cities:</strong> 5-7 business days</li>
                            <li><strong>Tier 2 Cities:</strong> 7-10 business days</li>
                            <li><strong>Remote Areas:</strong> 10-15 business days</li>
                        </ul>

                        <h2 className="font-display text-2xl font-bold mb-4">Order Tracking</h2>
                        <p className="mb-8">
                            Once your order is shipped, you will receive a tracking number via email and SMS.
                            You can track your order status using this tracking number on our courier partner&apos;s website.
                        </p>

                        <h2 className="font-display text-2xl font-bold mb-4">Packaging</h2>
                        <p className="mb-8">
                            All products are carefully packed with protective materials to ensure safe delivery.
                            Heavy items are double-boxed with extra cushioning to prevent damage during transit.
                        </p>

                        <h2 className="font-display text-2xl font-bold mb-4">Damaged/Lost Shipments</h2>
                        <p className="mb-4">
                            In the rare event that your order arrives damaged or goes missing during transit:
                        </p>
                        <ul className="space-y-2 mb-8">
                            <li>Contact us within 48 hours of delivery with photos of the damage</li>
                            <li>We will arrange for a replacement or full refund</li>
                            <li>For lost shipments, we will initiate a full refund or send a replacement</li>
                        </ul>

                        <h2 className="font-display text-2xl font-bold mb-4">International Shipping</h2>
                        <p className="mb-8">
                            We ship to select international locations. Shipping charges and delivery times vary by country.
                            Please contact our support team at <strong>dfixventure@gmail.com</strong>
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
