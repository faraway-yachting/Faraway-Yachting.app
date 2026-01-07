import { Anchor, BarChart3, Cog, Shield } from "lucide-react";

export const appConfig = {
  appName: "Faraway Yachting",
  appInitials: "FY",
  tagline: "Run your entire yacht operation from one dashboard",
  description:
    "From accounting and operations to everything in between — built for multi-boat, multi-company yacht businesses.",
  benefits: [
    {
      icon: Anchor,
      title: "Multi-boat management",
      description: "Manage your entire fleet from a single platform",
    },
    {
      icon: BarChart3,
      title: "Real-time financial tracking",
      description: "Monitor revenue, expenses, and profitability instantly",
    },
    {
      icon: Cog,
      title: "Integrated operations",
      description: "Seamlessly connect accounting, bookings, and maintenance",
    },
    {
      icon: Shield,
      title: "Enterprise security",
      description: "Bank-level encryption and role-based access control",
    },
  ],
  steps: [
    {
      number: 1,
      title: "Connect your data",
      description: "Import existing records or start fresh",
    },
    {
      number: 2,
      title: "Configure modules",
      description: "Activate only the features you need",
    },
    {
      number: 3,
      title: "Run your operation",
      description: "Manage everything from one dashboard",
    },
  ],
  security: [
    "Bank-level encryption for all data",
    "SOC 2 Type II compliant",
    "Role-based access control",
    "Regular security audits and updates",
  ],
};
