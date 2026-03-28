import { Link, useLocation } from "wouter";
import { LayoutDashboard, Calendar, Video, LogOut, Trophy, UserCheck, Settings, Users } from "lucide-react";
import { useAdminMe, useAdminLogout } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Teams",
    items: [
      { href: "/admin/teams", label: "Teams", icon: Users },
    ],
  },
  {
    label: "Players",
    items: [
      { href: "/admin/players", label: "Players", icon: UserCheck },
    ],
  },
  {
    label: "Ladder",
    items: [
      { href: "/admin/seasons", label: "Seasons", icon: Trophy },
    ],
  },
  {
    label: "Events",
    items: [
      { href: "/admin/events", label: "Events", icon: Calendar },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/vods", label: "VOD Archive", icon: Video },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/admin/ladder-settings", label: "Ladder Settings", icon: Settings },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useAdminMe({ query: { retry: false }});
  const logout = useAdminLogout();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-primary">Loading...</div>;
  }

  if (!user?.authenticated) {
    setLocation("/admin/login");
    return null;
  }

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => setLocation("/")
    });
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-56 border-r border-border bg-card/50 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-border">
          <Link href="/" className="font-display font-bold text-lg text-primary">VCLoL Admin</Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {navSections.map((section) => (
            <div key={section.label} className="mb-4">
              <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                {section.label}
              </p>
              <ul className="space-y-0.5 px-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location === item.href ||
                    (item.href !== "/admin" && location.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/30 flex items-center px-8 md:hidden">
          <span className="font-display font-bold text-primary">VCLoL Admin</span>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
