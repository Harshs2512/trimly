"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import NotificationsMenu from "@/components/NotificationsMenu";

export default function Navbar() {
  const { data: session } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Features", href: "/#features" },
    { name: "Benefits", href: "/#benefits" },
    { name: "About", href: "/#about" },
    { name: "Barbers", href: "/barbers" },
    { name: "Contact", href: "/#contact" },
  ];

  return (
    <nav className={`sticky top-0 z-50 transition-all py-1 duration-300 ${isScrolled ? "bg-background/95 backdrop-blur-md shadow-sm border-b" : "bg-background/80 backdrop-blur-sm"}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-14">
          <Link href="/" className="flex items-center" aria-label="Trimlly home"><Image src="/logo.png" width={60} height={50} alt="Trimlly" className="h-12 w-auto object-contain" /></Link>
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => <Link key={link.name} href={link.href} className="text-foreground/80 hover:text-primary font-medium transition-colors">{link.name}</Link>)}
            {session ? <div className="flex items-center gap-2">{session.user?.role === "admin" && <Link href="/admin"><Button variant="outline" size="sm">Admin</Button></Link>}<NotificationsMenu /><Link href="/dashboard"><Button size="sm">Dashboard</Button></Link><Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>Log out</Button></div> : <Link href="/login"><Button size="sm">Login / Register</Button></Link>}
          </div>
          <button type="button" className="md:hidden p-2 rounded-lg hover:bg-muted" onClick={() => setIsMobileMenuOpen((value) => !value)} aria-label="Toggle navigation" aria-expanded={isMobileMenuOpen}>{isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
        </div>
        {isMobileMenuOpen && <div className="md:hidden py-4 space-y-2 border-t bg-background/95">{navLinks.map((link) => <Link key={link.name} href={link.href} className="block py-2 font-medium" onClick={() => setIsMobileMenuOpen(false)}>{link.name}</Link>)}{session ? <div className="pt-2 space-y-2">{session.user?.role === "admin" && <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}><Button variant="outline" className="w-full">Admin</Button></Link>}{session.user?.role === "barber" && <Link href="/dashboard/barber" onClick={() => setIsMobileMenuOpen(false)}><Button variant="outline" className="w-full">Barber Workspace</Button></Link>}<Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}><Button className="w-full">Dashboard</Button></Link><Button variant="ghost" className="w-full" onClick={() => signOut({ callbackUrl: "/" })}>Log out</Button></div> : <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}><Button className="w-full">Login / Register</Button></Link>}</div>}
      </div>
    </nav>
  );
}
