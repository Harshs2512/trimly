import Link from "next/link";
import { Scissors, MapPin, Mail, ShieldCheck } from "lucide-react";

const productLinks = [
  { label: "Find Barbers", href: "/barbers" },
  { label: "Popular Services", href: "/services/haircut" },
  { label: "Customer Reviews", href: "/reviews" },
  { label: "For Salon Owners", href: "/for-barbers" },
];

const cityLinks = [
  { label: "Barbers in Indore", href: "/barbers/city/indore" },
  { label: "Barbers in Bhopal", href: "/barbers/city/bhopal" },
  { label: "Barbers in Mumbai", href: "/barbers/city/mumbai" },
  { label: "Barbers in Delhi-NCR", href: "/barbers/city/delhi" },
  { label: "Barbers in Bengaluru", href: "/barbers/city/bengaluru" },
  { label: "Barbers in Pune", href: "/barbers/city/pune" },
];

const serviceLinks = [
  { label: "Haircut & Styling", href: "/services/haircut" },
  { label: "Beard Trim & Shape", href: "/services/beard-trim" },
  { label: "Hair Colour & Tint", href: "/services/hair-colour" },
  { label: "Facial & De-Tan", href: "/services/facial" },
  { label: "Wedding Packages", href: "/services/bridal-grooming" },
];

const companyLinks = [
  { label: "About Trimly", href: "/about" },
  { label: "Help & FAQ", href: "/faq" },
  { label: "Contact Us", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

export default function Footer() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || "Trimly";
  const year = new Date().getFullYear();

  return (
    <footer className="bg-card/50 border-t border-border/70 text-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Brand Info */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Scissors className="w-4 h-4 text-primary" />
              </div>
              <span className="font-extrabold tracking-wider text-xl uppercase text-foreground flex items-center gap-1.5">
                {companyName}
                <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
              </span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              India&apos;s smart online barber and salon appointment booking platform. Verified local stylists, real-time slots, and transparent INR menus.
            </p>
            <div className="pt-1 flex items-center gap-2 text-xs font-semibold text-primary">
              <ShieldCheck className="w-4 h-4" />
              <span>100% Verified Partners</span>
            </div>
            {supportEmail && (
              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                {supportEmail}
              </a>
            )}
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">Product</h4>
            <ul className="space-y-2">
              {productLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-muted-foreground hover:text-primary transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Top Indian Cities */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">Top Cities</h4>
            <ul className="space-y-2">
              {cityLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-muted-foreground hover:text-primary transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Services */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">Popular Services</h4>
            <ul className="space-y-2">
              {serviceLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-muted-foreground hover:text-primary transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company & Legal */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">Company & Legal</h4>
            <ul className="space-y-2">
              {companyLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-muted-foreground hover:text-primary transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© {year} {companyName}. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
            <span>Made in India 🇮🇳</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
