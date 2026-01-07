import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    trend: "up" | "down" | "neutral";
  };
  icon?: LucideIcon;
  subtitle?: string;
  variant?: "default" | "success" | "warning" | "danger";
}

export function KPICard({
  title,
  value,
  change,
  icon: Icon,
  subtitle,
  variant = "default",
}: KPICardProps) {
  const variantStyles = {
    default: "bg-white border-gray-200",
    success: "bg-green-50 border-green-200",
    warning: "bg-yellow-50 border-yellow-200",
    danger: "bg-red-50 border-red-200",
  };

  const iconBgStyles = {
    default: "bg-[#5A7A8F]",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    danger: "bg-red-500",
  };

  const trendStyles = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-gray-600",
  };

  const trendIcons = {
    up: "↑",
    down: "↓",
    neutral: "→",
  };

  return (
    <div
      className={`rounded-lg border p-6 shadow-sm ${variantStyles[variant]}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {change && (
              <span
                className={`inline-flex items-center text-sm font-medium ${
                  trendStyles[change.trend]
                }`}
              >
                {trendIcons[change.trend]} {change.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${iconBgStyles[variant]}`}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}
