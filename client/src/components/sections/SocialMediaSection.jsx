"use client";

import { Instagram, Facebook, Youtube, Play, Heart, Users, ArrowRight } from "lucide-react";

const socialLinks = [
  {
    name: "Instagram",
    handle: "@official_dfixventure",
    url: "https://www.instagram.com/official_dfixventure/",
    icon: Instagram,
    color: "from-purple-500 via-pink-500 to-orange-400",
    hoverBg: "hover:bg-gradient-to-br hover:from-purple-500 hover:via-pink-500 hover:to-orange-400",
    stats: "Daily Updates",
    description: "Behind the scenes, new products & customer stories"
  },
  {
    name: "Facebook",
    handle: "D fix India",
    url: "https://www.facebook.com/share/1DCsKYB5Uy/?mibextid=wwXIfr",
    icon: Facebook,
    color: "from-blue-600 to-blue-500",
    hoverBg: "hover:bg-gradient-to-br hover:from-blue-600 hover:to-blue-500",
    stats: "Community",
    description: "Join our community of audio professionals"
  },
  {
    name: "YouTube",
    handle: "@@dfixventure",
    url: "https://youtube.com/@@dfixventure?si=ZkkCpU1DEh48NBSe",
    icon: Youtube,
    color: "from-red-600 to-red-500",
    hoverBg: "hover:bg-gradient-to-br hover:from-red-600 hover:to-red-500",
    stats: "Video Reviews",
    description: "Product demos, setup guides & sound tests"
  }
];

export const SocialMediaSection = () => {
  return (
    <section className="py-12 md:py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-medium mb-4">
            <Heart className="w-4 h-4" />
            Connect With Us
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3">
            Follow DJ-Challenger
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Stay updated with latest products, exclusive offers, and audio tips from professionals
          </p>
        </div>

        {/* Social Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {socialLinks.map((social, index) => (
            <a
              key={index}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative bg-white rounded-2xl p-6 border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              {/* Background gradient on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${social.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              
              {/* Content */}
              <div className="relative z-10">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${social.color} flex items-center justify-center mb-4 group-hover:bg-white/20 transition-colors shadow-lg`}>
                  <social.icon className="w-7 h-7 text-white" />
                </div>

                {/* Info */}
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-white transition-colors mb-1">
                  {social.name}
                </h3>
                <p className="text-primary group-hover:text-white/90 font-medium text-sm mb-2 transition-colors">
                  {social.handle}
                </p>
                <p className="text-gray-500 group-hover:text-white/80 text-sm transition-colors mb-4">
                  {social.description}
                </p>

                {/* CTA */}
                <div className="flex items-center gap-2 text-primary group-hover:text-white font-semibold text-sm transition-colors">
                  <span>Follow Us</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-gradient-to-br from-white/0 to-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-10">
          <p className="text-gray-500 text-sm mb-4">
            Join thousands of audio professionals following DJ-Challenger
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4 text-primary" />
              <span>50K+ Community</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Play className="w-4 h-4 text-primary" />
              <span>100+ Videos</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Heart className="w-4 h-4 text-primary" />
              <span>Daily Updates</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialMediaSection;
