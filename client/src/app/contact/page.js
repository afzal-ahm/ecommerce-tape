"use client";

import { useState } from "react";
import { MapPin, Phone, Mail, Clock, Send, Loader2, MessageSquare, Headphones, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { fetchApi } from "@/lib/utils";
import { toast } from "sonner";

export default function ContactPage() {
    const [formLoading, setFormLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        subject: "Product Inquiry",
        message: "",
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);

        try {
            const response = await fetchApi("/content/contact", {
                method: "POST",
                body: JSON.stringify(formData),
            });

            toast.success(response.data?.message || "Message sent successfully!");
            setFormData({ name: "", email: "", phone: "", subject: "Product Inquiry", message: "" });
        } catch (error) {
            toast.error(error.message || "Something went wrong. Please try again.");
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Hero */}
            <section className="py-16 md:py-20 bg-gradient-section">
                <div className="section-container text-center">
                    <span className="section-badge mb-4">
                        <MessageSquare className="w-4 h-4" />
                        Get in Touch
                    </span>
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4">
                        Contact <span className="text-primary">Us</span>
                    </h1>
                    <p className="text-gray-600 max-w-xl mx-auto">
                        Have questions? We are here to help. Reach out to us anytime.
                    </p>
                </div>
            </section>

            {/* Contact Cards */}
            <section className="section-container -mt-6 pb-12">
                <div className="grid md:grid-cols-3 gap-4">
                    <a href="mailto:dfixventure@gmail.com" className="card-premium p-6 text-center hover:border-primary/20 group">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-white transition-all">
                            <Mail className="h-6 w-6 text-primary group-hover:text-white" />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">Email Us</h3>
                        <p className="text-primary font-medium text-sm">dfixventure@gmail.com</p>
                    </a>

                    <a href="tel:+918851907674" className="card-premium p-6 text-center hover:border-primary/20 group">
                        <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500 transition-all">
                            <Phone className="h-6 w-6 text-green-600 group-hover:text-white" />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">Call Us</h3>
                        <p className="text-green-600 font-medium text-sm">+91 88519 07674</p>
                    </a>

                    <div className="card-premium p-6 text-center">
                        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <MapPin className="h-6 w-6 text-blue-600" />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1">Location</h3>
                        <p className="text-gray-600 text-sm">B 19/1 Double Story, Ramesh Nagar, New Delhi 110015</p>
                    </div>
                </div>
            </section>

            {/* Contact Form */}
            <section className="section-padding bg-gradient-section">
                <div className="section-container">
                    <div className="grid lg:grid-cols-5 gap-10">
                        {/* Left */}
                        <div className="lg:col-span-2">
                            <span className="section-badge mb-4">Send a Message</span>
                            <h2 className="section-title mb-4">Have a Question?</h2>
                            <p className="text-gray-600 mb-8">
                                Fill out the form and our team will get back to you within 24 hours.
                            </p>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Headphones className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 text-sm">Expert Support</h4>
                                        <p className="text-gray-500 text-xs">Get help from our specialists</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Clock className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 text-sm">Business Hours</h4>
                                        <p className="text-gray-500 text-xs">Mon-Sat: 9 AM - 7 PM</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                                            <input type="text" name="name" value={formData.name} onChange={handleInputChange} required placeholder="John Doe" className="input-premium" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone *</label>
                                            <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required placeholder="+91 9876543210" className="input-premium" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} required placeholder="you@example.com" className="input-premium" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                                        <select name="subject" value={formData.subject} onChange={handleInputChange} className="input-premium">
                                            <option>Product Inquiry</option>
                                            <option>Order Support</option>
                                            <option>Return/Refund</option>
                                            <option>Other</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Message *</label>
                                        <textarea name="message" value={formData.message} onChange={handleInputChange} required rows={4} placeholder="Your message..." className="input-premium resize-none" />
                                    </div>

                                    <Button type="submit" size="lg" className="w-full btn-primary h-12 gap-2" disabled={formLoading}>
                                        {formLoading ? (
                                            <><Loader2 className="h-5 w-5 animate-spin" /> Sending...</>
                                        ) : (
                                            <><Send className="h-5 w-5" /> Send Message</>
                                        )}
                                    </Button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="section-padding-sm bg-white border-t border-gray-100">
                <div className="section-container">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-1">Ready to shop?</h2>
                            <p className="text-gray-600 text-sm">Browse our collection of premium products</p>
                        </div>
                        <Link href="/products">
                            <Button size="lg" className="btn-primary h-12 px-8 gap-2">
                                Browse Products <ArrowRight className="w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
