'use client'
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Image from "next/image";

const Navbar = () => {
    const { data: session } = useSession();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navLinks = [
        { name: "Home", href: "/" },
        { name: "Features", href: "#features" },
        { name: "Benefits", href: "#benefits" },
        { name: "About", href: "#about" },
        { name: "Contact", href: "#contact" },
    ];

    return (
        <nav
            className={`sticky top-0 left-0 right-0 z-50 transition-all py-1 duration-300 ${isScrolled
                ? "bg-background/95 backdrop-blur-md shadow-md border-b border-border"
                : "bg-transparent"
                }`}
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 ">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <a href="/" className="flex items-center space-x-2 group">
                        <Image src={'/logo.png'} width={100} height={40} alt="Logo" />
                    </a>
                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                className="text-foreground/80 hover:text-primary font-medium transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
                            >
                                {link.name}
                            </a>
                        ))}
                        {session ? (
                            <Link href="/dashboard">
                                <Button variant="default" size="default" className="font-semibold">
                                    Dashboard
                                </Button>
                            </Link>
                        ) : (
                            <Link href="/login" className="cursor-pointer">
                                <Button variant="default" size="default" className="font-semibold cursor-pointer">
                                    Login / Register
                                </Button>
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? (
                            <X className="w-6 h-6 text-foreground" />
                        ) : (
                            <Menu className="w-6 h-6 text-foreground" />
                        )}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden py-4 space-y-4 border-t border-border bg-background/95 backdrop-blur-md">
                        {navLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                className="block py-2 text-foreground/80 hover:text-primary font-medium transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.name}
                            </a>
                        ))}
                        {session ? (
                            <Link href="/dashboard">
                                <Button variant="default" size="default" className="w-full font-semibold">
                                    Dashboard
                                </Button>
                            </Link>
                        ) : (
                            <Link href="/login">
                                <Button variant="default" size="default" className="w-full font-semibold">
                                    Login / Register
                                </Button>
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
