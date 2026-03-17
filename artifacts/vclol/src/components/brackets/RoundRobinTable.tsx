import type { Match } from "@workspace/api-client-react";
import { MatchList } from "./MatchList";

interface Props {
  matches: Match[];
}

interface Standing {
  name: string;
  wins: number;
  losses: number;
  points: number;
}

export function RoundRobinTable({ matches }: Props) {
  if (!matches.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">No matches recorded yet.</p>;
  }

  const standingsMap: Record<string, Standing> = {};

  for (const m of matches) {
    if (!standingsMap[m.sideAName]) standingsMap[m.sideAName] = { name: m.sideAName, wins: 0, losses: 0, points: 0 };
    if (!standingsMap[m.sideBName]) standingsMap[m.sideBName] = { name: m.sideBName, wins: 0, losses: 0, points: 0 };

    const aWon = m.winnerName === m.sideAName;
    if (aWon) {
      standingsMap[m.sideAName].wins++;
      standingsMap[m.sideAName].points += 2;
      standingsMap[m.sideBName].losses++;
    } else {
      standingsMap[m.sideBName].wins++;
      standingsMap[m.sideBName].points += 2;
      standingsMap[m.sideAName].losses++;
    }
  }

  const standings = Object.values(standingsMap).sort((a, b) => b.points - a.points || b.wins - a.wins);

  return (
    <div className="space-y-6">
      <div className="rounded-xl overflow-hidden border border-border/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-card/60 border-b border-border/40">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">#</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Player</th>
              <th className="text-center px-4 py-3 text-muted-foreground font-medium">W</th>
              <th className="text-center px-4 py-3 text-muted-foreground font-medium">L</th>
              <th className="text-center px-4 py-3 text-muted-foreground font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.name} className={`border-b border-border/20 last:border-0 ${i === 0 ? "bg-primary/5" : ""}`}>
                <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-center text-green-400">{s.wins}</td>
                <td className="px-4 py-3 text-center text-red-400">{s.losses}</td>
                <td className="px-4 py-3 text-center font-bold">{s.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MatchList matches={matches} />
    </div>
  );
}
