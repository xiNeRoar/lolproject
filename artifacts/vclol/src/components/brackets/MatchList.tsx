import { Link } from "wouter";
import type { Match } from "@workspace/api-client-react";

interface Props {
  matches: Match[];
}

export function MatchList({ matches }: Props) {
  if (!matches.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">No matches recorded yet.</p>;
  }
  return (
    <div className="space-y-2">
      {matches.map((m) => {
        const sideAWon = m.winnerName === m.sideAName;
        return (
          <Link key={m.id} href={`/matches/${m.id}`}>
            <div className="flex items-center justify-between p-3 rounded-lg bg-card/40 border border-border/30 hover:border-primary/40 hover:bg-card/70 transition-all cursor-pointer">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${sideAWon ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                  {sideAWon ? "W" : "L"}
                </span>
                <span className="font-medium truncate">
                  {m.sideAName} <span className="text-muted-foreground">vs</span> {m.sideBName}
                </span>
                {m.format && (
                  <span className="text-xs text-muted-foreground shrink-0">{m.format}</span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                {m.score && <span className="text-sm font-mono font-bold">{m.score}</span>}
                <span className="text-xs text-muted-foreground">→</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
