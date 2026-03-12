import { Shield, CheckCircle2, FileText, Phone } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";

export const metadata = {
    title: "Warranty Policy | DJ-Challenger",
    description: "Learn about our comprehensive 1-year warranty on all products.",
};

const warrantyFeatures = [
    {
        icon: Shield,
        title: "1 Year Comprehensive Warranty",
        description: "All products come with a full 1-year manufacturer warranty from the date of purchase."
    },
    {
        icon: CheckCircle2,
        title: "Free Repair/Replacement",
        description: "Manufacturing defects are covered with free repair or replacement during warranty period."
    },
    {
        icon: FileText,
        title: "Easy Claims",
        description: "Simple warranty claim process with quick turnaround time of 7-10 business days."
    },
    {
        icon: Phone,
        title: "Dedicated Support",
        description: "Our technical support team is available to assist you throughout the warranty period."
    }
];

export default function WarrantyPage() {
    return (
        <div className="bg-page min-h-screen">
            <PageHero
                title="Warranty Policy"
                description="1-year comprehensive warranty on all products"
                breadcrumbs={[{ label: "Warranty" }]}
                variant="default"
                size="sm"
            />

            <section className="bg-section-white section-padding">
                <div className="section-container max-w-4xl">
                    {/* Warranty Features */}
                    <div className="grid md:grid-cols-2 gap-6 mb-12">
                        {warrantyFeatures.map((feature, index) => (
                            <div key={index} className="bg-muted/30 rounded-2xl p-6">
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                                    <feature.icon className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="font-display font-bold text-lg mb-2">{feature.title}</h3>
                                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>

                    {/* Detailed Warranty Policy */}
                    <div className="prose prose-lg max-w-none">
                        <h2 className="font-display text-2xl font-bold mb-4">Warranty Coverage</h2>
                        <p className="mb-4">
                            Our 1-year manufacturer warranty covers:
                        </p>
                        <ul className="space-y-2 mb-8">
                            <li>Manufacturing defects in materials and workmanship</li>
                            <li>Electronics component failures under normal use</li>
                            <li>Speaker driver defects and failures</li>
                            <li>Amplifier circuit issues</li>
                            <li>Power supply failures</li>
                        </ul>

                        <h2 className="font-display text-2xl font-bold mb-4">What&apos;s Not Covered</h2>
                        <p className="mb-4">
                            The warranty does not cover:
                        </p>
                        <ul className="space-y-2 mb-8">
                            <li>Physical damage from mishandling, accidents, or drops</li>
                            <li>Damage from improper installation or incorrect voltage</li>
                            <li>Water damage or exposure to extreme conditions</li>
                            <li>Damage from unauthorized repairs or modifications</li>
                            <li>Normal wear and tear (cosmetic scratches, fading)</li>
                            <li>Damage from commercial rental use</li>
                        </ul>

                        <h2 className="font-display text-2xl font-bold mb-4">How to Claim Warranty</h2>
                        <p className="mb-4">
                            To claim warranty service:
                        </p>
                        <ol className="space-y-3 mb-8 list-decimal list-inside">
                            <li><strong>Contact Support:</strong> Email us at dfixventure@gmail.com </li>
                            <li><strong>Provide Details:</strong> Share your order number, purchase invoice, and description of the issue</li>
                            <li><strong>Send Photos/Videos:</strong> Share clear photos or videos showing the defect</li>
                            <li><strong>Get Authorization:</strong> Our team will provide a warranty claim authorization code</li>
                            <li><strong>Ship Product:</strong> Ship the product to our service center (we&apos;ll share the address)</li>
                            <li><strong>Repair/Replacement:</strong> Receive repaired or replacement product within 7-10 business days</li>
                        </ol>

                        <h2 className="font-display text-2xl font-bold mb-4">Warranty Terms</h2>
                        <ul className="space-y-2 mb-8">
                            <li>Warranty is valid only with original purchase invoice</li>
                            <li>Warranty is non-transferable to second owners</li>
                            <li>Shipping charges for warranty claims may apply (both ways)</li>
                            <li>Repaired products carry the remaining original warranty period</li>
                            <li>Replacement products come with a fresh 1-year warranty</li>
                        </ul>

                        <h2 className="font-display text-2xl font-bold mb-4">Service Centers</h2>
                        <p className="mb-4">
                            We have authorized service centers in major cities:
                        </p>
                        <ul className="space-y-2 mb-8">
                            <li><strong>Delhi NCR:</strong> Our main service center (address provided on claim approval)</li>
                            <li><strong>Other Cities:</strong> Authorized service partners in Mumbai, Bangalore, Hyderabad, Chennai</li>
                        </ul>

                        <h2 className="font-display text-2xl font-bold mb-4">Extended Warranty</h2>
                        <p className="mb-8">
                            Looking for additional coverage? Contact us about extended warranty plans available for purchase.
                            Extended warranties can provide coverage up to 3 years from purchase date.
                        </p>

                        <h2 className="font-display text-2xl font-bold mb-4">Contact Warranty Support</h2>
                        <p className="mb-4">
                            For warranty claims and support:
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
