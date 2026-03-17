import type { Match } from "@workspace/api-client-react";
import { Link } from "wouter";

interface Props {
  matches: Match[];
}

export function SwissRoundsTable({ matches }: Props) {
  if (!matches.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">No matches recorded yet.</p>;
  }

  const roundsMap: Record<number, Match[]> = {};
  for (const m of matches) {
    const round = m.round ?? 1;
    if (!roundsMap[round]) roundsMap[round] = [];
    roundsMap[round].push(m);
  }

  const sortedRounds = Object.keys(roundsMap)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {sortedRounds.map((round) => (
        <div key={round}>
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Round {round}
          </h4>
          <div className="space-y-2">
            {roundsMap[round].map((m) => {
              const aWon = m.winnerName === m.sideAName;
              return (
                <Link key={m.id} href={`/matches/${m.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-card/40 border border-border/30 hover:border-primary/40 hover:bg-card/70 transition-all cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-medium truncate">
                        <span className={aWon ? "text-green-400 font-bold" : ""}>{m.sideAName}</span>
                        <span className="text-muted-foreground mx-2">vs</span>
                        <span className={!aWon ? "text-green-400 font-bold" : ""}>{m.sideBName}</span>
                      </span>
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
        </div>
      ))}
    </div>
  );
}
