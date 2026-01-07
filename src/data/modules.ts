import {
  Calculator,
  Package,
  Wrench,
  Calendar,
  Users,
  UserCircle,
} from "lucide-react";

export interface Module {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  status: "live" | "beta" | "coming-soon";
  href?: string;
}

export const modules: Module[] = [
  {
    title: "Accounting and Finance",
    description: "Complete financial management and reporting",
    icon: Calculator,
    status: "live",
    href: "/accounting",
  },
  {
    title: "Bookings",
    description: "Manage charters and reservations",
    icon: Calendar,
    status: "coming-soon",
  },
  {
    title: "Inventory",
    description: "Track parts, supplies, and equipment",
    icon: Package,
    status: "coming-soon",
  },
  {
    title: "Maintenance",
    description: "Schedule and track vessel maintenance",
    icon: Wrench,
    status: "coming-soon",
  },
  {
    title: "Customers",
    description: "Client relationships and communications",
    icon: Users,
    status: "coming-soon",
  },
  {
    title: "HR",
    description: "Crew management and scheduling",
    icon: UserCircle,
    status: "coming-soon",
  },
];
