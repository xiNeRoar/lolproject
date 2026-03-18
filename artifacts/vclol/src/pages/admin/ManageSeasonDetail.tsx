import AdminLayout from "@/components/layout/AdminLayout";
import {
  useListSeasons,
  useListPlayers,
  useListChallenges,
  useDeleteChallenge,
  useListMatches,
  useCreateMatch,
  useUpdateMatch,
  useDeleteMatch,
  useListSeasonChampions,
  type CreateMatchRequest,
  type Match,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Trophy, Zap, Swords, Star, ClipboardCheck,
  UserX, ShieldAlert, ExternalLink, Plus, Info, Edit, Trash2, Film,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";

type Tab = "standings" | "challenges" | "matches" | "champions";

const ROUND_OPTIONS = [
  { label: "—  (no round)", value: "" },
  { label: "Group Stage", value: "0" },
  { label: "Quarter Finals", value: "1" },
  { label: "Semi Finals", value: "2" },
  { label: "Final", value: "3" },
  { label: "3rd Place", value: "4" },
];

function seasonStatusBadge(status: string) {
  if (status === "active") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
  if (status === "completed") return <Badge variant="outline" className="text-muted-foreground">Completed</Badge>;
  return <Badge variant="secondary">Upcoming</Badge>;
}

function challengeStatusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-muted text-muted-foreground border-border",
    accepted: "bg-green-500/20 text-green-400 border-green-500/30",
    completed: "bg-primary/20 text-primary border-primary/30",
    declined: "bg-red-500/20 text-red-400 border-red-500/30",
    expired: "bg-muted text-muted-foreground border-border",
    expired_no_show: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    disputed: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  };
  const cls = map[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <Badge className={`${cls} capitalize text-xs`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

const DISABLED_TOOLTIP = "Requires backend update — see REMAINING_WORK.md (B3/B5/B6)";

export default function ManageSeasonDetail() {
  const { id } = useParams<{ id: string }>();
  const seasonId = Number(id);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("standings");
  const [challengeStatusFilter, setChallengeStatusFilter] = useState<string>("all");
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);

  // ── Data fetching ───────────────────────────────────────────
  const { data: seasons } = useListSeasons();
  const season = seasons?.find((s) => s.id === seasonId);

  const { data: allPlayers, isLoading: playersLoading } = useListPlayers();
  const { data: allChallenges, isLoading: challengesLoading } = useListChallenges();
  const { data: allMatches, isLoading: matchesLoading } = useListMatches({ seasonId });
  const { data: allChampions, isLoading: championsLoading } = useListSeasonChampions();

  const deleteChallenge = useDeleteChallenge();
  const deleteMatch = useDeleteMatch();
  const createMatch = useCreateMatch();
  const updateMatch = useUpdateMatch();
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);

  // ── Match form (Add Match dialog) ───────────────────────────
  const { register: regMatch, handleSubmit: handleMatchSubmit, reset: resetMatch, control: matchControl, setValue: setMatchVal } = useForm();
  const watchedPlayerAId = useWatch({ control: matchControl, name: "playerAId" });
  const watchedPlayerBId = useWatch({ control: matchControl, name: "playerBId" });
  const matchPlayerA = allPlayers?.find((p) => p.id === Number(watchedPlayerAId));
  const matchPlayerB = allPlayers?.find((p) => p.id === Number(watchedPlayerBId));

  useEffect(() => {
    if (matchPlayerA) setMatchVal("sideAName", matchPlayerA.riotId);
  }, [watchedPlayerAId]);

  useEffect(() => {
    if (matchPlayerB) setMatchVal("sideBName", matchPlayerB.riotId);
  }, [watchedPlayerBId]);

  const openNewMatch = () => {
    resetMatch({ playerAId: "", playerBId: "", sideAName: "", sideBName: "", winner: "A", score: "" });
    setEditingMatchId(null);
    setMatchDialogOpen(true);
  };

  const openEditMatch = (m: Match) => {
    const winner = m.winnerName === m.sideBName ? "B" : "A";
    resetMatch({
      playerAId: m.playerAId ? String(m.playerAId) : "",
      playerBId: m.playerBId ? String(m.playerBId) : "",
      sideAName: m.sideAName,
      sideBName: m.sideBName,
      winner,
      score: m.score ?? "",
    });
    setEditingMatchId(m.id);
    setMatchDialogOpen(true);
  };

  const invalidateMatchQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    queryClient.invalidateQueries({ queryKey: ["/api/players"] });
    queryClient.invalidateQueries({ queryKey: ["/api/ladder"] });
  };

  const onMatchSubmit = (data: Record<string, unknown>) => {
    const sideA = String(data.sideAName ?? matchPlayerA?.riotId ?? "");
    const sideB = String(data.sideBName ?? matchPlayerB?.riotId ?? "");
    const winnerName = data.winner === "B" ? sideB : sideA;
    const payload: CreateMatchRequest = {
      matchTitle: `${sideA} vs ${sideB}`,
      sideAName: sideA,
      sideBName: sideB,
      winnerName,
      score: data.score ? String(data.score) : null,
      format: "BO1",
      vodUrl: null,
      eventId: null,
      playerAId: data.playerAId ? Number(data.playerAId) : null,
      playerBId: data.playerBId ? Number(data.playerBId) : null,
      seasonId,
      isPlayoff: false,
      round: null,
      bracketSlot: null,
      isLosersBracket: false,
    };
    if (editingMatchId) {
      updateMatch.mutate({ id: editingMatchId, data: payload }, {
        onSuccess: () => {
          setMatchDialogOpen(false);
          setEditingMatchId(null);
          invalidateMatchQueries();
        },
      });
    } else {
      createMatch.mutate({ data: payload }, {
        onSuccess: () => {
          setMatchDialogOpen(false);
          invalidateMatchQueries();
        },
      });
    }
  };

  // ── Derived data ────────────────────────────────────────────
  const ladderMatches = useMemo(() => (allMatches ?? []).filter((m) => !m.eventId), [allMatches]);

  const standings = useMemo(() => {
    if (!allPlayers || !ladderMatches) return [];
    const participantIds = new Set<number>();
    ladderMatches.forEach((m) => {
      if (m.playerAId) participantIds.add(m.playerAId);
      if (m.playerBId) participantIds.add(m.playerBId);
    });
    return (allPlayers)
      .filter((p) => participantIds.has(p.id))
      .sort((a, b) => b.currentElo - a.currentElo)
      .map((p, idx) => ({ ...p, rank: idx + 1 }));
  }, [allPlayers, ladderMatches]);

  const seasonChallenges = useMemo(
    () => (allChallenges ?? []).filter((c) => c.seasonId === seasonId),
    [allChallenges, seasonId]
  );

  const filteredChallenges = useMemo(
    () => seasonChallenges.filter((c) => challengeStatusFilter === "all" || c.status === challengeStatusFilter),
    [seasonChallenges, challengeStatusFilter]
  );

  const seasonChampion = useMemo(
    () => (allChampions ?? []).find((c) => c.seasonId === seasonId),
    [allChampions, seasonId]
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "standings", label: "Standings", icon: <Trophy className="w-4 h-4" /> },
    { id: "challenges", label: "Challenges", icon: <Zap className="w-4 h-4" />, count: seasonChallenges.length },
    { id: "matches", label: "Matches", icon: <Swords className="w-4 h-4" />, count: ladderMatches.length },
    { id: "champions", label: "Champions", icon: <Star className="w-4 h-4" /> },
  ];

  if (!season && seasons) {
    return <AdminLayout><div className="text-muted-foreground">Season not found.</div></AdminLayout>;
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
              <span className="text-xs bg-muted rounded-full px-1.5 py-0.5 text-muted-foreground">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── STANDINGS TAB ─────────────────────────────────────── */}
      {tab === "standings" && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Players who have ladder matches in this season, ranked by current ELO.
          </p>
          <div className="bg-card border border-border/50 rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
                <tr>
                  <th className="px-6 py-3 w-12">#</th>
                  <th className="px-6 py-3">Player</th>
                  <th className="px-6 py-3">ELO</th>
                  <th className="px-6 py-3">W / L</th>
                  <th className="px-6 py-3">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {playersLoading || matchesLoading ? (
                  <tr><td colSpan={5} className="px-6 py-4 text-center text-muted-foreground">Loading…</td></tr>
                ) : !standings.length ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                      No players have ladder matches in this season yet.
                    </td>
                  </tr>
                ) : standings.map((p) => {
                  const total = p.wins + p.losses;
                  const wr = total ? `${Math.round((p.wins / total) * 100)}%` : "—";
                  return (
                    <tr key={p.id} className="border-b border-border/20 hover:bg-muted/20">
                      <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{p.rank}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{p.riotId}</div>
                        <div className="text-xs text-muted-foreground">{p.discordUsername}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-primary font-semibold">{p.currentElo}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        <span className="text-green-400">{p.wins}W</span>{" / "}
                        <span className="text-red-400">{p.losses}L</span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{wr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CHALLENGES TAB ────────────────────────────────────── */}
      {tab === "challenges" && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-start gap-2 text-sm text-muted-foreground max-w-lg">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-yellow-400" />
              <span>
                <span className="text-yellow-400">Force Accept / Record Result / Assign Loss</span> buttons are pending backend implementation (B3/B5/B6 in REMAINING_WORK.md).
              </span>
            </div>
            <select
              value={challengeStatusFilter}
              onChange={(e) => setChallengeStatusFilter(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shrink-0"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
              <option value="expired">Expired</option>
              <option value="expired_no_show">No-show</option>
              <option value="disputed">Disputed</option>
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
                {seasonChallenges.length === 0 ? "No challenges this season yet." : "No challenges match the selected filter."}
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border/50 rounded-lg overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-3">Challenger</th>
                    <th className="px-6 py-3">vs</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 hidden sm:table-cell">Scheduled</th>
                    <th className="px-6 py-3 hidden md:table-cell">Game ID</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChallenges.map((c) => {
                    const canForceAccept = c.status === "pending";
                    const canRecordResult = c.status === "accepted" && !!c.gameId;
                    const canMarkNoShow = c.status === "accepted";
                    const canAssignLoss = c.status === "expired_no_show";
                    const isCompleted = c.status === "completed";
                    return (
                      <tr key={c.id} className="border-b border-border/20 hover:bg-muted/20">
                        <td className="px-6 py-4 font-medium">{c.challengerRiotId ?? `#${c.challengerId}`}</td>
                        <td className="px-6 py-4 text-muted-foreground">{c.challengedRiotId ?? `#${c.challengedId}`}</td>
                        <td className="px-6 py-4">{challengeStatusBadge(c.status)}</td>
                        <td className="px-6 py-4 text-muted-foreground text-xs hidden sm:table-cell">
                          {c.scheduledTime
                            ? new Date(c.scheduledTime).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground font-mono text-xs hidden md:table-cell">
                          {c.gameId ?? "—"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {canForceAccept && (
                              <Button size="sm" variant="outline" disabled title={DISABLED_TOOLTIP}
                                className="gap-1.5 text-xs opacity-50 cursor-not-allowed">
                                <ShieldAlert className="w-3.5 h-3.5" /> Force Accept
                              </Button>
                            )}
                            {canRecordResult && (
                              <Button size="sm" variant="outline" disabled title={DISABLED_TOOLTIP}
                                className="gap-1.5 text-xs text-yellow-400 border-yellow-400/30 opacity-50 cursor-not-allowed">
                                <ClipboardCheck className="w-3.5 h-3.5" /> Record Result
                              </Button>
                            )}
                            {canMarkNoShow && (
                              <Button size="sm" variant="outline" disabled title={DISABLED_TOOLTIP}
                                className="gap-1.5 text-xs text-orange-400 border-orange-400/30 opacity-50 cursor-not-allowed">
                                <UserX className="w-3.5 h-3.5" /> No-Show
                              </Button>
                            )}
                            {canAssignLoss && (
                              <Button size="sm" variant="outline" disabled title={DISABLED_TOOLTIP}
                                className="gap-1.5 text-xs text-red-400 border-red-400/30 opacity-50 cursor-not-allowed">
                                <UserX className="w-3.5 h-3.5" /> Assign Loss
                              </Button>
                            )}
                            {isCompleted && c.matchId && (
                              <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-primary"
                                onClick={() => navigate(`/matches/${c.matchId}`)}>
                                <ExternalLink className="w-3.5 h-3.5" /> View Match
                              </Button>
                            )}
                            <Button size="sm" variant="ghost"
                              className="text-xs text-red-400 hover:bg-red-500/10 hover:text-red-400"
                              onClick={() => { if (confirm("Delete this challenge?")) deleteChallenge.mutate({ id: c.id }); }}>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MATCHES TAB ───────────────────────────────────────── */}
      {tab === "matches" && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div className="flex items-start gap-2 text-sm text-muted-foreground max-w-lg">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
              <span>
                Ladder matches for this season. Matches from accepted challenges should be created via
                the <strong className="text-foreground">Challenges → Record Result</strong> flow (once backend B3 is built)
                to ensure proper linking.
              </span>
            </div>
            <Button size="sm" onClick={openNewMatch} className="shrink-0">
              <Plus className="w-4 h-4 mr-2" /> Add Match
            </Button>
          </div>

          <div className="bg-card border border-border/50 rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
                <tr>
                  <th className="px-6 py-3">Players</th>
                  <th className="px-6 py-3">Result</th>
                  <th className="px-6 py-3 hidden sm:table-cell">Score</th>
                  <th className="px-6 py-3 hidden md:table-cell">ELO Δ</th>
                  <th className="px-6 py-3 hidden lg:table-cell">Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {matchesLoading ? (
                  <tr><td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">Loading…</td></tr>
                ) : !ladderMatches.length ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                      No ladder matches this season yet.
                    </td>
                  </tr>
                ) : ladderMatches.map((m) => (
                  <tr key={m.id} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-6 py-4">
                      <div className="font-medium">{m.sideAName}</div>
                      <div className="text-xs text-muted-foreground">vs {m.sideBName}</div>
                    </td>
                    <td className="px-6 py-4">
                      {m.winnerName
                        ? <span className="text-green-400 font-medium text-xs">{m.winnerName} wins</span>
                        : <span className="text-muted-foreground text-xs">TBD</span>}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs hidden sm:table-cell">
                      {m.score ?? "—"}
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-xs space-y-0.5">
                      {m.playerAEloAfter != null && m.playerAEloBefore != null ? (
                        <div>
                          <span className="text-muted-foreground">{m.sideAName}: </span>
                          <span className={m.playerAEloAfter >= m.playerAEloBefore ? "text-green-400" : "text-red-400"}>
                            {m.playerAEloAfter >= m.playerAEloBefore ? "+" : ""}
                            {m.playerAEloAfter - m.playerAEloBefore}
                          </span>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                      {m.playerBEloAfter != null && m.playerBEloBefore != null && (
                        <div>
                          <span className="text-muted-foreground">{m.sideBName}: </span>
                          <span className={m.playerBEloAfter >= m.playerBEloBefore ? "text-green-400" : "text-red-400"}>
                            {m.playerBEloAfter >= m.playerBEloBefore ? "+" : ""}
                            {m.playerBEloAfter - m.playerBEloBefore}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs hidden lg:table-cell">
                      {m.createdAt
                        ? new Date(m.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Edit match" onClick={() => openEditMatch(m)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Manage VODs for this match" onClick={() => navigate(`/admin/vods?matchId=${m.id}`)}>
                          <Film className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" title="View public match page" onClick={() => window.open(`/matches/${m.id}`, "_blank")}>
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete match — ELO changes will NOT be reversed automatically"
                          onClick={() => { if (confirm("Delete this match?\n\nELO changes will NOT be reversed automatically.")) deleteMatch.mutate({ id: m.id }); }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add / Edit Ladder Match Dialog */}
          <Dialog open={matchDialogOpen} onOpenChange={(open) => { setMatchDialogOpen(open); if (!open) setEditingMatchId(null); }}>
            <DialogHeader>
              <DialogTitle>{editingMatchId ? "Edit Ladder Match" : "Add Ladder Match"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleMatchSubmit(onMatchSubmit)} className="space-y-4 mt-4">
              {/* Players */}
              <div className="border border-border/50 rounded-md bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Players</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Player A</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...regMatch("playerAId")}>
                      <option value="">Select player…</option>
                      {allPlayers?.map((p) => <option key={p.id} value={p.id}>{p.riotId} ({p.currentElo})</option>)}
                    </select>
                    {matchPlayerA && (
                      <p className="text-xs text-muted-foreground mt-1">ELO: <span className="text-primary font-semibold">{matchPlayerA.currentElo}</span></p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Player B</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...regMatch("playerBId")}>
                      <option value="">Select player…</option>
                      {allPlayers?.map((p) => <option key={p.id} value={p.id}>{p.riotId} ({p.currentElo})</option>)}
                    </select>
                    {matchPlayerB && (
                      <p className="text-xs text-muted-foreground mt-1">ELO: <span className="text-primary font-semibold">{matchPlayerB.currentElo}</span></p>
                    )}
                  </div>
                </div>
              </div>

              {/* Result */}
              <div className="border border-border/50 rounded-md bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Result</p>
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Winner</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" value="A" {...regMatch("winner")} defaultChecked className="accent-primary" />
                      <span className="text-sm">{matchPlayerA?.riotId ?? "Player A"}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" value="B" {...regMatch("winner")} className="accent-primary" />
                      <span className="text-sm">{matchPlayerB?.riotId ?? "Player B"}</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Score (optional, e.g. "2-1")</label>
                  <Input placeholder="e.g. 1-0" {...regMatch("score")} />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={(createMatch.isPending || updateMatch.isPending) || (!editingMatchId && (!watchedPlayerAId || !watchedPlayerBId))}>
                  {createMatch.isPending || updateMatch.isPending ? "Saving…" : editingMatchId ? "Save Changes" : "Save Match"}
                </Button>
              </div>
            </form>
          </Dialog>
        </div>
      )}

      {/* ── CHAMPIONS TAB ─────────────────────────────────────── */}
      {tab === "champions" && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Season champion. Awarded automatically when the season is completed.
          </p>
          {championsLoading ? (
            <div className="h-24 bg-card rounded-lg animate-pulse" />
          ) : !seasonChampion ? (
            <div className="text-center py-16 border border-dashed border-border rounded-lg">
              <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground">
                {season?.status === "completed"
                  ? "No champion recorded for this season."
                  : "Champion will be crowned when the season is completed via Seasons list."}
              </p>
            </div>
          ) : (
            <div className="max-w-xs">
              <div className="bg-card border border-yellow-400/20 rounded-xl p-6 text-center">
                <Star className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Season Champion</p>
                <p className="text-2xl font-display font-bold text-yellow-400">
                  {seasonChampion.playerRiotId ?? `Player #${seasonChampion.playerId}`}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Final ELO: <span className="text-primary font-mono font-semibold">{seasonChampion.finalElo}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Crowned {new Date(seasonChampion.createdAt).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
