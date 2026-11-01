import Link from "next/link";
import { Scissors } from "lucide-react";

const links = [
  { label: "Home", href: "/" },
  { label: "Barbers", href: "/barbers" },
  { label: "Reviews", href: "/reviews" },
  { label: "Features", href: "/#features" },
  { label: "Benefits", href: "/#benefits" },
  { label: "About", href: "/#about" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

export default function Footer() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();

  return (
    <footer className="bg-card/40 border-t border-border/70">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="max-w-sm space-y-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Scissors className="w-4 h-4 text-primary" />
              </div>
              <span className="font-extrabold tracking-wider text-xl uppercase text-foreground flex items-center gap-1.5">
                Trimly
                <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Curated master artisans, real-time appointments, and modern grooming luxury.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-3 md:justify-end text-sm">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
            {supportEmail && (
              <a
                href={`mailto:${supportEmail}`}
                className="text-muted-foreground hover:text-primary font-medium"
              >
                Contact Support
              </a>
            )}
          </nav>
        </div>

        <div className="mt-10 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Trimly Grooming Ltd. All rights reserved.</span>
          <span>Designed with Modern Grooming Luxury standards.</span>
        </div>
      </div>
    </footer>
  );
}
