import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Calendar, ClipboardList, Swords, Video, LogOut, Trophy, Layers } from "lucide-react";
import { useAdminMe, useAdminLogout } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

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

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/players", label: "Players", icon: Trophy },
    { href: "/admin/seasons", label: "Seasons", icon: Layers },
    { href: "/admin/interests", label: "Interests", icon: Users },
    { href: "/admin/events", label: "Events", icon: Calendar },
    { href: "/admin/registrations", label: "Registrations", icon: ClipboardList },
    { href: "/admin/matches", label: "Matches", icon: Swords },
    { href: "/admin/vods", label: "VOD Archive", icon: Video },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/" className="font-display font-bold text-lg text-primary">VCLoL Admin</Link>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
              
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
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-border">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
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
