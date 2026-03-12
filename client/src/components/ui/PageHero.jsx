import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const PageHero = ({ 
  title, 
  description, 
  breadcrumbs = [],
  variant = "default",
  size = "md"
}) => {
  const variants = {
    default: "bg-hero-brand",
    gradient: "bg-hero-gradient",
    dark: "bg-hero-dark",
    white: "bg-white",
  };

  const sizes = {
    sm: "py-12 md:py-16",
    md: "py-16 md:py-20 lg:py-24",
    lg: "py-20 md:py-28 lg:py-32",
  };

  const isDark = variant === "dark";

  return (
    <section className={`${variants[variant]} ${sizes[size]} border-b border-border/50`}>
      <div className="section-container">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-2 text-sm mb-6">
            <Link 
              href="/" 
              className={`transition-colors ${
                isDark ? "text-white/60 hover:text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Home
            </Link>
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center gap-2">
                <ChevronRight className={`h-4 w-4 ${isDark ? "text-white/40" : "text-muted-foreground/50"}`} />
                {crumb.href ? (
                  <Link 
                    href={crumb.href}
                    className={`transition-colors ${
                      isDark ? "text-white/60 hover:text-white" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isDark ? "text-white/90" : "text-foreground"}>
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Title */}
        <h1 className={`font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4 max-w-4xl ${
          isDark ? "text-white" : "text-foreground"
        }`}>
          {title}
        </h1>

        {/* Description */}
        {description && (
          <p className={`text-lg md:text-xl max-w-3xl ${
            isDark ? "text-white/70" : "text-muted-foreground"
          }`}>
            {description}
          </p>
        )}
      </div>
    </section>
  );
};

export default PageHero;
