import AdminLayout from "@/components/layout/AdminLayout";
import { EVENT_FORMAT_OPTIONS, getScoreOptions } from "@/lib/tournament-formats";
import {
  useListEvents,
  useUpdateEvent,
  useListRegistrations,
  useDeleteRegistration,
  useConfirmRegistration,
  useWithdrawRegistration,
  useListMatches,
  useCreateMatch,
  useUpdateMatch,
  useDeleteMatch,
  useListTeams,
  useListSeasons,
  type Match,
  type CreateMatchRequest,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle, XCircle, Trash2, Edit, Plus, Users, Swords, Trophy, ClipboardList, Film } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { SingleEliminationBracket } from "@/components/brackets/SingleEliminationBracket";
import { DoubleEliminationBracket } from "@/components/brackets/DoubleEliminationBracket";
import { RoundRobinTable } from "@/components/brackets/RoundRobinTable";
import { SwissRoundsTable } from "@/components/brackets/SwissRoundsTable";
import { MatchList } from "@/components/brackets/MatchList";

type Tab = "details" | "registrations" | "bracket" | "matches";

function regStatusVariant(status: string | null | undefined) {
  if (status === "confirmed") return "default";
  if (status === "withdrawn") return "destructive";
  return "secondary";
}

function BracketTab({ matches, format }: { matches: Match[]; format: string }) {
  const fmt = format?.toLowerCase() ?? "";
  if (fmt.includes("double")) return <DoubleEliminationBracket matches={matches} />;
  if (fmt.includes("round robin")) return <RoundRobinTable matches={matches} />;
  if (fmt.includes("swiss")) return <SwissRoundsTable matches={matches} />;
  return <SingleEliminationBracket matches={matches} />;
}

const ROUND_LABELS: Record<number, string> = {
  0: "GS",
  1: "QF",
  2: "SF",
  3: "Final",
  4: "3rd",
};

export default function ManageEventDetail() {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("details");

  const { data: events } = useListEvents();
  const event = events?.find((e) => e.id === eventId);

  const { data: regs, isLoading: regsLoading } = useListRegistrations(eventId ? { eventId } : undefined);
  const { data: allMatches } = useListMatches();
  const { data: teams } = useListTeams();
  const { data: seasons } = useListSeasons();

  const eventMatches = (allMatches ?? []).filter((m) => m.eventId === eventId);

  const updateEvent = useUpdateEvent();
  const deleteReg = useDeleteRegistration();
  const confirmReg = useConfirmRegistration();
  const withdrawReg = useWithdrawRegistration();
  const createMatch = useCreateMatch();
  const updateMatch = useUpdateMatch();
  const deleteMatch = useDeleteMatch();

  const invalidateRegs = () => queryClient.invalidateQueries({ queryKey: ["/api/registrations"] });
  const invalidateMatches = () => queryClient.invalidateQueries({ queryKey: ["/api/matches"] });

  const { register: regEvent, handleSubmit: handleEventSubmit, reset: resetEvent, watch: watchEvent } = useForm({
    values: event ?? undefined,
  });
  const watchedEventFormat = watchEvent("format");
  const formatChanged = !!(watchedEventFormat && event?.format && watchedEventFormat !== event.format);

  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const { register: regMatch, handleSubmit: handleMatchSubmit, reset: resetMatch, control, setValue: setMatchValue } = useForm();
  const watchedTeamAId = useWatch({ control, name: "teamAId" });
  const watchedTeamBId = useWatch({ control, name: "teamBId" });
  const watchedWinner = useWatch({ control, name: "winner" });
  const watchedMatchFormat = useWatch({ control, name: "format" });
  const scoreOptions = getScoreOptions(watchedMatchFormat || "BO1");
  const teamA = teams?.find((t) => t.id === Number(watchedTeamAId));
  const teamB = teams?.find((t) => t.id === Number(watchedTeamBId));
  const isDoubleElim = event?.format?.toLowerCase().includes("double");

  const roundOptions = useMemo(() => {
    const fmt = event?.format ?? "";
    if (fmt === "In-house" || fmt === "1v1 Ladder") return null;
    if (fmt === "Round Robin") return [{ label: "Group Stage", value: "0" }];
    if (fmt === "Swiss") return Array.from({ length: 8 }, (_, i) => ({ label: `Round ${i + 1}`, value: String(i + 1) }));
    if (fmt === "Group Stage + Knockout") return [
      { label: "Group Stage", value: "0" },
      { label: "Quarter Finals", value: "1" },
      { label: "Semi Finals", value: "2" },
      { label: "Final", value: "3" },
      { label: "3rd Place", value: "4" },
    ];
    return [
      { label: "Quarter Finals", value: "1" },
      { label: "Semi Finals", value: "2" },
      { label: "Final", value: "3" },
      { label: "3rd Place", value: "4" },
    ];
  }, [event?.format]);

  const showBracketSection = roundOptions !== null;

  const roundMaxSlots: Record<string, number> = { "3": 1, "4": 1, "2": 2 };

  const matchCountByRound = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of eventMatches) {
      if (editingMatchId && m.id === editingMatchId) continue;
      const r = String(m.round ?? "");
      if (r && r !== "") counts[r] = (counts[r] ?? 0) + 1;
    }
    return counts;
  }, [eventMatches, editingMatchId]);

  useEffect(() => {
    setMatchValue("sideAName", teamA ? teamA.name : "");
  }, [watchedTeamAId]);

  useEffect(() => {
    setMatchValue("sideBName", teamB ? teamB.name : "");
  }, [watchedTeamBId]);

  const openNewMatch = () => {
    resetMatch({
      eventId, teamAId: "", teamBId: "", sideAName: "", sideBName: "",
      winner: "A", score: "", format: "", round: "", bracketSlot: "",
      isLosersBracket: false, seasonId: "", isPlayoff: false,
    });
    setEditingMatchId(null);
    setMatchDialogOpen(true);
  };

  const openEditMatch = (match: Match) => {
    const derivedWinner = match.winnerName === match.sideAName ? "A" : "B";
    resetMatch({
      ...match,
      winner: derivedWinner,
      round: match.round != null ? String(match.round) : "",
      eventId: match.eventId || eventId,
      teamAId: match.teamAId || "",
      teamBId: match.teamBId || "",
      seasonId: match.seasonId || "",
    });
    setEditingMatchId(match.id);
    setMatchDialogOpen(true);
  };

  const onMatchSubmit = (data: Record<string, unknown>) => {
    const sideA = String(data.sideAName ?? "");
    const sideB = String(data.sideBName ?? "");
    const winnerName = data.winner === "B" ? sideB : sideA;
    const payload: CreateMatchRequest = {
      matchTitle: `${sideA} vs ${sideB}`,
      sideAName: sideA,
      sideBName: sideB,
      winnerName,
      score: data.score ? String(data.score) : null,
      format: data.format ? String(data.format) : null,
      eventId,
      teamAId: data.teamAId ? Number(data.teamAId) : null,
      teamBId: data.teamBId ? Number(data.teamBId) : null,
      seasonId: data.seasonId ? Number(data.seasonId) : null,
      isPlayoff: Boolean(data.isPlayoff),
      round: data.round !== "" && data.round != null ? Number(data.round) : null,
      bracketSlot: data.bracketSlot ? Number(data.bracketSlot) : null,
      isLosersBracket: Boolean(data.isLosersBracket),
    };
    if (editingMatchId) {
      updateMatch.mutate({ id: editingMatchId, data: payload }, { onSuccess: () => { setMatchDialogOpen(false); invalidateMatches(); } });
    } else {
      createMatch.mutate({ data: payload }, { onSuccess: () => { setMatchDialogOpen(false); invalidateMatches(); } });
    }
  };

  const onEventSubmit = (data: any) => {
    updateEvent.mutate({ id: eventId, data }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/events"] }),
    });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "details", label: "Details", icon: <Trophy className="w-4 h-4" /> },
    { id: "registrations", label: `Registrations (${regs?.length ?? 0})`, icon: <ClipboardList className="w-4 h-4" /> },
    { id: "bracket", label: "Bracket", icon: <Users className="w-4 h-4" /> },
    { id: "matches", label: `Matches (${eventMatches.length})`, icon: <Swords className="w-4 h-4" /> },
  ];

  if (!event && events) {
    return (
      <AdminLayout>
        <div className="text-muted-foreground">Event not found.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <button
          onClick={() => navigate("/admin/events")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> All Events
        </button>
        <h1 className="text-3xl font-display font-bold">{event?.title ?? "Loading…"}</h1>
        {event && (
          <p className="text-sm text-muted-foreground mt-1">
            {event.eventDate} &bull; {event.format} &bull;
            <span className="ml-1 capitalize">{event.registrationStatus}</span>
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
          </button>
        ))}
      </div>

      {tab === "details" && event && (
        <div className="max-w-2xl">
          <form onSubmit={handleEventSubmit(onEventSubmit)} className="space-y-4">
            <Input placeholder="Event Title" {...regEvent("title", { required: true })} />
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="Slug" {...regEvent("slug", { required: true })} />
              <Input type="date" {...regEvent("eventDate", { required: true })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" {...regEvent("format", { required: true })}>
                  {EVENT_FORMAT_OPTIONS.map((fmt) => (
                    <option key={fmt} value={fmt}>{fmt}</option>
                  ))}
                </select>
                {formatChanged && eventMatches.length > 0 && (
                  <p className="text-xs text-yellow-400 flex items-start gap-1">
                    <span className="mt-px">⚠</span>
                    <span>{eventMatches.length} match{eventMatches.length !== 1 ? "es" : ""} entered — changing format affects round validation and bracket display.</span>
                  </p>
                )}
              </div>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" {...regEvent("registrationStatus")}>
                <option value="open">Open</option>
                <option value="upcoming">Upcoming</option>
                <option value="closed">Closed</option>
                <option value="invite-only">Invite Only</option>
              </select>
            </div>
            <Textarea placeholder="Short Description" {...regEvent("shortDescription", { required: true })} />
            <Textarea placeholder="Full Description (Markdown)" className="h-32" {...regEvent("fullDescription")} />
            <Textarea placeholder="Rules Summary" {...regEvent("rulesSummary")} />
            <div className="flex justify-end">
              <Button type="submit" disabled={updateEvent.isPending}>
                {updateEvent.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {tab === "registrations" && (
        <div className="space-y-4">
          {event && (event.format === "Single Elimination" || event.format === "Double Elimination") && (() => {
            const confirmedCount = (regs ?? []).filter(r => r.status === "confirmed").length;
            const totalCount = regs?.length ?? 0;
            const isPowerOf2 = confirmedCount >= 4 && (confirmedCount & (confirmedCount - 1)) === 0;
            const nextPower = confirmedCount < 4 ? 4 : confirmedCount < 8 ? 8 : confirmedCount < 16 ? 16 : 32;
            return (
              <div className={`p-3 rounded-md border text-sm flex items-start gap-2 ${isPowerOf2 ? "bg-green-500/10 border-green-500/30" : "bg-muted/30 border-border/40"}`}>
                <span className="text-base leading-5">{isPowerOf2 ? "✓" : "ℹ"}</span>
                <div>
                  <span className="font-medium">{confirmedCount} confirmed</span>
                  <span className="text-muted-foreground"> of {totalCount} registered. </span>
                  {confirmedCount === 0 ? (
                    <span className="text-muted-foreground">Confirm teams to begin bracket planning.</span>
                  ) : isPowerOf2 ? (
                    <span className="text-green-400">Perfect bracket size for {event.format}.</span>
                  ) : (
                    <span className="text-yellow-400">{event.format} works best with 4, 8, or 16 confirmed teams — next ideal count is {nextPower}.</span>
                  )}
                </div>
              </div>
            );
          })()}
          <div className="bg-card border border-border/50 rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
                <tr>
                  <th className="px-6 py-3">Player</th>
                  <th className="px-6 py-3">Rank / City</th>
                  <th className="px-6 py-3">Availability</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {regsLoading ? (
                  <tr><td colSpan={5} className="px-6 py-6 text-center text-muted-foreground">Loading…</td></tr>
                ) : !regs?.length ? (
                  <tr><td colSpan={5} className="px-6 py-6 text-center text-muted-foreground">No registrations yet.</td></tr>
                ) : regs.map((r) => (
                  <tr key={r.id} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-6 py-4">
                      <div className="font-bold">{r.riotId}</div>
                      <div className="text-xs text-muted-foreground">{r.discordUsername}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div>{r.currentRank}</div>
                      <div className="text-xs text-muted-foreground">{r.city}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate" title={r.availabilityConfirmation ?? ""}>
                      {r.availabilityConfirmation}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={regStatusVariant(r.status)} className="capitalize">{r.status ?? "registered"}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.status !== "confirmed" && (
                          <Button variant="ghost" size="icon" title="Confirm" onClick={() => confirmReg.mutate({ id: r.id }, { onSuccess: invalidateRegs })}>
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          </Button>
                        )}
                        {r.status !== "withdrawn" && (
                          <Button variant="ghost" size="icon" title="Withdraw" onClick={() => withdrawReg.mutate({ id: r.id }, { onSuccess: invalidateRegs })}>
                            <XCircle className="w-4 h-4 text-yellow-400" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" title="Delete" onClick={() => { if (confirm("Delete?")) deleteReg.mutate({ id: r.id }, { onSuccess: invalidateRegs }); }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "bracket" && (
        <div>
          <div className="mb-4 p-3 bg-muted/30 border border-border/40 rounded-md text-sm text-muted-foreground">
            Bracket is built from matches assigned to this event with a <strong className="text-foreground">Round #</strong> set.
            Edit matches in the Matches tab to assign rounds.
          </div>
          {eventMatches.length === 0 ? (
            <p className="text-muted-foreground text-sm">No matches for this event yet. Add matches in the Matches tab.</p>
          ) : (
            <BracketTab matches={eventMatches} format={event?.format ?? ""} />
          )}
        </div>
      )}

      {tab === "matches" && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={openNewMatch}><Plus className="w-4 h-4 mr-2" /> Add Match</Button>
          </div>
          <div className="bg-card border border-border/50 rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
                <tr>
                  <th className="px-6 py-3">Round</th>
                  <th className="px-6 py-3">Teams</th>
                  <th className="px-6 py-3">Result</th>
                  <th className="px-6 py-3">Score</th>
                  <th className="px-6 py-3 hidden lg:table-cell">Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {eventMatches.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-6 text-center text-muted-foreground">No matches yet.</td></tr>
                ) : (
                  [...eventMatches].sort((a, b) => (a.round ?? 99) - (b.round ?? 99)).map((m) => (
                    <tr key={m.id} className="border-b border-border/20 hover:bg-muted/20">
                      <td className="px-6 py-4">
                        {m.round != null ? (
                          <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded">
                            {ROUND_LABELS[m.round] ?? `R${m.round}`}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{m.sideAName}</div>
                        <div className="text-xs text-muted-foreground">vs {m.sideBName}</div>
                      </td>
                      <td className="px-6 py-4">
                        {m.winnerName
                          ? <span className="text-green-400 font-medium text-xs">{m.winnerName} wins</span>
                          : <span className="text-muted-foreground text-xs">TBD</span>}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{m.score || "—"}</td>
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
                          <Button variant="ghost" size="icon" title="Delete match" onClick={() => { if (confirm("Delete match?")) deleteMatch.mutate({ id: m.id }, { onSuccess: invalidateMatches }); }}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
            <DialogHeader><DialogTitle>{editingMatchId ? "Edit Match" : "Add Match"}</DialogTitle></DialogHeader>
            <form onSubmit={handleMatchSubmit(onMatchSubmit)} className="space-y-4 mt-4">

              <div className="border border-border/50 rounded-md bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Teams <span className="normal-case font-normal text-muted-foreground/60 ml-1">— link teams to enable ELO update</span>
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground block">Team A</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...regMatch("teamAId")}>
                      <option value="">None — enter name manually</option>
                      {teams?.map((t) => <option key={t.id} value={t.id}>{t.name} [{t.tag}]</option>)}
                    </select>
                    {watchedTeamAId ? (
                      <p className="text-xs text-muted-foreground">ELO: <span className="font-semibold text-primary">{teamA?.teamElo}</span></p>
                    ) : (
                      <Input placeholder="Side A name (e.g. Team Alpha)" {...regMatch("sideAName", { required: true })} />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground block">Team B</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...regMatch("teamBId")}>
                      <option value="">None — enter name manually</option>
                      {teams?.map((t) => <option key={t.id} value={t.id}>{t.name} [{t.tag}]</option>)}
                    </select>
                    {watchedTeamBId ? (
                      <p className="text-xs text-muted-foreground">ELO: <span className="font-semibold text-primary">{teamB?.teamElo}</span></p>
                    ) : (
                      <Input placeholder="Side B name (e.g. Team Beta)" {...regMatch("sideBName", { required: true })} />
                    )}
                  </div>
                </div>
              </div>

              <div className="border border-border/50 rounded-md bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Result</p>
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Winner</label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" value="A" {...regMatch("winner")} className="accent-primary" />
                      <span className="text-sm font-medium">{teamA?.name || "Side A"}</span>
                      {watchedWinner === "A" && <span className="text-xs text-green-400 font-semibold">wins</span>}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" value="B" {...regMatch("winner")} className="accent-primary" />
                      <span className="text-sm font-medium">{teamB?.name || "Side B"}</span>
                      {watchedWinner === "B" && <span className="text-xs text-green-400 font-semibold">wins</span>}
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Score</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...regMatch("score")}>
                      <option value="">— No score</option>
                      {scoreOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Format (optional)</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...regMatch("format")}>
                      <option value="">Inherit from event</option>
                      <option value="BO1">BO1</option>
                      <option value="BO3">BO3</option>
                      <option value="BO5">BO5</option>
                    </select>
                  </div>
                </div>
              </div>

              {showBracketSection && (
              <div className="border border-border/50 rounded-md bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bracket Position</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Round</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...regMatch("round")}>
                      <option value="">— No round</option>
                      {roundOptions!.map((opt) => {
                        const count = matchCountByRound[opt.value] ?? 0;
                        const max = roundMaxSlots[opt.value];
                        const isFull = max !== undefined && count >= max;
                        const hint = isFull
                          ? " (full)"
                          : max !== undefined && count > 0
                          ? ` (${count}/${max})`
                          : opt.value === "1" && count > 0
                          ? ` (${count} entered)`
                          : "";
                        return (
                          <option key={opt.value} value={opt.value} disabled={isFull}>
                            {opt.label}{hint}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Bracket Slot #</label>
                    <Input type="number" min="1" placeholder="e.g. 1" {...regMatch("bracketSlot")} />
                    <p className="text-xs text-muted-foreground/60 mt-1">Position within round — 1 = top match</p>
                  </div>
                </div>
                {isDoubleElim && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input type="checkbox" {...regMatch("isLosersBracket")} className="accent-primary" />
                    Losers Bracket match
                  </label>
                )}
              </div>
              )}

              <div className="border border-border/50 rounded-md bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Playoff Link <span className="normal-case font-normal text-muted-foreground/60 ml-1">— only for season playoff events</span>
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Season</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...regMatch("seasonId")}>
                      <option value="">No Season</option>
                      {seasons?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input type="checkbox" {...regMatch("isPlayoff")} className="accent-primary" />
                      Playoff Match
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={createMatch.isPending || updateMatch.isPending}>
                  {createMatch.isPending || updateMatch.isPending ? "Saving…" : "Save Match"}
                </Button>
              </div>
            </form>
          </Dialog>
        </div>
      )}
    </AdminLayout>
  );
}
