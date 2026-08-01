"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Braces, FileText, Radio, UserRound } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { cn } from "@/src/lib/utils";

const links = [
  { href: "/", label: "Documents", icon: FileText },
  { href: "/format", label: "Formatter", icon: Braces },
  { href: "/collab/?room=welcome", label: "Live", icon: Radio },
  { href: "/dashboard", label: "Account", icon: UserRound },
];

export default function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="app-header">
      <Link href="/" className="app-logo"><span>T</span><strong>TxtHero</strong></Link>
      <nav aria-label="Primary navigation">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={cn(pathname === href || (href !== "/" && pathname.startsWith(href.split("?")[0])) ? "active" : "")}>
            <Icon size={16} /><span>{label}</span>
          </Link>
        ))}
      </nav>
      <ThemeToggle />
    </header>
  );
}
