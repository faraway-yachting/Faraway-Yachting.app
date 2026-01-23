import {
  Calculator,
  Package,
  Wrench,
  Calendar,
  Users,
  UserCircle,
} from "lucide-react";
import type { ModuleName } from "@/lib/supabase/api/userModuleRoles";

export interface Module {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  status: "live" | "beta" | "coming-soon";
  href?: string;
  moduleKey: ModuleName;
}

export const modules: Module[] = [
  {
    title: "Accounting and Finance",
    description: "Complete financial management and reporting",
    icon: Calculator,
    status: "live",
    href: "/accounting",
    moduleKey: "accounting",
  },
  {
    title: "Bookings",
    description: "Manage charters and reservations",
    icon: Calendar,
    status: "beta",
    href: "/bookings",
    moduleKey: "bookings",
  },
  {
    title: "Inventory",
    description: "Track parts, supplies, and equipment",
    icon: Package,
    status: "coming-soon",
    moduleKey: "inventory",
  },
  {
    title: "Maintenance",
    description: "Schedule and track vessel maintenance",
    icon: Wrench,
    status: "coming-soon",
    moduleKey: "maintenance",
  },
  {
    title: "Customers",
    description: "Client relationships and communications",
    icon: Users,
    status: "coming-soon",
    moduleKey: "customers",
  },
  {
    title: "HR",
    description: "Crew management and scheduling",
    icon: UserCircle,
    status: "coming-soon",
    moduleKey: "hr",
  },
];
