"use client";

import Link from "next/link";
import { Badge } from "./ui/Badge";
import { Module } from "@/data/modules";

interface ModuleCardProps {
  module: Module;
  onNotify: (moduleName: string) => void;
}

export function ModuleCard({ module, onNotify }: ModuleCardProps) {
  const { title, description, icon: Icon, status, href } = module;

  const handleClick = () => {
    if (status !== "live" && !href) {
      onNotify(title);
    }
  };

  const cardContent = (
    <div className="relative bg-white/60 hover:bg-white/80 rounded-xl p-8 transition-all duration-200 hover:shadow-xl hover:-translate-y-1 cursor-pointer border border-white/40 h-full backdrop-blur-sm">
      {/* Status Badge */}
      <div className="absolute top-4 right-4">
        <Badge status={status} />
      </div>

      {/* Icon */}
      <div className="flex flex-col items-center text-center gap-4 mt-4">
        <div
          className={`w-16 h-16 flex items-center justify-center rounded-full ${
            status === "live" ? "bg-[#5A7A8F]" : "bg-gray-200"
          }`}
        >
          <Icon
            size={32}
            className={status === "live" ? "text-white" : "text-gray-500"}
          />
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-[#2c3e50]">{title}</h3>

        {/* Description */}
        <p className="text-sm text-[#2c3e50]/80">{description}</p>
      </div>
    </div>
  );

  if (status === "live" && href) {
    return <Link href={href}>{cardContent}</Link>;
  }

  return <div onClick={handleClick}>{cardContent}</div>;
}
