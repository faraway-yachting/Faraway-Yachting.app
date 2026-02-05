"use client";

import { Badge } from "./ui/Badge";
import { Module } from "@/data/modules";

interface ModuleCardProps {
  module: Module;
  onNotify: (moduleName: string) => void;
}

export function ModuleCard({ module, onNotify }: ModuleCardProps) {
  const { title, description, icon: Icon, status, href } = module;

  const isActive = status === "live" || status === "beta";

  const handleClick = () => {
    if (href) {
      window.location.href = href;
    } else {
      onNotify(title);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={`relative bg-white/60 rounded-xl p-8 transition-all duration-200 border border-white/40 h-full backdrop-blur-sm cursor-pointer ${
        href ? "hover:bg-white/80 hover:shadow-xl hover:-translate-y-1" : ""
      }`}
    >
      <div className="absolute top-4 right-4">
        <Badge status={status} />
      </div>

      <div className="flex flex-col items-center text-center gap-4 mt-4">
        <div
          className={`w-16 h-16 flex items-center justify-center rounded-full ${
            isActive ? "bg-[#5A7A8F]" : "bg-gray-200"
          }`}
        >
          <Icon
            size={32}
            className={isActive ? "text-white" : "text-gray-500"}
          />
        </div>

        <h3 className="text-xl font-semibold text-[#2c3e50]">{title}</h3>
        <p className="text-sm text-[#2c3e50]/80">{description}</p>
      </div>
    </div>
  );
}
