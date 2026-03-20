import { Link, useLocation } from "wouter";
import { Menu, X, Shield, ChevronDown, User, LayoutDashboard, Users, LogOut } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useGetPlayerById } from "@workspace/api-client-react";

interface PlayerData {
  riotId: string;
  teams?: Array<{ teamId: number; teamName: string; teamTag: string; role?: string | null; status?: string }>;
}

function UserDropdown({ player, playerId, onLogout }: { player?: PlayerData | null; playerId: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) close();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, close]);

  const displayName = player?.riotId ?? `Player #${playerId}`;
  const firstTeam = player?.teams?.[0];

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(!open); } }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="User menu"
        className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
      >
        <div className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold uppercase" aria-hidden="true">
          {displayName[0]}
        </div>
        <span className="max-w-[120px] truncate">{displayName}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border/60 bg-card shadow-xl shadow-black/40 py-1 z-50" role="menu">
          <div className="px-3 py-2 border-b border-border/40">
            <p className="text-sm font-medium truncate">{displayName}</p>
            {firstTeam && (
              <p className="text-xs text-muted-foreground">{firstTeam.teamName} [{firstTeam.teamTag}]</p>
            )}
          </div>

          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            role="menuitem"
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>

          {player?.riotId && (
            <Link
              href={`/players/${encodeURIComponent(player.riotId)}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              role="menuitem"
            >
              <User className="w-4 h-4" /> My Profile
            </Link>
          )}

          {firstTeam && (
            <Link
              href={`/teams/${firstTeam.teamId}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              role="menuitem"
            >
              <Users className="w-4 h-4" /> My Team
            </Link>
          )}

          <div className="border-t border-border/40 mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              role="menuitem"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { playerId, logout, playerIdNum } = useAuth();
  const { data: player } = useGetPlayerById(playerIdNum, { query: { enabled: !!playerId && playerIdNum > 0 } });

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/teams", label: "Ladder" },
    { href: "/players", label: "Players" },
    { href: "/events", label: "Events" },
    { href: "/vods", label: "VODs" },
    { href: "/about", label: "About" },
  ];

  const firstTeam = player?.teams?.[0];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="font-display font-bold text-xl tracking-wider text-primary hover:text-primary/80 transition-colors">
                VCLoL
              </Link>
            </div>

            <nav className="hidden md:flex space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    (link.href === "/" ? location === "/" : location.startsWith(link.href)) ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center space-x-3">
              {playerId ? (
                <UserDropdown player={player} playerId={playerId} onLogout={handleLogout} />
              ) : (
                <>
                  <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Login
                  </Link>
                  <a
                    href="/register"
                    className="text-sm font-medium px-4 py-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                  >
                    Join VCLoL
                  </a>
                </>
              )}
            </div>

            <div className="flex items-center md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                className="text-muted-foreground hover:text-foreground"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

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
                    (link.href === "/" ? location === "/" : location.startsWith(link.href))
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-border/40 mt-2">
                {playerId ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      Dashboard
                    </Link>
                    {player?.riotId && (
                      <Link
                        href={`/players/${encodeURIComponent(player.riotId)}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        My Profile
                      </Link>
                    )}
                    {firstTeam && (
                      <Link
                        href={`/teams/${firstTeam.teamId}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        My Team
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-3 py-2 mt-1 rounded-md text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 mt-1 rounded-md text-base font-medium bg-primary text-primary-foreground"
                    >
                      Join VCLoL
                    </Link>
                  </>
                )}
              </div>
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
