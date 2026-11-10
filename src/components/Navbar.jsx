"use client";

import { useEffect, useState } from "react";
import { Menu, X, Scissors, Shield, LayoutDashboard, UserCheck, LogOut, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
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
    { name: "Barbers", href: "/barbers" },
    { name: "Services", href: "/services/haircut" },
    { name: "Reviews", href: "/reviews" },
    { name: "About", href: "/about" },
    { name: "FAQ", href: "/faq" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/95 backdrop-blur-md shadow-sm border-b border-border/80 py-2"
          : "bg-background/80 backdrop-blur-sm py-3"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-14">
          {/* Brand Logo & Wordmark */}
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="Trimlly home">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-200">
              <Scissors className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-wider text-xl uppercase text-foreground flex items-center gap-1.5">
                Trimlly
                <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
              </span>
              <span className="text-[10px] tracking-widest text-muted-foreground uppercase font-semibold -mt-1">
                India Booking
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-foreground/80 hover:text-primary font-medium text-sm transition-colors duration-150"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Right Action Stack */}
          <div className="hidden md:flex items-center gap-2.5">
            {session ? (
              <div className="flex items-center gap-2">
                {session.user?.role === "admin" && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm" className="rounded-xl border-primary/30 text-primary gap-1.5 font-semibold">
                      <Shield className="w-3.5 h-3.5" />
                      Admin
                    </Button>
                  </Link>
                )}
                {session.user?.role === "barber" && (
                  <Link href="/dashboard/barber">
                    <Button variant="outline" size="sm" className="rounded-xl border-primary/30 text-primary gap-1.5 font-semibold">
                      <UserCheck className="w-3.5 h-3.5" />
                      Workspace
                    </Button>
                  </Link>
                )}
                <NotificationsMenu />
                <Link href="/dashboard">
                  <Button size="sm" className="rounded-xl gap-1.5 font-semibold shadow-sm">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Dashboard
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-xl text-muted-foreground hover:text-destructive"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/for-barbers">
                  <Button variant="ghost" size="sm" className="rounded-xl font-semibold gap-1.5 text-muted-foreground hover:text-primary">
                    <Store className="w-3.5 h-3.5 text-primary" />
                    For Barbers
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="sm" className="rounded-xl font-semibold">
                    Sign In
                  </Button>
                </Link>
                <Link href="/barbers">
                  <Button size="sm" className="rounded-xl font-semibold shadow-sm">
                    Book Now
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            className="lg:hidden p-2.5 rounded-xl hover:bg-muted border border-border/50 text-foreground transition-colors"
            onClick={() => setIsMobileMenuOpen((value) => !value)}
            aria-label="Toggle navigation"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 space-y-3 border-t border-border/60 mt-2 bg-background/95 backdrop-blur-lg animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="block px-3 py-2.5 rounded-xl text-foreground/80 hover:text-primary hover:bg-muted font-medium transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="pt-3 border-t border-border/60 space-y-2">
              {session ? (
                <>
                  {session.user?.role === "admin" && (
                    <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full justify-start rounded-xl gap-2 text-primary">
                        <Shield className="w-4 h-4" /> Admin Portal
                      </Button>
                    </Link>
                  )}
                  {session.user?.role === "barber" && (
                    <Link href="/dashboard/barber" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full justify-start rounded-xl gap-2 text-primary">
                        <UserCheck className="w-4 h-4" /> Barber Workspace
                      </Button>
                    </Link>
                  )}
                  <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full justify-start rounded-xl gap-2">
                      <LayoutDashboard className="w-4 h-4" /> My Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="w-full justify-start rounded-xl gap-2 text-destructive hover:bg-destructive/10"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    <LogOut className="w-4 h-4" /> Log out
                  </Button>
                </>
              ) : (
                <div className="space-y-2">
                  <Link href="/for-barbers" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full rounded-xl gap-2">
                      <Store className="w-4 h-4 text-primary" /> For Barbers & Salon Owners
                    </Button>
                  </Link>
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full rounded-xl">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/barbers" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button className="w-full rounded-xl">
                        Book Now
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
