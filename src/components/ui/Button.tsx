import Link from "next/link";
import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  onClick?: () => void | Promise<void>;
  href?: string;
  className?: string;
  disabled?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
  href,
  className = "",
  disabled = false,
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variantStyles = {
    primary:
      "bg-[#5A7A8F] text-white hover:bg-[#2c3e50] focus:ring-[#5A7A8F] shadow-md hover:shadow-lg",
    secondary:
      "bg-white text-[#2c3e50] border-2 border-[#5A7A8F] hover:bg-[#5A7A8F] hover:text-white focus:ring-[#5A7A8F]",
    outline:
      "bg-transparent text-white border-2 border-white hover:bg-white hover:text-[#2c3e50] focus:ring-white",
  };

  const sizeStyles = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const disabledStyles = disabled ? "opacity-50 cursor-not-allowed" : "";

  const combinedStyles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${className}`;

  if (href) {
    return (
      <Link href={href} className={combinedStyles}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={combinedStyles}>
      {children}
    </button>
  );
}
