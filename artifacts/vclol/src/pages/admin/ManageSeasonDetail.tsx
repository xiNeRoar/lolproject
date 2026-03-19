import AdminLayout from "@/components/layout/AdminLayout";
import {
  useListSeasons,
  useUpdateSeason,
  useActivateSeason,
  useCompleteSeason,
  useGetLadderSettings,
  useListTeams,
  useListMatches,
  useCreateMatch,
  useUpdateMatch,
  useDeleteMatch,
  useListSeasonChampions,
  type CreateMatchRequest,
  type Match,
} from "@workspace/api-client-react";
import { MATCH_FORMAT_OPTIONS, getScoreOptions } from "@/lib/tournament-formats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Trophy, Swords, Star, Plus, Info, Edit, Trash2, Film, Settings, ExternalLink,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Link } from "wouter";

type Tab = "details" | "standings" | "matches" | "champions";

function seasonStatusBadge(status: string) {
  if (status === "active") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
  if (status === "completed") return <Badge variant="outline" className="text-muted-foreground">Completed</Badge>;
  return <Badge variant="secondary">Upcoming</Badge>;
}

export default function ManageSeasonDetail() {
  const { id } = useParams<{ id: string }>();
  const seasonId = Number(id);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("details");
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);

  const { data: seasons } = useListSeasons();
  const season = seasons?.find((s) => s.id === seasonId);

  const { data: allTeams } = useListTeams();
  const { data: allMatches, isLoading: matchesLoading } = useListMatches({ seasonId });
  const { data: allChampions, isLoading: championsLoading } = useListSeasonChampions();

  const { data: ladderSettings } = useGetLadderSettings();
  const deleteMatch = useDeleteMatch();
  const createMatch = useCreateMatch();
  const updateMatch = useUpdateMatch();
  const updateSeason = useUpdateSeason();
  const activateSeason = useActivateSeason();
  const completeSeason = useCompleteSeason();
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [seasonSaving, setSeasonSaving] = useState(false);
  const [seasonEditForm, setSeasonEditForm] = useState({
    name: "", startDate: "", endDate: "", eloResetFactor: "0.50", defaultMatchFormat: "" as string | null,
  });

  const { register: regMatch, handleSubmit: handleMatchSubmit, reset: resetMatch, control: matchControl, setValue: setMatchVal } = useForm();
  const watchedTeamAId = useWatch({ control: matchControl, name: "teamAId" });
  const watchedTeamBId = useWatch({ control: matchControl, name: "teamBId" });
  const watchedMatchFormat = useWatch({ control: matchControl, name: "format" });
  const scoreOptions = getScoreOptions(watchedMatchFormat || "BO1");
  const matchTeamA = allTeams?.find((t) => t.id === Number(watchedTeamAId));
  const matchTeamB = allTeams?.find((t) => t.id === Number(watchedTeamBId));

  useEffect(() => {
    if (season) {
      setSeasonEditForm({
        name: season.name,
        startDate: season.startDate,
        endDate: season.endDate,
        eloResetFactor: season.eloResetFactor,
        defaultMatchFormat: season.defaultMatchFormat ?? null,
      });
    }
  }, [season?.id]);

  useEffect(() => {
    if (matchTeamA) setMatchVal("sideAName", matchTeamA.name);
  }, [watchedTeamAId]);

  useEffect(() => {
    if (matchTeamB) setMatchVal("sideBName", matchTeamB.name);
  }, [watchedTeamBId]);

  const resolvedDefaultFormat = season?.defaultMatchFormat || ladderSettings?.defaultMatchFormat || "BO1";

  const openNewMatch = () => {
    resetMatch({ teamAId: "", teamBId: "", sideAName: "", sideBName: "", winner: "A", format: resolvedDefaultFormat, score: "" });
    setEditingMatchId(null);
    setMatchDialogOpen(true);
  };

  const openEditMatch = (m: Match) => {
    const winner = m.winnerName === m.sideBName ? "B" : "A";
    resetMatch({
      teamAId: m.teamAId ? String(m.teamAId) : "",
      teamBId: m.teamBId ? String(m.teamBId) : "",
      sideAName: m.sideAName,
      sideBName: m.sideBName,
      winner,
      format: m.format || "BO1",
      score: m.score ?? "",
    });
    setEditingMatchId(m.id);
    setMatchDialogOpen(true);
  };

  const invalidateMatchQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
    queryClient.invalidateQueries({ queryKey: ["/api/ladder"] });
  };

  const onMatchSubmit = (data: Record<string, unknown>) => {
    const sideA = String(data.sideAName ?? matchTeamA?.name ?? "");
    const sideB = String(data.sideBName ?? matchTeamB?.name ?? "");
    const winnerName = data.winner === "B" ? sideB : sideA;
    const payload: CreateMatchRequest = {
      matchTitle: `${sideA} vs ${sideB}`,
      sideAName: sideA,
      sideBName: sideB,
      winnerName,
      score: data.score ? String(data.score) : null,
      format: data.format ? String(data.format) : "BO1",
      eventId: null,
      teamAId: data.teamAId ? Number(data.teamAId) : null,
      teamBId: data.teamBId ? Number(data.teamBId) : null,
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

  const ladderMatches = useMemo(() => (allMatches ?? []).filter((m) => !m.eventId), [allMatches]);

  const standings = useMemo(() => {
    if (!allTeams) return [];
    return [...allTeams]
      .filter((t) => t.isActive)
      .sort((a, b) => b.teamElo - a.teamElo)
      .map((t, idx) => ({ ...t, rank: idx + 1 }));
  }, [allTeams]);

  const seasonChampion = useMemo(
    () => (allChampions ?? []).find((c) => c.seasonId === seasonId),
    [allChampions, seasonId]
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "details", label: "Details", icon: <Settings className="w-4 h-4" /> },
    { id: "standings", label: "Standings", icon: <Trophy className="w-4 h-4" /> },
    { id: "matches", label: "Matches", icon: <Swords className="w-4 h-4" />, count: ladderMatches.length },
    { id: "champions", label: "Champions", icon: <Star className="w-4 h-4" /> },
  ];

  if (!season && seasons) {
    return <AdminLayout><div className="text-muted-foreground">Season not found.</div></AdminLayout>;
  }

  return (
    <AdminLayout>
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

      {tab === "details" && (
        <div className="max-w-lg space-y-6">
          <div className="bg-card border border-border/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="text-sm font-medium block">Season Status</label>
                <p className="text-xs text-muted-foreground mt-0.5">Use the actions below to change season status.</p>
              </div>
              {season && seasonStatusBadge(season.status)}
            </div>
            <div className="flex gap-2">
              {season?.status !== "active" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-400 border-green-400/30"
                  onClick={() => {
                    if (confirm("Activate this season? This will deactivate any currently active season.")) {
                      activateSeason.mutate({ id: seasonId }, {
                        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/seasons"] }),
                      });
                    }
                  }}
                  disabled={activateSeason.isPending}
                >
                  Activate Season
                </Button>
              )}
              {season?.status === "active" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-yellow-400 border-yellow-400/30"
                  onClick={() => {
                    if (confirm("Complete this season? This will crown the top team as champion and archive standings.")) {
                      completeSeason.mutate({ id: seasonId }, {
                        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/seasons"] }),
                      });
                    }
                  }}
                  disabled={completeSeason.isPending}
                >
                  Complete Season
                </Button>
              )}
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-lg p-6 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Season Info</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                <Input value={seasonEditForm.name} onChange={(e) => setSeasonEditForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
                  <Input type="date" value={seasonEditForm.startDate} onChange={(e) => setSeasonEditForm((f) => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
                  <Input type="date" value={seasonEditForm.endDate} onChange={(e) => setSeasonEditForm((f) => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">ELO Reset Factor</label>
                  <Input value={seasonEditForm.eloResetFactor} onChange={(e) => setSeasonEditForm((f) => ({ ...f, eloResetFactor: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Default Match Format</label>
                  <select
                    value={seasonEditForm.defaultMatchFormat ?? ""}
                    onChange={(e) => setSeasonEditForm((f) => ({ ...f, defaultMatchFormat: e.target.value || null }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Use ladder default ({ladderSettings?.defaultMatchFormat ?? "BO1"})</option>
                    {MATCH_FORMAT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <Button
              size="sm"
              disabled={seasonSaving}
              onClick={() => {
                setSeasonSaving(true);
                updateSeason.mutate({
                  id: seasonId,
                  data: {
                    name: seasonEditForm.name,
                    startDate: seasonEditForm.startDate,
                    endDate: seasonEditForm.endDate,
                    eloResetFactor: seasonEditForm.eloResetFactor,
                    defaultMatchFormat: seasonEditForm.defaultMatchFormat,
                  },
                }, {
                  onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
                    setSeasonSaving(false);
                  },
                  onError: () => setSeasonSaving(false),
                });
              }}
            >
              {seasonSaving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      )}

      {tab === "standings" && (
        <div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground mb-4 max-w-lg">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
            <span>
              Current team standings sorted by ELO. Teams qualify for playoffs based on their ELO ranking.
            </span>
          </div>

          <div className="bg-card border border-border/50 rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
                <tr>
                  <th className="px-6 py-3 w-14">#</th>
                  <th className="px-6 py-3">Team</th>
                  <th className="px-6 py-3">ELO</th>
                  <th className="px-6 py-3">W/L</th>
                </tr>
              </thead>
              <tbody>
                {standings.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">No active teams yet.</td></tr>
                ) : (
                  standings.map((team) => (
                    <tr key={team.id} className="border-b border-border/20 hover:bg-muted/20">
                      <td className="px-6 py-4 font-bold text-muted-foreground">{team.rank}</td>
                      <td className="px-6 py-4">
                        <Link href={`/teams/${team.id}`} className="font-medium text-primary hover:underline">
                          {team.name}
                        </Link>
                        <span className="text-xs text-muted-foreground ml-2">[{team.tag}]</span>
                      </td>
                      <td className="px-6 py-4 font-display font-bold text-primary">{team.teamElo}</td>
                      <td className="px-6 py-4">
                        <span className="text-green-400">{team.wins}W</span> / <span className="text-red-400">{team.losses}L</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "matches" && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div className="flex items-start gap-2 text-sm text-muted-foreground max-w-lg">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
              <span>
                Ladder matches for this season. Matches submitted through the Discord bot will appear here automatically.
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
                  <th className="px-6 py-3">Teams</th>
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
                      {m.teamAEloAfter != null && m.teamAEloBefore != null ? (
                        <div>
                          <span className="text-muted-foreground">{m.sideAName}: </span>
                          <span className={m.teamAEloAfter >= m.teamAEloBefore ? "text-green-400" : "text-red-400"}>
                            {m.teamAEloAfter >= m.teamAEloBefore ? "+" : ""}
                            {m.teamAEloAfter - m.teamAEloBefore}
                          </span>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                      {m.teamBEloAfter != null && m.teamBEloBefore != null && (
                        <div>
                          <span className="text-muted-foreground">{m.sideBName}: </span>
                          <span className={m.teamBEloAfter >= m.teamBEloBefore ? "text-green-400" : "text-red-400"}>
                            {m.teamBEloAfter >= m.teamBEloBefore ? "+" : ""}
                            {m.teamBEloAfter - m.teamBEloBefore}
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
                        <Button variant="ghost" size="icon" title="Delete match"
                          onClick={() => { if (confirm("Delete this match?\n\nELO changes will NOT be reversed automatically.")) deleteMatch.mutate({ id: m.id }, { onSuccess: invalidateMatchQueries }); }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Dialog open={matchDialogOpen} onOpenChange={(open) => { setMatchDialogOpen(open); if (!open) setEditingMatchId(null); }}>
            <DialogHeader>
              <DialogTitle>{editingMatchId ? "Edit Ladder Match" : "Add Ladder Match"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleMatchSubmit(onMatchSubmit)} className="space-y-4 mt-4">
              <div className="border border-border/50 rounded-md bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Teams</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Team A</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...regMatch("teamAId")}>
                      <option value="">Select team…</option>
                      {allTeams?.map((t) => <option key={t.id} value={t.id}>{t.name} [{t.tag}] ({t.teamElo})</option>)}
                    </select>
                    {matchTeamA && (
                      <p className="text-xs text-muted-foreground mt-1">ELO: <span className="text-primary font-semibold">{matchTeamA.teamElo}</span></p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Team B</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...regMatch("teamBId")}>
                      <option value="">Select team…</option>
                      {allTeams?.map((t) => <option key={t.id} value={t.id}>{t.name} [{t.tag}] ({t.teamElo})</option>)}
                    </select>
                    {matchTeamB && (
                      <p className="text-xs text-muted-foreground mt-1">ELO: <span className="text-primary font-semibold">{matchTeamB.teamElo}</span></p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border border-border/50 rounded-md bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Result</p>
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Winner</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" value="A" {...regMatch("winner")} defaultChecked className="accent-primary" />
                      <span className="text-sm">{matchTeamA?.name ?? "Team A"}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" value="B" {...regMatch("winner")} className="accent-primary" />
                      <span className="text-sm">{matchTeamB?.name ?? "Team B"}</span>
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Format</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...regMatch("format")}>
                      {MATCH_FORMAT_OPTIONS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Score</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...regMatch("score")}>
                      <option value="">— No score</option>
                      {scoreOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={(createMatch.isPending || updateMatch.isPending) || (!editingMatchId && (!watchedTeamAId || !watchedTeamBId))}>
                  {createMatch.isPending || updateMatch.isPending ? "Saving…" : editingMatchId ? "Save Changes" : "Save Match"}
                </Button>
              </div>
            </form>
          </Dialog>
        </div>
      )}

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
                  {seasonChampion.teamName ? (
                    <Link href={`/teams/${seasonChampion.teamId}`} className="hover:underline">
                      {seasonChampion.teamName}
                    </Link>
                  ) : `Team #${seasonChampion.teamId}`}
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
