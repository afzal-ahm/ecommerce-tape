"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, User, Phone, Mail, MessageSquare, Package } from "lucide-react";

export const EnquiryForm = ({ productName = "", productUrl = "" }) => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    product: productName,
    productUrl: productUrl || (typeof window !== 'undefined' ? window.location.href : ''),
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Log form data to console
    console.log("=== ENQUIRY FORM SUBMISSION ===");
    console.log("Name:", formData.name);
    console.log("Phone:", formData.phone);
    console.log("Email:", formData.email);
    console.log("Product:", formData.product);
    console.log("Product URL:", formData.productUrl);
    console.log("Message:", formData.message);
    console.log("Timestamp:", new Date().toISOString());
    console.log("================================");
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({
        name: "",
        phone: "",
        email: "",
        product: productName,
        productUrl: productUrl || (typeof window !== 'undefined' ? window.location.href : ''),
        message: "",
      });
    }, 3000);
  };

  if (isSubmitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="font-display text-xl font-semibold text-green-800 mb-2">
          Enquiry Sent Successfully!
        </h3>
        <p className="text-green-600">
          Thank you for your enquiry. We will contact you shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
          Your Name <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Enter your name"
            className="w-full pl-10 pr-4 py-2.5 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1.5">
          Phone Number <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            placeholder="Enter your phone number"
            className="w-full pl-10 pr-4 py-2.5 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
          Email Address <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="Enter your email"
            className="w-full pl-10 pr-4 py-2.5 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Product (if applicable) */}
      {productName && (
        <div>
          <label htmlFor="product" className="block text-sm font-medium text-foreground mb-1.5">
            Product
          </label>
          <div className="relative">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              id="product"
              name="product"
              value={formData.product}
              readOnly
              className="w-full pl-10 pr-4 py-2.5 border border-input rounded-lg bg-muted text-muted-foreground"
            />
          </div>
        </div>
      )}

      {/* Message */}
      <div className="md:col-span-2">
        <label htmlFor="message" className="block text-sm font-medium text-foreground mb-1.5">
          Message
        </label>
        <div className="relative">
          <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={4}
            placeholder="Enter your message or requirements..."
            className="w-full pl-10 pr-4 py-2.5 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
          />
        </div>
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        variant="hero" 
        size="lg" 
        className="w-full gap-2 md:col-span-2 py-2"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Send Enquiry
          </>
        )}
      </Button>
    </form>
  );
};
