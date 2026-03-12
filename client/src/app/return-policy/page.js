
import { PageHero } from "@/components/ui/PageHero";

export const metadata = {
    title: "Return Policy | DJ-Challenger",
    description: "Learn about our 7-day return policy and how to return products.",
};

const returnSteps = [
    {
        step: 1,
        title: "Contact Us",
        description: "Reach out to our support team within 7 days of delivery"
    },
    {
        step: 2,
        title: "Return Authorization",
        description: "We'll provide you with a return authorization code"
    },
    {
        step: 3,
        title: "Ship Product",
        description: "Pack the product securely and ship it back to us"
    },
    {
        step: 4,
        title: "Refund/Exchange",
        description: "Receive refund or exchange within 7-10 business days"
    }
];

export default function ReturnPolicyPage() {
    return (
        <div className="bg-page min-h-screen">
            <PageHero
                title="Return Policy"
                description="7-day easy returns on all products"
                breadcrumbs={[{ label: "Return Policy" }]}
                variant="default"
                size="sm"
            />

            <section className="bg-section-white section-padding">
                <div className="section-container max-w-4xl">
                    {/* Return Process */}
                    <div className="mb-12">
                        <h2 className="font-display text-2xl font-bold text-center mb-8">Return Process</h2>
                        <div className="grid md:grid-cols-4 gap-6">
                            {returnSteps.map((item) => (
                                <div key={item.step} className="text-center">
                                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="font-display font-bold text-2xl text-primary">{item.step}</span>
                                    </div>
                                    <h3 className="font-semibold mb-2">{item.title}</h3>
                                    <p className="text-sm text-muted-foreground">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Detailed Policy */}
                    <div className="prose prose-lg max-w-none">
                        <h2 className="font-display text-2xl font-bold mb-4">Return Eligibility</h2>
                        <p className="mb-4">You can return products within 7 days of delivery if:</p>
                        <ul className="space-y-2 mb-8">
                            <li>Product is unused and in original packaging</li>
                            <li>All accessories, manuals, and warranty cards are included</li>
                            <li>Product has no physical damage or scratches</li>
                            <li>Product was not damaged due to misuse</li>
                        </ul>

                        <h2 className="font-display text-2xl font-bold mb-4">Non-Returnable Items</h2>
                        <p className="mb-4">The following items cannot be returned:</p>
                        <ul className="space-y-2 mb-8">
                            <li>Products damaged due to misuse or mishandling</li>
                            <li>Products with missing accessories or parts</li>
                            <li>Products without original packaging</li>
                            <li>Customized or special order products</li>
                        </ul>

                        <h2 className="font-display text-2xl font-bold mb-4">Refund Process</h2>
                        <p className="mb-4">
                            Once we receive your returned product, our quality team will inspect it within 2-3 business days.
                        </p>
                        <ul className="space-y-2 mb-8">
                            <li>If approved, refund will be processed within 7-10 business days</li>
                            <li>Refund will be credited to the original payment method</li>
                            <li>For cash on delivery orders, refund will be via bank transfer</li>
                            <li>Shipping charges are non-refundable (unless product is defective)</li>
                        </ul>

                        <h2 className="font-display text-2xl font-bold mb-4">Exchange Policy</h2>
                        <p className="mb-4">
                            If you want to exchange a product for a different model or variant:
                        </p>
                        <ul className="space-y-2 mb-8">
                            <li>Contact us within 7 days of delivery</li>
                            <li>Exchange is subject to product availability</li>
                            <li>Price difference (if any) must be paid before exchange</li>
                            <li>Original shipping charges are non-refundable</li>
                        </ul>

                        <h2 className="font-display text-2xl font-bold mb-4">Damaged/Defective Products</h2>
                        <p className="mb-4">
                            If you receive a damaged or defective product:
                        </p>
                        <ul className="space-y-2 mb-8">
                            <li>Contact us immediately with photos/videos of the damage</li>
                            <li>We will arrange for a free pickup and replacement</li>
                            <li>Full refund including shipping charges will be processed</li>
                            <li>No questions asked - your satisfaction is our priority</li>
                        </ul>

                        <h2 className="font-display text-2xl font-bold mb-4">Contact Support</h2>
                        <p className="mb-4">
                            For return requests or queries, contact us at:
                        </p>
                        <ul className="space-y-2">
                            <li>Email: <strong>dfixventure@gmail.com</strong></li>

                            <li>Available: Monday - Saturday, 9 AM - 7 PM</li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
}
