import AdminLayout from "@/components/layout/AdminLayout";
import {
  useListPlayers,
  useCreatePlayer,
  useUpdatePlayer,
  useDeletePlayer,
  useCreateBan,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Ban } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { ROLES } from "@/lib/lol-utils";
import { toast } from "sonner";

export default function ManagePlayers() {
  const { data: players, isLoading } = useListPlayers();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [banTarget, setBanTarget] = useState<{ id: number; riotId: string } | null>(null);

  const createMut = useCreatePlayer();
  const updateMut = useUpdatePlayer();
  const deleteMut = useDeletePlayer();
  const banMut = useCreateBan();

  const { register, handleSubmit, reset } = useForm();
  const { register: registerBan, handleSubmit: handleBanSubmit, reset: resetBan } = useForm();

  const openNew = () => {
    reset({ riotId: "", discordUsername: "", isActive: true });
    setEditingId(null);
    setIsOpen(true);
  };

  const openEdit = (player: any) => {
    reset({ ...player });
    setEditingId(player.id);
    setIsOpen(true);
  };

  const onSubmit = (data: any) => {
    const payload = { ...data, isActive: !!data.isActive };
    if (editingId) {
      updateMut.mutate({ id: editingId, data: payload }, {
        onSuccess: () => { toast.success("Player updated"); queryClient.invalidateQueries({ queryKey: ["/api/players"] }); setIsOpen(false); },
        onError: () => toast.error("Failed to update player"),
      });
    } else {
      createMut.mutate({ data: payload }, {
        onSuccess: () => { toast.success("Player created"); queryClient.invalidateQueries({ queryKey: ["/api/players"] }); setIsOpen(false); },
        onError: () => toast.error("Failed to create player"),
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this player?")) return;
    deleteMut.mutate({ id }, {
      onSuccess: () => { toast.success("Player deleted"); queryClient.invalidateQueries({ queryKey: ["/api/players"] }); },
      onError: () => toast.error("Failed to delete player"),
    });
  };

  const onBanSubmit = (data: any) => {
    if (!banTarget) return;
    banMut.mutate({
      data: {
        playerId: banTarget.id,
        reason: data.reason,
        banType: data.banType || "permanent",
        expiresAt: data.expiresAt || null,
      }
    }, {
      onSuccess: () => {
        toast.success(`${banTarget.riotId} banned`);
        queryClient.invalidateQueries({ queryKey: ["/api/players"] });
        setBanTarget(null);
        resetBan();
      },
      onError: () => toast.error("Failed to ban player"),
    });
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold">Players</h1>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Add Player</Button>
      </div>

      <div className="bg-card border border-border/50 rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
            <tr>
              <th className="px-6 py-3 text-left">Riot ID</th>
              <th className="px-6 py-3 text-left">Discord</th>
              <th className="px-6 py-3 text-left">Role</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-muted-foreground">
                <div className="h-8 bg-card rounded animate-pulse" />
              </td></tr>
            ) : players?.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">No players yet.</td></tr>
            ) : (
              players?.map((player) => (
                <tr key={player.id} className="border-b border-border/20 hover:bg-muted/20">
                  <td className="px-6 py-4 font-medium">{player.riotId}</td>
                  <td className="px-6 py-4 text-muted-foreground">{player.discordUsername}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {player.primaryRole || "-"}{player.secondaryRole && ` / ${player.secondaryRole}`}
                  </td>
                  <td className="px-6 py-4">
                    {player.isActive ? (
                      <Badge variant="outline" className="text-green-400 border-green-400/30 bg-green-400/10">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(player)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon"
                      onClick={() => { setBanTarget({ id: player.id, riotId: player.riotId }); resetBan(); }}
                      title="Ban player">
                      <Ban className="w-4 h-4 text-destructive" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(player.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Player" : "Add Player"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <Input placeholder="Riot ID (e.g. Faker#KR1)" {...register("riotId", { required: true })} />
            <Input placeholder="Discord Username" {...register("discordUsername", { required: true })} />
            <Input type="email" placeholder="Email (optional)" {...register("email")} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Primary Role</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("primaryRole")}>
                  <option value="">None</option>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Secondary Role</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("secondaryRole")}>
                  <option value="">None</option>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" {...register("isActive")} defaultChecked />
              <label htmlFor="isActive" className="text-sm">Active player</label>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ban Dialog — R5 */}
      <Dialog open={!!banTarget} onOpenChange={(o) => { if (!o) setBanTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban {banTarget?.riotId}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBanSubmit(onBanSubmit)} className="space-y-4 mt-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Reason *</label>
              <Input placeholder="Reason for ban" {...registerBan("reason", { required: true })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ban Type</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...registerBan("banType")}>
                <option value="permanent">Permanent</option>
                <option value="temporary">Temporary</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Expires At (optional, for temporary bans)</label>
              <Input type="datetime-local" {...registerBan("expiresAt")} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setBanTarget(null)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={banMut.isPending}>Ban Player</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
