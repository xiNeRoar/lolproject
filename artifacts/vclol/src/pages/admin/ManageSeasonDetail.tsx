import AdminLayout from "@/components/layout/AdminLayout";
import {
  useListSeasons,
  useGetLadder,
  useListChallenges,
  useDeleteChallenge,
  useListMatches,
  useDeleteMatch,
  useListSeasonChampions,
  type Match,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Zap, Swords, Star, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { useParams, useLocation } from "wouter";

type Tab = "standings" | "challenges" | "matches" | "champions";

function statusBadge(status: string) {
  if (status === "pending") return <Badge variant="secondary" className="capitalize">{status}</Badge>;
  if (status === "accepted") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 capitalize">{status}</Badge>;
  if (status === "completed") return <Badge className="bg-primary/20 text-primary border-primary/30 capitalize">{status}</Badge>;
  if (status === "declined") return <Badge variant="destructive" className="capitalize">{status}</Badge>;
  return <Badge variant="outline" className="text-muted-foreground capitalize">{status}</Badge>;
}

function seasonStatusBadge(status: string) {
  if (status === "active") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
  if (status === "completed") return <Badge variant="outline" className="text-muted-foreground">Completed</Badge>;
  return <Badge variant="secondary">Upcoming</Badge>;
}

function winRate(wins: number, losses: number) {
  const total = wins + losses;
  if (total === 0) return "—";
  return `${Math.round((wins / total) * 100)}%`;
}

export default function ManageSeasonDetail() {
  const { id } = useParams<{ id: string }>();
  const seasonId = Number(id);
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("standings");
  const [challengeStatusFilter, setChallengeStatusFilter] = useState<string>("all");

  const { data: seasons } = useListSeasons();
  const season = seasons?.find((s) => s.id === seasonId);

  const { data: ladder, isLoading: ladderLoading } = useGetLadder();
  const { data: allChallenges, isLoading: challengesLoading } = useListChallenges();
  const { data: allMatches, isLoading: matchesLoading } = useListMatches({ seasonId });
  const { data: allChampions, isLoading: championsLoading } = useListSeasonChampions();

  const deleteChallenge = useDeleteChallenge();
  const deleteMatch = useDeleteMatch();

  const seasonChallenges = (allChallenges ?? []).filter((c) => c.seasonId === seasonId);
  const filteredChallenges = seasonChallenges.filter((c) =>
    challengeStatusFilter === "all" ? true : c.status === challengeStatusFilter
  );
  const ladderMatches = (allMatches ?? []).filter((m) => !m.eventId);
  const seasonChampion = (allChampions ?? []).find((c) => c.seasonId === seasonId);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "standings", label: "Standings", icon: <Trophy className="w-4 h-4" /> },
    { id: "challenges", label: `Challenges`, icon: <Zap className="w-4 h-4" />, count: seasonChallenges.length },
    { id: "matches", label: `Matches`, icon: <Swords className="w-4 h-4" />, count: ladderMatches.length },
    { id: "champions", label: "Champions", icon: <Star className="w-4 h-4" /> },
  ];

  if (!season && seasons) {
    return (
      <AdminLayout>
        <div className="text-muted-foreground">Season not found.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/admin/seasons")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> All Seasons
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-display font-bold">{season?.name ?? "Loading…"}</h1>
          {season && seasonStatusBadge(season.status)}
        </div>
        {season && (
          <p className="text-sm text-muted-foreground mt-1">
            {season.startDate} → {season.endDate} &bull; ELO Reset Factor: {season.eloResetFactor}
          </p>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && (
              <span className="text-xs bg-muted rounded-full px-1.5 py-0.5 text-muted-foreground">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── STANDINGS TAB ─────────────────────────────────────── */}
      {tab === "standings" && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Current ladder standings — all players meeting the minimum match threshold.
          </p>
          <div className="rounded-xl overflow-hidden border border-border/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-card/60 border-b border-border/40">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium w-12">#</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Player</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">ELO</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden sm:table-cell">W / L</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden sm:table-cell">Win Rate</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Top Champion</th>
                </tr>
              </thead>
              <tbody>
                {ladderLoading ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
                ) : !ladder?.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No players on the ladder yet.
                    </td>
                  </tr>
                ) : ladder.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/20 last:border-0 hover:bg-card/30">
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{entry.rank}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{entry.riotId}</div>
                      <div className="text-xs text-muted-foreground">{entry.discordUsername}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-primary font-semibold">{entry.currentElo}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      <span className="text-green-400">{entry.wins}W</span>{" / "}
                      <span className="text-red-400">{entry.losses}L</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {winRate(entry.wins, entry.losses)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">
                      {entry.topChampion ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CHALLENGES TAB ────────────────────────────────────── */}
      {tab === "challenges" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Challenges issued this season.{" "}
              <span className="text-yellow-400">Accepted + Game ID submitted</span> → ready to record result.
            </p>
            <select
              value={challengeStatusFilter}
              onChange={(e) => setChallengeStatusFilter(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
              <option value="expired">Expired</option>
              <option value="expired_no_show">No-show</option>
            </select>
          </div>

          {challengesLoading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-card rounded-lg" />)}
            </div>
          ) : !filteredChallenges.length ? (
            <div className="text-center py-16 border border-dashed border-border rounded-lg">
              <Zap className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground">
                {seasonChallenges.length === 0
                  ? "No challenges this season yet."
                  : "No challenges match the selected filter."}
              </p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden border border-border/40">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-card/60 border-b border-border/40">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Challenger</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">vs</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden sm:table-cell">Scheduled</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Game ID</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChallenges.map((c) => (
                    <tr key={c.id} className="border-b border-border/20 last:border-0 hover:bg-card/30">
                      <td className="px-4 py-3 font-medium">{c.challengerRiotId ?? `#${c.challengerId}`}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.challengedRiotId ?? `#${c.challengedId}`}</td>
                      <td className="px-4 py-3">{statusBadge(c.status)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                        {c.scheduledTime
                          ? new Date(c.scheduledTime).toLocaleString("en-CA", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden md:table-cell">
                        {c.gameId ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {c.status === "accepted" && c.gameId && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-yellow-400 border-yellow-400/30 hover:bg-yellow-500/10 gap-1.5"
                              title="Record Result — completes the challenge and updates ELO (requires backend B3)"
                              disabled
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              Record Result
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
                            onClick={() => {
                              if (confirm("Delete this challenge?"))
                                deleteChallenge.mutate({ id: c.id });
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {seasonChallenges.length === 0 && !challengesLoading && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Note: "Record Result" button will be enabled after backend B3 is deployed.
            </p>
          )}
        </div>
      )}

      {/* ── MATCHES TAB ───────────────────────────────────────── */}
      {tab === "matches" && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Ladder matches for this season (excludes event matches).
          </p>
          {matchesLoading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-card rounded-lg" />)}
            </div>
          ) : !ladderMatches.length ? (
            <div className="text-center py-16 border border-dashed border-border rounded-lg">
              <Swords className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground">No ladder matches this season yet.</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden border border-border/40">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-card/60 border-b border-border/40">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Players</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Result</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden sm:table-cell">Score</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">ELO Δ</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">Date</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ladderMatches.map((m) => (
                    <tr key={m.id} className="border-b border-border/20 last:border-0 hover:bg-card/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{m.sideAName}</div>
                        <div className="text-xs text-muted-foreground">vs {m.sideBName}</div>
                      </td>
                      <td className="px-4 py-3">
                        {m.winnerName ? (
                          <span className="text-green-400 font-medium text-xs">{m.winnerName} wins</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">TBD</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell font-mono text-xs">
                        {m.score ?? "—"}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs">
                        <div>
                          <span className="text-muted-foreground">{m.sideAName}: </span>
                          {m.playerAEloAfter != null && m.playerAEloBefore != null ? (
                            <span className={m.playerAEloAfter >= m.playerAEloBefore ? "text-green-400" : "text-red-400"}>
                              {m.playerAEloAfter >= m.playerAEloBefore ? "+" : ""}
                              {m.playerAEloAfter - m.playerAEloBefore}
                            </span>
                          ) : "—"}
                        </div>
                        <div>
                          <span className="text-muted-foreground">{m.sideBName}: </span>
                          {m.playerBEloAfter != null && m.playerBEloBefore != null ? (
                            <span className={m.playerBEloAfter >= m.playerBEloBefore ? "text-green-400" : "text-red-400"}>
                              {m.playerBEloAfter >= m.playerBEloBefore ? "+" : ""}
                              {m.playerBEloAfter - m.playerBEloBefore}
                            </span>
                          ) : "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                        {m.createdAt
                          ? new Date(m.createdAt).toLocaleDateString("en-CA", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/matches/${m.id}`)}
                            className="text-xs"
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
                            onClick={() => {
                              if (confirm("Delete this match? This cannot be undone."))
                                deleteMatch.mutate({ id: m.id });
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── CHAMPIONS TAB ─────────────────────────────────────── */}
      {tab === "champions" && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Season champion record. Awarded automatically when the season is completed.
          </p>
          {championsLoading ? (
            <div className="h-24 bg-card rounded-lg animate-pulse" />
          ) : !seasonChampion ? (
            <div className="text-center py-16 border border-dashed border-border rounded-lg">
              <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground">
                {season?.status === "completed"
                  ? "No champion recorded for this season."
                  : "Champion will be crowned when the season is completed."}
              </p>
            </div>
          ) : (
            <div className="max-w-sm">
              <div className="bg-card/60 border border-yellow-400/20 rounded-xl p-6 text-center">
                <Star className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Season Champion</p>
                <p className="text-2xl font-display font-bold text-yellow-400">
                  {seasonChampion.playerRiotId ?? `Player #${seasonChampion.playerId}`}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Final ELO:{" "}
                  <span className="text-primary font-mono font-semibold">{seasonChampion.finalElo}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Crowned{" "}
                  {new Date(seasonChampion.createdAt).toLocaleDateString("en-CA", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
