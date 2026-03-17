import { Link, useLocation } from "wouter";
import { Menu, X, Shield } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/ladder", label: "Ladder" },
    { href: "/vods", label: "VODs" },
    { href: "/events", label: "Events" },
    { href: "/about", label: "About" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="font-display font-bold text-xl tracking-wider text-primary hover:text-primary/80 transition-colors">
                VCLoL
              </Link>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    location === link.href ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* CTA & Auth */}
            <div className="hidden md:flex items-center space-x-4">
              {/* TODO Claude: replace localStorage check with real session */}
              {localStorage.getItem("vclol_player_id") ? (
                <Link href="/dashboard" className="text-sm font-medium text-primary hover:text-primary/80">
                  My Dashboard
                </Link>
              ) : (
                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Login
                </Link>
              )}
              <Link href="/register" className="text-sm font-medium px-4 py-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20">
                Join Interest List
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-muted-foreground hover:text-foreground"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card absolute w-full">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "block px-3 py-2 rounded-md text-base font-medium",
                    location === link.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/interest"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 mt-4 rounded-md text-base font-medium bg-primary text-primary-foreground"
              >
                Join Interest List
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow">
        {children}
      </main>

      <footer className="border-t border-border/40 bg-card/30 mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="text-sm text-muted-foreground font-display tracking-wide">
              VANCOUVER COMPETITIVE LOL PROJECT
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              A grassroots initiative for local players. Not affiliated with Riot Games.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/contact" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              Contact
            </Link>
            <Link href="/admin" className="text-muted-foreground/40 hover:text-primary transition-colors">
              <Shield className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
