import PublicLayout from "@/components/layout/PublicLayout";
import { useListMatches, useGetLadder } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Swords, Search, ArrowUpDown, X } from "lucide-react";
import { useState, useMemo } from "react";

export default function Matches() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialTeamId = urlParams.get("teamId") ? Number(urlParams.get("teamId")) : undefined;

  const [teamIdFilter, setTeamIdFilter] = useState<number | undefined>(initialTeamId);
  const apiParams = teamIdFilter ? { teamId: teamIdFilter } : undefined;
  const { data: matchesPage, isLoading } = useListMatches(apiParams);
  const matches = matchesPage?.data ?? [];
  const { data: ladderData } = useGetLadder();
  const [search, setSearch] = useState("");
  const [sortNewest, setSortNewest] = useState(true);

  const filtered = useMemo(() => {
    if (!matches) return [];
    let list = [...matches];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.sideAName.toLowerCase().includes(q) ||
          m.sideBName.toLowerCase().includes(q) ||
          (m.matchTitle?.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortNewest ? db - da : da - db;
    });
    return list;
  }, [matches, search, sortNewest]);

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 pt-16 pb-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-display font-bold mb-2">Matches</h1>
        <p className="text-muted-foreground mb-10">Browse all public match results.</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-16 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-card rounded-lg" />
            ))}
          </div>
        ) : !matches?.length ? (
          <div className="text-center py-20 border border-dashed border-border rounded-lg">
            <Swords className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl font-medium mb-2">No matches yet</p>
            <p className="text-muted-foreground text-sm mb-4">Matches will appear here after scrims are recorded.</p>
            <Link href="/register" className="text-sm text-primary hover:underline">Register your team to start competing →</Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by team name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
              <select
                className="flex h-10 w-full sm:w-52 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={teamIdFilter || ""}
                onChange={(e) => setTeamIdFilter(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">All Teams</option>
                {ladderData?.entries?.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} [{t.tag}]</option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortNewest(!sortNewest)}
                className="gap-1.5 shrink-0"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {sortNewest ? "Newest first" : "Oldest first"}
              </Button>
              {teamIdFilter && (
                <Button variant="ghost" size="sm" onClick={() => setTeamIdFilter(undefined)} className="text-muted-foreground hover:text-foreground gap-1">
                  <X className="w-3 h-3" /> Clear team filter
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              {filtered.length} match{filtered.length !== 1 ? "es" : ""}
              {search && ` matching "${search}"`}
            </p>

            {filtered.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <p className="text-muted-foreground text-sm">No matches found matching "{search}".</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((match) => {
                  const date = new Date(match.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
                  const aWon = match.winnerName === match.sideAName;
                  const bWon = match.winnerName === match.sideBName;
                  return (
                    <Link key={match.id} href={`/matches/${match.id}`}>
                      <Card className="bg-card/40 border-border/40 hover:border-primary/50 transition-colors cursor-pointer">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-medium truncate ${aWon ? "text-primary" : ""}`}>{match.sideAName}</span>
                              <span className="text-muted-foreground text-sm">vs</span>
                              <span className={`font-medium truncate ${bWon ? "text-primary" : ""}`}>{match.sideBName}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                              <span className="truncate">{match.matchTitle}</span>
                              {match.isPlayoff && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">Playoff</Badge>
                              )}
                              {match.format && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">{match.format}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            {match.score && (
                              <span className="text-lg font-display font-bold">{match.score}</span>
                            )}
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{date}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </PublicLayout>
  );
}
