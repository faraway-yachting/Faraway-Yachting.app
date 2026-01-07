import { ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  background?: "white" | "gray" | "navy" | "teal";
  className?: string;
}

export function Section({
  children,
  background = "white",
  className = "",
}: SectionProps) {
  const backgroundStyles = {
    white: "bg-white/40",
    gray: "bg-white/20",
    navy: "bg-[#8FADC2]",
    teal: "bg-[#A8C5D6]",
  };

  return (
    <section className={`${backgroundStyles[background]} ${className}`}>
      <div className="max-w-7xl mx-auto px-6 py-8 md:py-12">{children}</div>
    </section>
  );
}
