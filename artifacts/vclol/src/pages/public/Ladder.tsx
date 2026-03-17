import PublicLayout from "@/components/layout/PublicLayout";
import { useGetLadder } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp } from "lucide-react";
import { Link } from "wouter";

function eloBadgeColor(elo: number) {
  if (elo >= 1400) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  if (elo >= 1200) return "bg-purple-500/20 text-purple-400 border-purple-500/30";
  if (elo >= 1100) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  return "bg-muted text-muted-foreground";
}

function rankLabel(elo: number) {
  if (elo >= 1400) return "Gold";
  if (elo >= 1200) return "Silver";
  if (elo >= 1100) return "Bronze";
  return "Unranked";
}

function rankIcon(position: number) {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return null;
}

export default function Ladder() {
  const { data, isLoading } = useGetLadder();

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 pt-16 pb-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-display font-bold">ELO Ladder</h1>
        </div>
        {data?.season ? (
          <p className="text-muted-foreground mb-2">
            Season: <span className="text-foreground font-medium">{data.season.name}</span>
            <Badge variant="outline" className="ml-2 text-xs">{data.season.status}</Badge>
          </p>
        ) : (
          <p className="text-muted-foreground mb-2">No active season — showing all-time standings.</p>
        )}
        <p className="text-xs text-muted-foreground mb-10">Requires at least 4 matches to appear on the ladder.</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-16 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-card rounded-lg" />
            ))}
          </div>
        ) : !data?.entries?.length ? (
          <div className="text-center py-20 border border-dashed border-border rounded-lg">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No ranked players yet. Play more matches to appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.entries.map((entry) => (
              <Link key={entry.id} href={`/players/${entry.id}`}>
                <Card className="bg-card/40 border-border/40 hover:bg-card/70 hover:border-primary/30 transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Rank */}
                    <div className="w-12 text-center shrink-0">
                      {rankIcon(entry.rank) ? (
                        <span className="text-2xl">{rankIcon(entry.rank)}</span>
                      ) : (
                        <span className="text-xl font-display font-bold text-muted-foreground">
                          #{entry.rank}
                        </span>
                      )}
                    </div>

                    {/* Player info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{entry.riotId}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border font-medium ${eloBadgeColor(entry.currentElo)}`}
                        >
                          {rankLabel(entry.currentElo)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{entry.discordUsername}</div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-center hidden sm:block">
                        <div className="text-xs text-muted-foreground">W/L</div>
                        <div className="text-sm font-medium">
                          <span className="text-green-400">{entry.wins}W</span>
                          {" / "}
                          <span className="text-red-400">{entry.losses}L</span>
                        </div>
                      </div>
                      <div className="text-center hidden sm:block">
                        <div className="text-xs text-muted-foreground">Win Rate</div>
                        <div className="text-sm font-medium">{entry.winRate}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> ELO
                        </div>
                        <div className="text-lg font-display font-bold text-primary">
                          {entry.currentElo}
                        </div>
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
