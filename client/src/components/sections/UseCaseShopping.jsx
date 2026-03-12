import Link from "next/link";
import { ArrowRight, PartyPopper, Music2, Church, GraduationCap } from "lucide-react";

const useCases = [
  {
    icon: PartyPopper,
    title: "Events & Weddings",
    description: "Powerful sound for memorable celebrations",
    link: "/products?usecase=events",
    color: "from-orange-500/10 to-orange-500/5"
  },
  {
    icon: Music2,
    title: "Professional DJs",
    description: "Stage-ready equipment built to perform",
    link: "/products?usecase=dj",
    color: "from-purple-500/10 to-purple-500/5"
  },
  {
    icon: Church,
    title: "Religious Venues",
    description: "Clear audio for worship spaces",
    link: "/products?usecase=religious",
    color: "from-blue-500/10 to-blue-500/5"
  },
  {
    icon: GraduationCap,
    title: "Schools & Colleges",
    description: "Reliable PA systems for education",
    link: "/products?usecase=education",
    color: "from-green-500/10 to-green-500/5"
  }
];

export const UseCaseShopping = () => {
  return (
    <section className="section-padding bg-muted/30">
      <div className="section-container">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-sm font-medium text-primary uppercase tracking-wide mb-2">
            Solutions For
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
            Shop by Use Case
          </h2>
        </div>

        {/* Use Case Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {useCases.map((useCase, index) => (
            <Link
              key={index}
              href={useCase.link}
              className="group bg-white rounded-2xl p-8 transition-all hover:shadow-xl"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${useCase.color} flex items-center justify-center mb-6`}>
                <useCase.icon className="h-7 w-7 text-foreground" />
              </div>
              
              <h3 className="font-display text-xl font-bold text-foreground mb-2">
                {useCase.title}
              </h3>
              <p className="text-muted-foreground mb-4">
                {useCase.description}
              </p>
              
              <span className="inline-flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all">
                Shop Now
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
