import PublicLayout from "@/components/layout/PublicLayout";
import { useGetLadder, useGetLadderSettings } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock } from "lucide-react";
import { Link } from "wouter";
import { rankIcon } from "@/lib/lol-utils";

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function Teams() {
  const { data, isLoading } = useGetLadder();
  const { data: settings } = useGetLadderSettings();

  const playoffSize = settings?.playoffSize ?? 8;
  const seasonDaysLeft = data?.season?.endDate ? daysUntil(data.season.endDate) : null;

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 pt-16 pb-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-display font-bold mb-2">Ranking</h1>
        <div className="flex flex-wrap items-center gap-3 mb-2">
          {data?.season ? (
            <div className="text-muted-foreground flex items-center gap-2">
              Season: <span className="text-foreground font-medium">{data.season.name}</span>
              <Badge variant="outline" className="text-xs">{data.season.status}</Badge>
            </div>
          ) : (
            <p className="text-muted-foreground">No active season — showing all-time standings.</p>
          )}
          {seasonDaysLeft !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
              <Clock className="w-3 h-3" />
              {seasonDaysLeft === 0 ? "Season ends today" : `${seasonDaysLeft}d until season end`}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-10">Requires at least {settings?.minMatchesForDisplay ?? 4} matches to appear on the ladder.</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-10 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-card rounded-lg" />
            ))}
          </div>
        ) : !data?.entries?.length ? (
          <div className="text-center py-20 border border-dashed border-border rounded-lg">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No ranked teams yet. Play more matches to appear here.</p>
            <Link href="/register" className="text-sm text-primary hover:underline">Register your team →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.entries.map((entry, idx) => {
              const isPlayoffCutoff = idx === playoffSize;
              return (
                <div key={entry.id} className="relative">
                  {isPlayoffCutoff && (
                    <div className="flex items-center gap-3 py-2 mb-1">
                      <div className="flex-1 border-t border-dashed border-border/50" />
                      <span className="text-xs text-muted-foreground px-2 whitespace-nowrap">— Playoff Cutoff —</span>
                      <div className="flex-1 border-t border-dashed border-border/50" />
                    </div>
                  )}
                  <Link href={`/teams/${entry.id}`}>
                    <Card className={`bg-card/40 border-border/40 hover:bg-card/70 hover:border-primary/30 transition-all cursor-pointer ${idx < playoffSize ? "border-l-2 border-l-primary/30" : ""}`}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 text-center shrink-0">
                          {rankIcon(entry.rank) ? (
                            <span className="text-2xl">{rankIcon(entry.rank)}</span>
                          ) : (
                            <span className="text-xl font-display font-bold text-muted-foreground">
                              #{entry.rank}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{entry.name}</span>
                            <span className="text-xs text-muted-foreground">[{entry.tag}]</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">Record</div>
                            <div className="text-sm font-display font-bold">
                              <span className="text-green-400">{entry.wins}W</span>
                              {" / "}
                              <span className="text-red-400">{entry.losses}L</span>
                            </div>
                          </div>
                          <div className="text-center hidden sm:block">
                            <div className="text-xs text-muted-foreground">Win Rate</div>
                            <div className="text-lg font-display font-bold text-primary">{entry.winRate}%</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-16 sm:px-6 lg:px-8">
        <div className="border border-border/30 rounded-xl p-6 bg-card/20">
          <h3 className="text-lg font-display font-semibold mb-4">How the Ranking Works</h3>
          {settings ? (
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Teams are ranked by <span className="text-foreground">win count</span> — every match result is verified from .rofl replay files</li>
              <li>• Minimum <span className="text-foreground">{settings.minMatchesForDisplay} matches</span> required to appear in the ranking</li>
              <li>• Top <span className="text-foreground">{playoffSize} teams</span> qualify for season playoffs</li>
              <li>• Default match format: <span className="text-foreground">{settings.defaultMatchFormat}</span></li>
            </ul>
          ) : (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-4 bg-card rounded w-3/4" />)}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
