import AdminLayout from "@/components/layout/AdminLayout";
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
  useListPlayers,
  useListSeasons,
  type Match,
  type CreateMatchRequest,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle, XCircle, Trash2, Edit, Plus, Users, Swords, Trophy, ClipboardList } from "lucide-react";
import { useState, useEffect } from "react";
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
  const { data: players } = useListPlayers();
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

  const { register: regEvent, handleSubmit: handleEventSubmit, reset: resetEvent } = useForm({
    values: event ?? undefined,
  });

  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const { register: regMatch, handleSubmit: handleMatchSubmit, reset: resetMatch, control, setValue: setMatchValue } = useForm();
  const watchedPlayerAId = useWatch({ control, name: "playerAId" });
  const watchedPlayerBId = useWatch({ control, name: "playerBId" });
  const playerA = players?.find((p) => p.id === Number(watchedPlayerAId));
  const playerB = players?.find((p) => p.id === Number(watchedPlayerBId));
  const playerAElo = playerA?.currentElo;
  const playerBElo = playerB?.currentElo;

  useEffect(() => {
    if (playerA) setMatchValue("sideAName", playerA.riotId);
  }, [watchedPlayerAId]);

  useEffect(() => {
    if (playerB) setMatchValue("sideBName", playerB.riotId);
  }, [watchedPlayerBId]);

  const openNewMatch = () => {
    resetMatch({ eventId, playerAId: "", playerBId: "", seasonId: "", isPlayoff: false, round: "", bracketSlot: "", isLosersBracket: false });
    setEditingMatchId(null);
    setMatchDialogOpen(true);
  };

  const openEditMatch = (match: Match) => {
    resetMatch({ ...match, eventId: match.eventId || eventId, playerAId: match.playerAId || "", playerBId: match.playerBId || "", seasonId: match.seasonId || "" });
    setEditingMatchId(match.id);
    setMatchDialogOpen(true);
  };

  const onMatchSubmit = (data: Record<string, unknown>) => {
    const payload: CreateMatchRequest = {
      matchTitle: String(data.matchTitle ?? ""),
      sideAName: String(data.sideAName ?? ""),
      sideBName: String(data.sideBName ?? ""),
      winnerName: String(data.winnerName ?? ""),
      score: data.score ? String(data.score) : null,
      format: data.format ? String(data.format) : null,
      vodUrl: data.vodUrl ? String(data.vodUrl) : null,
      eventId,
      playerAId: data.playerAId ? Number(data.playerAId) : null,
      playerBId: data.playerBId ? Number(data.playerBId) : null,
      seasonId: data.seasonId ? Number(data.seasonId) : null,
      isPlayoff: Boolean(data.isPlayoff),
      round: data.round ? Number(data.round) : null,
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
      {/* Header */}
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
          </button>
        ))}
      </div>

      {/* ── DETAILS TAB ───────────────────────────────────────── */}
      {tab === "details" && event && (
        <div className="max-w-2xl">
          <form onSubmit={handleEventSubmit(onEventSubmit)} className="space-y-4">
            <Input placeholder="Event Title" {...regEvent("title", { required: true })} />
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="Slug" {...regEvent("slug", { required: true })} />
              <Input type="date" {...regEvent("eventDate", { required: true })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" {...regEvent("format", { required: true })}>
                <option value="Single Elimination">Single Elimination</option>
                <option value="Double Elimination">Double Elimination</option>
                <option value="Round Robin">Round Robin</option>
                <option value="Swiss">Swiss</option>
                <option value="Group Stage + Knockout">Group Stage + Knockout</option>
                <option value="In-house">In-house</option>
                <option value="1v1 Ladder">1v1 Ladder</option>
              </select>
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

      {/* ── REGISTRATIONS TAB ─────────────────────────────────── */}
      {tab === "registrations" && (
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
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </Button>
                      )}
                      {r.status !== "withdrawn" && (
                        <Button variant="ghost" size="icon" title="Withdraw" onClick={() => withdrawReg.mutate({ id: r.id }, { onSuccess: invalidateRegs })}>
                          <XCircle className="w-4 h-4 text-yellow-500" />
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
      )}

      {/* ── BRACKET TAB ───────────────────────────────────────── */}
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

      {/* ── MATCHES TAB ───────────────────────────────────────── */}
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
                  <th className="px-6 py-3">Title / Format</th>
                  <th className="px-6 py-3">Matchup</th>
                  <th className="px-6 py-3">Score</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {eventMatches.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-6 text-center text-muted-foreground">No matches yet.</td></tr>
                ) : (
                  [...eventMatches].sort((a, b) => (a.round ?? 99) - (b.round ?? 99)).map((m) => (
                    <tr key={m.id} className="border-b border-border/20 hover:bg-muted/20">
                      <td className="px-6 py-4">
                        {m.round ? (
                          <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded">R{m.round}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{m.matchTitle}</div>
                        <div className="text-xs text-muted-foreground">{m.format}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={m.winnerName === m.sideAName ? "font-bold text-primary" : ""}>{m.sideAName}</span>
                        <span className="mx-2 text-muted-foreground text-xs">vs</span>
                        <span className={m.winnerName === m.sideBName ? "font-bold text-primary" : ""}>{m.sideBName}</span>
                      </td>
                      <td className="px-6 py-4 font-display font-bold">{m.score || "—"}</td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditMatch(m)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete match?")) deleteMatch.mutate({ id: m.id }, { onSuccess: invalidateMatches }); }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Match Dialog */}
          <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
            <DialogHeader><DialogTitle>{editingMatchId ? "Edit Match" : "Add Match"}</DialogTitle></DialogHeader>
            <form onSubmit={handleMatchSubmit(onMatchSubmit)} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Match Title (e.g. Grand Finals)" {...regMatch("matchTitle", { required: true })} />
                <Input placeholder="Format (e.g. BO3)" {...regMatch("format")} />
              </div>
              <div className="grid grid-cols-2 gap-4 border p-4 rounded-md border-border/50 bg-muted/20">
                <Input placeholder="Side A Name" {...regMatch("sideAName", { required: true })} />
                <Input placeholder="Side B Name" {...regMatch("sideBName", { required: true })} />
                <Input placeholder="Winner Name" className="col-span-2" {...regMatch("winnerName", { required: true })} />
                <Input placeholder="Score (e.g. 2-1)" className="col-span-2" {...regMatch("score")} />
              </div>
              <Input placeholder="VOD URL (Optional)" {...regMatch("vodUrl")} />

              {/* Bracket Position */}
              <div className="border p-4 rounded-md border-border/50 bg-muted/20 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bracket Position</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Round # <span className="text-muted-foreground/60">(1=QF, 2=SF, 3=Final)</span></label>
                    <Input type="number" placeholder="e.g. 1" {...regMatch("round")} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Bracket Slot #</label>
                    <Input type="number" placeholder="e.g. 1" {...regMatch("bracketSlot")} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input type="checkbox" {...regMatch("isLosersBracket")} />
                  Losers Bracket (Double Elimination)
                </label>
              </div>

              {/* ELO Tracking */}
              <div className="border p-4 rounded-md border-border/50 bg-muted/20 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ELO Tracking (Optional)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Player A</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...regMatch("playerAId")}>
                      <option value="">None</option>
                      {players?.map((p) => <option key={p.id} value={p.id}>{p.riotId}</option>)}
                    </select>
                    {watchedPlayerAId && playerAElo !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">ELO: <span className="font-semibold text-foreground">{playerAElo}</span></p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Player B</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...regMatch("playerBId")}>
                      <option value="">None</option>
                      {players?.map((p) => <option key={p.id} value={p.id}>{p.riotId}</option>)}
                    </select>
                    {watchedPlayerBId && playerBElo !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">ELO: <span className="font-semibold text-foreground">{playerBElo}</span></p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Season</label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...regMatch("seasonId")}>
                      <option value="">No Season</option>
                      {seasons?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input type="checkbox" {...regMatch("isPlayoff")} />
                      Playoff Match
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={createMatch.isPending || updateMatch.isPending}>Save</Button>
              </div>
            </form>
          </Dialog>
        </div>
      )}
    </AdminLayout>
  );
}
