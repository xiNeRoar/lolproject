import PublicLayout from "@/components/layout/PublicLayout";
import { useListPlayers } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Search, Users } from "lucide-react";

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
      <div className="max-w-7xl mx-auto px-4 pt-16 pb-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-display font-bold">Players</h1>
        </div>
        <p className="text-muted-foreground mb-10">Browse all registered VCLoL players. Click any player to view their competitive profile.</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 mb-10 bg-card/30 p-4 rounded-lg border border-border/50">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by Riot ID or Discord..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setRoleFilter(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  !roleFilter
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                All Roles
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
        </div>

        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-card rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-lg">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">No Players Found</h3>
            <p className="text-muted-foreground">
              {search || roleFilter ? "Try adjusting your search or filters." : "No registered players yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">{filtered.length} player{filtered.length !== 1 ? "s" : ""}</p>
            {filtered.map((p) => (
              <Link key={p.id} href={`/players/${encodeURIComponent(p.riotId)}`}>
                <Card className="bg-card/40 border-border/40 hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-display font-bold text-primary flex-shrink-0">
                      {p.riotId.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{p.riotId}</span>
                      {p.discordUsername && (
                        <span className="text-xs text-muted-foreground ml-2">{p.discordUsername}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p.primaryRole && (
                        <Badge variant="outline" className="text-xs">{p.primaryRole}</Badge>
                      )}
                      {p.secondaryRole && (
                        <Badge variant="outline" className="text-xs opacity-60">{p.secondaryRole}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
