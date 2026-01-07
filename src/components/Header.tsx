import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/Button";
import { appConfig } from "@/config/app.config";

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Image
            src="/logo.jpg"
            alt="Faraway Yachting Logo"
            width={100}
            height={100}
            className="object-contain"
          />
        </Link>
        <div className="flex gap-3">
          <Button variant="primary">Request Demo</Button>
          <Button variant="secondary">Sign In</Button>
        </div>
      </div>
    </header>
  );
}
