import AdminLayout from "@/components/layout/AdminLayout";
import {
  useListMatches,
  useListEvents,
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
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useSearch } from "wouter";

export default function ManageMatches() {
  const { data: matches, isLoading } = useListMatches();
  const { data: events } = useListEvents();
  const { data: players } = useListPlayers();
  const { data: seasons } = useListSeasons();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const search = useSearch();

  const createMut = useCreateMatch();
  const updateMut = useUpdateMatch();
  const deleteMut = useDeleteMatch();

  const { register, handleSubmit, reset, control, setValue } = useForm();

  const watchedPlayerAId = useWatch({ control, name: "playerAId" });
  const watchedPlayerBId = useWatch({ control, name: "playerBId" });

  const playerA = players?.find((p) => p.id === Number(watchedPlayerAId));
  const playerB = players?.find((p) => p.id === Number(watchedPlayerBId));
  const playerAElo = playerA?.currentElo;
  const playerBElo = playerB?.currentElo;

  useEffect(() => {
    if (playerA) setValue("sideAName", playerA.riotId);
  }, [watchedPlayerAId]);

  useEffect(() => {
    if (playerB) setValue("sideBName", playerB.riotId);
  }, [watchedPlayerBId]);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const playerAId = params.get("playerAId");
    const playerBId = params.get("playerBId");
    if (playerAId && playerBId) {
      reset({ eventId: "", playerAId, playerBId, seasonId: "", isPlayoff: false, round: "", bracketSlot: "", isLosersBracket: false });
      setEditingId(null);
      setIsOpen(true);
    }
  }, [search]);

  const openNew = () => {
    reset({ eventId: "", playerAId: "", playerBId: "", seasonId: "", isPlayoff: false, round: "", bracketSlot: "", isLosersBracket: false });
    setEditingId(null);
    setIsOpen(true);
  };

  const openEdit = (match: Match) => {
    reset({
      ...match,
      eventId: match.eventId || "",
      playerAId: match.playerAId || "",
      playerBId: match.playerBId || "",
      seasonId: match.seasonId || "",
    });
    setEditingId(match.id);
    setIsOpen(true);
  };

  const onSubmit = (data: Record<string, unknown>) => {
    const payload: CreateMatchRequest = {
      matchTitle: String(data.matchTitle ?? ""),
      sideAName: String(data.sideAName ?? ""),
      sideBName: String(data.sideBName ?? ""),
      winnerName: String(data.winnerName ?? ""),
      score: data.score ? String(data.score) : null,
      format: data.format ? String(data.format) : null,
      vodUrl: data.vodUrl ? String(data.vodUrl) : null,
      eventId: data.eventId ? Number(data.eventId) : null,
      playerAId: data.playerAId ? Number(data.playerAId) : null,
      playerBId: data.playerBId ? Number(data.playerBId) : null,
      seasonId: data.seasonId ? Number(data.seasonId) : null,
      isPlayoff: Boolean(data.isPlayoff),
      round: data.round ? Number(data.round) : null,
      bracketSlot: data.bracketSlot ? Number(data.bracketSlot) : null,
      isLosersBracket: Boolean(data.isLosersBracket),
    };

    if (editingId) {
      updateMut.mutate(
        { id: editingId, data: payload },
        { onSuccess: () => { setIsOpen(false); queryClient.invalidateQueries({ queryKey: ["/api/matches"] }); } }
      );
    } else {
      createMut.mutate(
        { data: payload },
        { onSuccess: () => { setIsOpen(false); queryClient.invalidateQueries({ queryKey: ["/api/matches"] }); } }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this match?")) {
      deleteMut.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/matches"] }) });
    }
  };

  const [eventFilter, setEventFilter] = useState<number | null>(null);

  const filteredMatches = eventFilter === null
    ? matches
    : eventFilter === 0
      ? matches?.filter((m) => !m.eventId)
      : matches?.filter((m) => m.eventId === eventFilter);

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-display font-bold">Manage Matches</h1>
        <div className="flex items-center gap-3">
          <select
            className="h-10 rounded-md border border-input bg-card px-3 py-2 text-sm"
            value={eventFilter ?? ""}
            onChange={(e) => setEventFilter(e.target.value === "" ? null : Number(e.target.value))}
          >
            <option value="">All Matches</option>
            <option value={0}>Independent (no event)</option>
            {events?.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Add Match</Button>
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
            <tr>
              <th className="px-6 py-3">Round</th>
              <th className="px-6 py-3">Event / Format</th>
              <th className="px-6 py-3">Matchup</th>
              <th className="px-6 py-3">Score</th>
              <th className="px-6 py-3">VOD</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center">Loading...</td></tr>
            ) : !filteredMatches?.length ? (
              <tr><td colSpan={6} className="px-6 py-6 text-center text-muted-foreground">No matches found.</td></tr>
            ) : filteredMatches?.map((item) => (
              <tr key={item.id} className="border-b border-border/20 hover:bg-muted/20">
                <td className="px-6 py-4">
                  {item.round ? (
                    <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded">R{item.round}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-primary">{item.eventTitle || "Independent"}</div>
                  <div className="text-xs text-muted-foreground">{item.format} • {item.matchTitle}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={item.winnerName === item.sideAName ? "font-bold" : ""}>{item.sideAName}</span>
                  <span className="mx-2 text-muted-foreground text-xs">vs</span>
                  <span className={item.winnerName === item.sideBName ? "font-bold" : ""}>{item.sideBName}</span>
                </td>
                <td className="px-6 py-4 font-display font-bold">{item.score || "-"}</td>
                <td className="px-6 py-4 text-xs text-muted-foreground truncate max-w-[100px]">{item.vodUrl || "No VOD"}</td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogHeader><DialogTitle>{editingId ? "Edit Match" : "Add Match"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("eventId")}>
            <option value="">No Event (Independent)</option>
            {events?.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Match Title (e.g. Grand Finals)" {...register("matchTitle", { required: true })} />
            <Input placeholder="Format (e.g. BO3, BO5)" {...register("format")} />
          </div>
          <div className="grid grid-cols-2 gap-4 border p-4 rounded-md border-border/50 bg-muted/20">
            <Input placeholder="Side A Name" {...register("sideAName", { required: true })} />
            <Input placeholder="Side B Name" {...register("sideBName", { required: true })} />
            <Input placeholder="Winner Name" className="col-span-2" {...register("winnerName", { required: true })} />
            <Input placeholder="Score (e.g. 2-1)" className="col-span-2" {...register("score")} />
          </div>
          <Input placeholder="VOD URL (Optional)" {...register("vodUrl")} />

          {/* Bracket Section */}
          <div className="border p-4 rounded-md border-border/50 bg-muted/20 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bracket Position (Optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Round #</label>
                <Input type="number" placeholder="e.g. 1" {...register("round")} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Bracket Slot #</label>
                <Input type="number" placeholder="e.g. 1" {...register("bracketSlot")} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" className="rounded border-input" {...register("isLosersBracket")} />
              Losers Bracket Match (Double Elimination)
            </label>
          </div>

          {/* ELO Section */}
          <div className="border p-4 rounded-md border-border/50 bg-muted/20 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ELO Tracking (Optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Player A</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("playerAId")}>
                  <option value="">None</option>
                  {players?.map((p) => <option key={p.id} value={p.id}>{p.riotId}</option>)}
                </select>
                {watchedPlayerAId && playerAElo !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">Current ELO: <span className="font-semibold text-foreground">{playerAElo}</span></p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Player B</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("playerBId")}>
                  <option value="">None</option>
                  {players?.map((p) => <option key={p.id} value={p.id}>{p.riotId}</option>)}
                </select>
                {watchedPlayerBId && playerBElo !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">Current ELO: <span className="font-semibold text-foreground">{playerBElo}</span></p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Season</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("seasonId")}>
                  <option value="">No Season</option>
                  {seasons?.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input type="checkbox" className="rounded border-input" {...register("isPlayoff")} />
                  Playoff Match
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>Save</Button>
          </div>
        </form>
      </Dialog>
    </AdminLayout>
  );
}
