import type { Match } from "@workspace/api-client-react";
import { MatchList } from "./MatchList";
import { Link } from "wouter";

interface Props {
  matches: Match[];
}

function BracketMatch({ match }: { match: Match }) {
  const aWon = match.winnerName === match.sideAName;
  return (
    <Link href={`/matches/${match.id}`}>
      <div className="w-52 rounded-lg border border-border/50 bg-card/60 overflow-hidden hover:border-primary/50 transition-colors cursor-pointer text-sm">
        <div className={`px-3 py-2 flex items-center justify-between border-b border-border/40 ${aWon ? "bg-primary/10" : ""}`}>
          <span className={`font-medium truncate ${aWon ? "text-primary" : "text-foreground/70"}`}>{match.sideAName}</span>
          {match.score && <span className="text-xs font-mono ml-1 shrink-0">{match.score.split("-")[0]}</span>}
        </div>
        <div className={`px-3 py-2 flex items-center justify-between ${!aWon ? "bg-primary/10" : ""}`}>
          <span className={`font-medium truncate ${!aWon ? "text-primary" : "text-foreground/70"}`}>{match.sideBName}</span>
          {match.score && <span className="text-xs font-mono ml-1 shrink-0">{match.score.split("-")[1]}</span>}
        </div>
      </div>
    </Link>
  );
}

function groupByRound(matches: Match[]): Record<number, Match[]> {
  const rounds: Record<number, Match[]> = {};
  for (const m of matches) {
    const round = m.round ?? 1;
    if (!rounds[round]) rounds[round] = [];
    rounds[round].push(m);
  }
  return rounds;
}

export function SingleEliminationBracket({ matches }: Props) {
  if (matches.length === 0) {
    return <p className="text-muted-foreground text-sm">No matches recorded yet.</p>;
  }

  const rounds = groupByRound(matches);
  const sortedRoundNums = Object.keys(rounds).map(Number).sort((a, b) => a - b);

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex items-start gap-8 min-w-max">
        {sortedRoundNums.map((roundNum, ri) => {
          const roundMatches = rounds[roundNum];
          const totalRounds = sortedRoundNums.length;
          const gapMultiplier = Math.pow(2, ri);
          return (
            <div key={roundNum} className="flex flex-col">
              <div className="text-xs text-muted-foreground text-center mb-3 uppercase tracking-wider font-semibold">
                {roundNum === totalRounds ? "Final" : roundNum === totalRounds - 1 ? "Semi-final" : `Round ${roundNum}`}
              </div>
              <div className="flex flex-col" style={{ gap: `${gapMultiplier * 24}px` }}>
                {roundMatches.map((m) => (
                  <BracketMatch key={m.id} match={m} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
