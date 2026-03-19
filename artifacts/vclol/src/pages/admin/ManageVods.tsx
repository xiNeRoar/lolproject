import AdminLayout from "@/components/layout/AdminLayout";
import {
  useListVods,
  useListEvents,
  useCreateVod,
  useUpdateVod,
  useDeleteVod,
  useListPlayers,
  useListVodTimestamps,
  useCreateVodTimestamp,
  useDeleteVodTimestamp,
  type VodEntry,
  type CreateVodRequest,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Clock, Film, X, Wand2 } from "lucide-react";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

const POSITIONS = ["Mid", "Top", "Jungle", "Bot", "Support"];
const TIMESTAMP_TYPES = ["manual", "kill", "death", "tower", "first_blood"];

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function TimestampsPanel({ vodId }: { vodId: number }) {
  const queryClient = useQueryClient();
  const { data: timestamps } = useListVodTimestamps(vodId);
  const createTs = useCreateVodTimestamp();
  const deleteTs = useDeleteVodTimestamp();
  const { register, handleSubmit, reset } = useForm<{ label: string; seconds: number; type: string }>();

  const onAdd = (data: { label: string; seconds: number; type: string }) => {
    createTs.mutate(
      { id: vodId, data: { label: data.label, seconds: Number(data.seconds), type: data.type || "manual" } },
      { onSuccess: () => { reset(); queryClient.invalidateQueries({ queryKey: [`/api/vods/${vodId}/timestamps`] }); } }
    );
  };

  const onDelete = (id: number) => {
    deleteTs.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/vods/${vodId}/timestamps`] }) });
  };

  return (
    <div className="border rounded-md border-border/50 bg-muted/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Timestamps</p>
      </div>

      {timestamps && timestamps.length > 0 ? (
        <ul className="space-y-1">
          {timestamps.map((ts) => (
            <li key={ts.id} className="flex justify-between items-center text-sm py-1 border-b border-border/20 last:border-0">
              <span>
                <span className="font-mono text-primary mr-2">{formatSeconds(ts.seconds)}</span>
                {ts.label}
                <Badge variant="outline" className="ml-2 text-[10px]">{ts.type}</Badge>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onDelete(ts.id)}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No timestamps yet.</p>
      )}

      <form onSubmit={handleSubmit(onAdd)} className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Label (e.g. First Blood)" {...register("label", { required: true })} className="h-8 text-xs" />
          <Input type="number" placeholder="Seconds (e.g. 90)" {...register("seconds", { required: true })} className="h-8 text-xs" />
        </div>
        <div className="flex gap-2">
          <select
            className="flex h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground flex-1"
            {...register("type")}
          >
            {TIMESTAMP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button type="submit" size="sm" className="h-8 text-xs" disabled={createTs.isPending}>
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function ManageVods() {
  const { data: vods, isLoading } = useListVods();
  const { data: events } = useListEvents();
  const { data: players } = useListPlayers();
  const queryClient = useQueryClient();
  const [location, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [matchIdFilter, setMatchIdFilter] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("matchId");
  });

  const clearMatchFilter = useCallback(() => {
    window.history.replaceState({}, "", "/admin/vods");
    setMatchIdFilter(null);
  }, []);

  const displayedVods = useMemo(() => {
    if (!vods) return [];
    if (!matchIdFilter) return vods;
    return vods.filter((v) => String(v.matchId) === matchIdFilter);
  }, [vods, matchIdFilter]);

  const createMut = useCreateVod();
  const updateMut = useUpdateVod();
  const deleteMut = useDeleteVod();

  const { register, handleSubmit, reset, setValue, getValues, control } = useForm();
  const watchedPlayerId = useWatch({ control, name: "playerId" });
  const skipAutoFill = useRef(false);

  const openNew = () => {
    skipAutoFill.current = true;
    reset({ eventId: "", playerId: "" });
    setEditingId(null);
    setIsOpen(true);
  };

  const openEdit = (vod: VodEntry) => {
    skipAutoFill.current = true;
    reset({ ...vod, eventId: vod.eventId || "", playerId: vod.playerId || "" });
    setEditingId(vod.id);
    setIsOpen(true);
  };

  useEffect(() => {
    if (skipAutoFill.current) {
      skipAutoFill.current = false;
      return;
    }
    if (!watchedPlayerId) {
      setValue("playerEloAtTime", "");
      return;
    }
  }, [watchedPlayerId]);

  const onSubmit = (data: Record<string, unknown>) => {
    const payload: CreateVodRequest = {
      title: String(data.title ?? ""),
      videoUrl: String(data.videoUrl ?? ""),
      format: data.format ? String(data.format) : null,
      playerNames: data.playerNames ? String(data.playerNames) : null,
      roleTag: data.roleTag ? String(data.roleTag) : null,
      notes: data.notes ? String(data.notes) : null,
      champion: data.champion ? String(data.champion) : null,
      opponentChampion: data.opponentChampion ? String(data.opponentChampion) : null,
      position: data.position ? String(data.position) : null,
      patch: data.patch ? String(data.patch) : null,
      eventId: data.eventId ? Number(data.eventId) : null,
      playerId: data.playerId ? Number(data.playerId) : null,
    };
    if (editingId) {
      updateMut.mutate(
        { id: editingId, data: payload },
        { onSuccess: () => { setIsOpen(false); queryClient.invalidateQueries({ queryKey: ["/api/vods"] }); } }
      );
    } else {
      createMut.mutate(
        { data: payload },
        { onSuccess: () => { setIsOpen(false); queryClient.invalidateQueries({ queryKey: ["/api/vods"] }); } }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this VOD?")) {
      deleteMut.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/vods"] }) });
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display font-bold">Manage VODs</h1>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Add VOD</Button>
      </div>

      {/* Match filter banner */}
      {matchIdFilter && (
        <div className="flex items-center gap-3 mb-6 px-4 py-3 bg-primary/10 border border-primary/20 rounded-lg">
          <Film className="w-4 h-4 text-primary shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-medium text-primary">Showing VODs for Match #{matchIdFilter}</span>
            <span className="text-xs text-muted-foreground ml-2">({displayedVods.length} VOD{displayedVods.length !== 1 ? "s" : ""})</span>
          </div>
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={clearMatchFilter}
          >
            <X className="w-3.5 h-3.5" /> Clear filter
          </button>
        </div>
      )}

      {/* Render Queue — hidden when filtering by match */}
      {!matchIdFilter && (
      <div className="mb-8">
        <h2 className="text-xl font-display font-bold mb-4">Render Queue</h2>
        <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border/30 bg-muted/20">
            <p className="text-sm text-muted-foreground">
              .rofl files waiting to be rendered and uploaded to YouTube.
              Render machine must be running on your Windows PC.
            </p>
          </div>
          {/* Placeholder — Claude Code will wire up the actual API */}
          <div className="p-8 text-center text-muted-foreground text-sm">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/30 border border-border/40">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
              Render queue API not yet connected — Claude Code will implement
            </div>
          </div>
        </div>
      </div>
      )}

      <div className="bg-card border border-border/50 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
            <tr>
              <th className="px-6 py-3">Title / Event</th>
              <th className="px-6 py-3">URL</th>
              <th className="px-6 py-3">Tags / Champion</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center">Loading...</td></tr>
            ) : displayedVods.map((item) => (
              <tr key={item.id} className="border-b border-border/20 hover:bg-muted/20">
                <td className="px-6 py-4">
                  <div className="font-bold">{item.title}</div>
                  <div className="text-xs text-primary">{item.eventTitle || "Independent"}</div>
                </td>
                <td className="px-6 py-4 truncate max-w-[200px] text-xs">
                  <a href={item.videoUrl} target="_blank" rel="noreferrer" className="hover:underline">{item.videoUrl}</a>
                </td>
                <td className="px-6 py-4">
                  {item.format && <span className="mr-1 border px-1 rounded text-[10px]">{item.format}</span>}
                  {item.roleTag && <span className="border px-1 rounded text-[10px] bg-primary/10 text-primary border-primary/20">{item.roleTag}</span>}
                  {item.champion && <div className="text-[10px] text-muted-foreground mt-1">{item.champion}{item.opponentChampion ? ` vs ${item.opponentChampion}` : ""}</div>}
                </td>
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
        <DialogHeader><DialogTitle>{editingId ? "Edit VOD" : "Add VOD"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="flex gap-2">
            <Input placeholder="VOD Title" {...register("title", { required: true })} className="flex-1" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Auto-generate title from player names and champion"
              onClick={() => {
                const { playerNames, champion } = getValues();
                if (!playerNames) return;
                const parts = String(playerNames).split(",").map((s: string) => s.trim());
                let title = "";
                if (champion && parts[0]) {
                  title = `${parts[0]} (${champion}) vs ${parts[1] ?? "Opponent"} — VCLoL`;
                } else if (parts.length >= 2 && parts[1]) {
                  title = `${parts[0]} vs ${parts[1]} — VCLoL`;
                } else {
                  title = `${playerNames} — VCLoL`;
                }
                setValue("title", title);
              }}
            >
              <Wand2 className="w-4 h-4" />
            </Button>
          </div>
          <Input placeholder="Video URL (YouTube/Twitch)" {...register("videoUrl", { required: true })} />
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("eventId")}>
            <option value="">No Event (Independent)</option>
            {events?.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Format (e.g. Pro View, Full Match)" {...register("format")} />
            <Input placeholder="Role Tag (e.g. Jungle, Mid)" {...register("roleTag")} />
          </div>
          <Input placeholder="Player Names (comma separated)" {...register("playerNames")} />

          {/* Phase 2 fields */}
          <div className="border p-4 rounded-md border-border/50 bg-muted/20 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Champion / Game Info</p>
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="Champion (e.g. Zed)" {...register("champion")} />
              <Input placeholder="Opponent (e.g. Ahri)" {...register("opponentChampion")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("position")}>
                <option value="">Position (optional)</option>
                {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <Input placeholder="Patch (e.g. 14.8)" {...register("patch")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Linked Player</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("playerId")}>
                  <option value="">None</option>
                  {players?.map((p) => <option key={p.id} value={p.id}>{p.riotId}</option>)}
                </select>
              </div>
            </div>
          </div>

          <Textarea placeholder="Notes" {...register("notes")} />

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>Save</Button>
          </div>
        </form>

        {/* Timestamps sub-section — only shown when editing */}
        {editingId !== null && (
          <div className="mt-6">
            <TimestampsPanel vodId={editingId} />
          </div>
        )}
      </Dialog>
    </AdminLayout>
  );
}
