import PublicLayout from "@/components/layout/PublicLayout";
import { useListMatches } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Swords } from "lucide-react";

export default function Matches() {
  const { data: matches, isLoading } = useListMatches();

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
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">{matches.length} match{matches.length !== 1 ? "es" : ""}</p>
            {matches.map((match) => {
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
      </div>
    </PublicLayout>
  );
}
