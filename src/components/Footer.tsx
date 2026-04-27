import Link from "next/link";
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import Image from "next/image";

const Footer = () => {
  const footerLinks = {
    Product: [
      { label: "Features", href: "#" },
      { label: "Pricing", href: "#" },
      { label: "FAQ", href: "#" },
      { label: "Support", href: "#" }
    ],
    Company: [
      { label: "About Us", href: "#" },
      { label: "Blog", href: "#" },
    ],
    Legal: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "#" },
    ],
    Resources: [
      { label: "Help Center", href: "#" },
      { label: "Documentation", href: "#" },
      { label: "API", href: "#" },
      { label: "Status", href: "#" }
    ],
  };

  const socialLinks = [
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
  ];

  return (
    <footer className="bg-muted/50 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center space-x-2">
              <Image src={'/logo.png'} width={100} height={40} alt="Logo" />
            </div>
            <p className="text-muted-foreground max-w-xs">
              The smartest way to book your haircut and manage salon appointments.
              Save time, skip the queue.
            </p>
            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-lg bg-background hover:bg-primary/10 border border-border flex items-center justify-center transition-all group"
                >
                  <social.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="space-y-4">
              <h4 className="font-semibold text-foreground">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Trimlly. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
              Terms
            </Link>
            <a href="mailto:support@trimly.com" className="text-muted-foreground hover:text-primary transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
