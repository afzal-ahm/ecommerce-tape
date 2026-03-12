export const PageLayout = ({ children, variant = "default" }) => {
  const variants = {
    default: "bg-page",
    white: "bg-white",
    light: "bg-section-light",
  };

  return (
    <div className={`min-h-screen ${variants[variant]}`}>
      {children}
    </div>
  );
};

export const Section = ({ children, variant = "white", className = "" }) => {
  const variants = {
    white: "bg-section-white",
    light: "bg-section-light",
    page: "bg-page",
    muted: "bg-muted/30",
    primary: "bg-primary/5",
    dark: "bg-foreground text-white",
  };

  return (
    <section className={`${variants[variant]} ${className}`}>
      {children}
    </section>
  );
};
