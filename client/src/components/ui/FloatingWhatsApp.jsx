"use client";

import Image from "next/image";

export const FloatingWhatsApp = () => {
  const phoneNumber = "919250214749";
  const message = encodeURIComponent("Hi, I'm interested in your products. Please share more details.");
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-14 md:bottom-6 md:right-6 right-2 z-50 group"
      aria-label="Chat on WhatsApp"
    >
      <div className="relative">
        {/* Pulse Animation */}
        <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-30" />
        
        {/* WhatsApp Button */}
        <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-full bg-green-500 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center overflow-hidden">
          <Image
            src="/whatsapp.png"
            alt="WhatsApp"
            width={40}
            height={40}
            className="w-8 h-8 md:w-10 md:h-10 object-contain"
          />
        </div>

        {/* Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-white text-gray-800 px-3 py-2 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          Chat with us
          <div className="absolute left-full top-1/2 -translate-y-1/2 border-8 border-transparent border-l-white" />
        </div>
      </div>
    </a>
  );
};
