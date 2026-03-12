"use client";

import { Star, Quote, ChevronLeft, ChevronRight, Users } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Rahul Sharma",
    location: "Mumbai",
    rating: 5,
    review: "Amazing quality products! Fast delivery and exactly as described. Will definitely order again.",
  },
  {
    id: 2,
    name: "Priya Patel",
    location: "Delhi",
    rating: 5,
    review: "Best shopping experience! Great customer service and genuine products. Highly recommended!",
  },
  {
    id: 3,
    name: "Amit Kumar",
    location: "Bangalore",
    rating: 5,
    review: "Excellent quality and quick shipping. D-Fix Kart is now my go-to store for all purchases.",
  },
  {
    id: 4,
    name: "Sneha Gupta",
    location: "Hyderabad",
    rating: 5,
    review: "Love the variety and quality! The COD option makes shopping so convenient.",
  },
];

export function CustomerReviews() {
  return (
    <section className="section-padding bg-white">
      <div className="section-container">
        {/* Header */}
        <div className="section-header">
          <span className="section-badge">
            <Users className="w-4 h-4" />
            Customer Reviews
          </span>
          <h2 className="section-title">What Our Customers Say</h2>
          <p className="section-subtitle">Trusted by thousands of happy customers across India</p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-primary/20 hover:shadow-lg transition-all duration-300"
            >
              {/* Quote Icon */}
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Quote className="w-5 h-5 text-primary" />
              </div>

              {/* Stars */}
              <div className="flex gap-1 mb-3">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>

              {/* Review Text */}
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                &quot;{testimonial.review}&quot;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <div className="w-10 h-10 rounded-full bg-[#2D2D2D] flex items-center justify-center text-white font-bold text-sm">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{testimonial.name}</p>
                  <p className="text-gray-500 text-xs">{testimonial.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-12 pt-10 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl md:text-4xl font-bold text-primary mb-1">50K+</p>
              <p className="text-gray-500 text-sm">Happy Customers</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-primary mb-1">4.8</p>
              <p className="text-gray-500 text-sm">Average Rating</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-primary mb-1">99%</p>
              <p className="text-gray-500 text-sm">Satisfaction Rate</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-primary mb-1">24/7</p>
              <p className="text-gray-500 text-sm">Support Available</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CustomerReviews;
