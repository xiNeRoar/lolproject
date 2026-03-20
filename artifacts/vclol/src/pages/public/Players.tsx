import PublicLayout from "@/components/layout/PublicLayout";
import { useListPlayers } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { Search, Filter, Users } from "lucide-react";

const ROLES = ["Top", "Jungle", "Mid", "ADC", "Support"] as const;

export default function Players() {
  const { data: players, isLoading } = useListPlayers();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!players) return [];
    let list = players.filter((p) => p.isActive);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.riotId.toLowerCase().includes(q) ||
          (p.discordUsername && p.discordUsername.toLowerCase().includes(q))
      );
    }

    if (roleFilter) {
      const r = roleFilter.toLowerCase();
      list = list.filter(
        (p) =>
          p.primaryRole?.toLowerCase() === r ||
          p.secondaryRole?.toLowerCase() === r
      );
    }

    return list;
  }, [players, search, roleFilter]);

  return (
    <PublicLayout>
      <div className="bg-card/30 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-7 h-7 text-primary" />
            <h1 className="text-4xl font-display font-bold">Players</h1>
          </div>
          <p className="text-muted-foreground">Browse all registered VCLoL players.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by Riot ID or Discord..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border/60 bg-card/60 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <button
              onClick={() => setRoleFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !roleFilter
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {ROLES.map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(roleFilter === role ? null : role)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  roleFilter === role
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-20 bg-card/40 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No players found{search || roleFilter ? " matching your filters." : "."}</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">{filtered.length} player{filtered.length !== 1 ? "s" : ""}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((p) => (
                <Link key={p.id} href={`/players/${encodeURIComponent(p.riotId)}`}>
                  <Card className="bg-card/40 border-border/40 hover:border-primary/50 transition-colors cursor-pointer h-full">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-display font-bold text-primary flex-shrink-0">
                        {p.riotId.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{p.riotId}</div>
                        {p.discordUsername && (
                          <div className="text-xs text-muted-foreground truncate">{p.discordUsername}</div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {p.primaryRole && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{p.primaryRole}</Badge>
                        )}
                        {p.secondaryRole && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 opacity-60">{p.secondaryRole}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </PublicLayout>
  );
}
