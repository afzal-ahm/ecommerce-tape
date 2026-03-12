"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function FAQsPage() {
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredFaqs, setFilteredFaqs] = useState([]);
    const [activeCategory, setActiveCategory] = useState("all");
    const [categories, setCategories] = useState(["all"]);

    useEffect(() => {
        async function fetchFAQs() {
            setLoading(true);
            try {
                const response = await fetchApi("/faqs");

                // Handle various possible response formats
                let faqsData = [];
                if (response?.data?.faqs && Array.isArray(response.data.faqs)) {
                    faqsData = response.data.faqs;
                } else if (Array.isArray(response?.data)) {
                    faqsData = response.data;
                } else if (response?.data?.data && Array.isArray(response.data.data)) {
                    faqsData = response.data.data;
                }

                setFaqs(faqsData);
                setFilteredFaqs(faqsData);

                // Fetch categories
                const categoriesResponse = await fetchApi("/faqs/categories");

                let categoriesData = [];
                if (categoriesResponse?.data?.categories) {
                    categoriesData = categoriesResponse.data.categories;
                } else if (Array.isArray(categoriesResponse?.data)) {
                    categoriesData = categoriesResponse.data;
                } else if (
                    categoriesResponse?.data?.data &&
                    Array.isArray(categoriesResponse.data.data)
                ) {
                    categoriesData = categoriesResponse.data.data;
                }

                if (categoriesData.length) {
                    setCategories(["all", ...categoriesData.map((cat) => cat.name)]);
                }
            } catch (error) {
                console.error("Failed to fetch FAQs:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchFAQs();
    }, []);

    // Filter FAQs based on search query and category
    useEffect(() => {
        if (!faqs.length) return;

        let filtered = faqs;

        if (activeCategory !== "all") {
            filtered = filtered.filter((faq) => faq.category === activeCategory);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (faq) =>
                    faq.question.toLowerCase().includes(query) ||
                    faq.answer.toLowerCase().includes(query)
            );
        }

        filtered = [...filtered].sort((a, b) => a.order - b.order);

        setFilteredFaqs(filtered);
    }, [searchQuery, activeCategory, faqs]);

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleCategoryChange = (category) => {
        setActiveCategory(category);
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto">
                    <Skeleton className="h-10 w-1/2 mx-auto mb-6" />
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-5 w-3/4 mb-10 mx-auto" />
                    <Skeleton className="h-12 w-full mb-8" />
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="border rounded-md p-2">
                                <Skeleton className="h-8 w-full mb-2" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <main className="py-12 md:py-16">
            <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">
                        Frequently Asked Questions
                    </h1>
                    <p className="text-lg text-gray-600 text-center mb-12 max-w-2xl mx-auto">
                        Find answers to common questions about our products, ordering,
                        shipping, and more.
                    </p>

                    {/* Search bar */}
                    <div className="relative max-w-lg mx-auto mb-8">
                        <Input
                            type="text"
                            placeholder="Search FAQs..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="w-full pl-10 pr-4 py-2 rounded-md border-gray-300 focus:border-primary focus:ring-primary"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>

                    {/* Category filters */}
                    {categories.length > 1 && (
                        <div className="flex flex-wrap justify-center gap-2 mb-8">
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => handleCategoryChange(category)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === category
                                        ? "bg-primary text-white"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                >
                                    {category === "all" ? "All Questions" : category}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* FAQ Accordion */}
                    {filteredFaqs.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full space-y-4">
                            {filteredFaqs.map((faq) => (
                                <AccordionItem
                                    key={faq.id}
                                    value={faq.id.toString()}
                                    className="border rounded-md px-2"
                                >
                                    <AccordionTrigger className="text-lg font-medium py-4 px-2 hover:no-underline">
                                        {faq.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="px-2 pb-4 pt-1 text-gray-600">
                                        <div dangerouslySetInnerHTML={{ __html: faq.answer }} />
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-lg font-medium mb-2">
                                No FAQs found for &quot;{searchQuery}&quot;
                            </p>
                            <span className="text-gray-600">
                                Try a different search term or{" "}
                                <button
                                    onClick={() => {
                                        setSearchQuery("");
                                        setActiveCategory("all");
                                    }}
                                    className="text-primary hover:underline"
                                >
                                    view all FAQs
                                </button>
                            </span>
                        </div>
                    )}

                    {/* Contact section */}
                    <div className="mt-16 bg-gray-50 p-8 rounded-lg text-center">
                        <h2 className="text-xl font-bold mb-3">Still have questions?</h2>
                        <p className="text-gray-600 mb-6">
                            Can&apos;t find the answer you&apos;re looking for? Please contact
                            our support team.
                        </p>
                        <div className="flex justify-center gap-4">
                            <a
                                href="/contact"
                                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                            >
                                Contact Us
                            </a>
                            <a
                                href="mailto:support@dj-challenger.com"
                                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                Email Support
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
