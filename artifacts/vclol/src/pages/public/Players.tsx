import PublicLayout from "@/components/layout/PublicLayout";
import { useListPlayers } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Search, Users, Gamepad2, Trophy } from "lucide-react";

const ROLES = ["Top", "Jungle", "Mid", "ADC", "Support"] as const;

const ROLE_MAP: Record<string, string> = {
  top: "Top",
  jg: "Jungle",
  jungle: "Jungle",
  mid: "Mid",
  adc: "ADC",
  sup: "Support",
  support: "Support",
  fill: "Fill",
};

function formatRole(role: string | null | undefined): string | null {
  if (!role) return null;
  return ROLE_MAP[role.toLowerCase()] ?? role;
}

function winRateColor(rate: number | null | undefined): string {
  if (rate == null) return "text-muted-foreground";
  if (rate >= 60) return "text-green-400";
  if (rate >= 50) return "text-foreground";
  return "text-red-400";
}

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
          (p.discordUsername && p.discordUsername.toLowerCase().includes(q)) ||
          (p.primaryTeam?.teamName && p.primaryTeam.teamName.toLowerCase().includes(q)) ||
          (p.primaryTeam?.teamTag && p.primaryTeam.teamTag.toLowerCase().includes(q))
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
        <h1 className="text-4xl font-display font-bold mb-2">Players</h1>
        <p className="text-muted-foreground mb-10">Browse all registered VCLoL players. Click any player to view their competitive profile.</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 mb-10 bg-card/30 p-4 rounded-lg border border-border/50">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by Riot ID, Discord, or team..."
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
              <div key={i} className="h-20 bg-card rounded-lg" />
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
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{p.riotId}</span>
                        {p.primaryRole && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">{formatRole(p.primaryRole)}</Badge>
                        )}
                        {p.secondaryRole && (
                          <Badge variant="outline" className="text-xs opacity-60 flex-shrink-0">{formatRole(p.secondaryRole)}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {p.primaryTeam?.teamName ? (
                          <span className="truncate">{p.primaryTeam.teamName} [{p.primaryTeam.teamTag}]</span>
                        ) : (
                          <span className="italic">No team</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground" title="Games played">
                        <Gamepad2 className="w-3.5 h-3.5" />
                        <span>{p.totalGames ?? 0}</span>
                      </div>
                      <div className={`flex items-center gap-1.5 font-medium ${winRateColor(p.winRate)}`} title="Win rate">
                        <Trophy className="w-3.5 h-3.5" />
                        <span>{p.winRate != null ? `${Math.round(p.winRate)}%` : "—"}</span>
                      </div>
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
