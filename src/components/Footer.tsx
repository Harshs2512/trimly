import Link from "next/link";
import Image from "next/image";

const links = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/#features" },
  { label: "Benefits", href: "/#benefits" },
  { label: "Barbers", href: "/barbers" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export default function Footer() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return (
    <footer className="bg-muted/50 border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="max-w-sm"><Image src="/logo.png" width={60} height={50} alt="Trimlly" className="h-12 w-auto object-contain" /><p className="mt-3 text-muted-foreground">Browse barber services, check validated appointment availability and manage booking requests.</p></div>
          <nav className="flex flex-wrap gap-x-6 gap-y-3 md:justify-end">{links.map((link) => <Link key={link.label} href={link.href} className="text-muted-foreground hover:text-primary transition-colors">{link.label}</Link>)}{supportEmail && <a href={`mailto:${supportEmail}`} className="text-muted-foreground hover:text-primary">Contact</a>}</nav>
        </div>
        <div className="mt-8 pt-6 border-t text-sm text-muted-foreground">© {new Date().getFullYear()} Trimlly. All rights reserved.</div>
      </div>
    </footer>
  );
}
