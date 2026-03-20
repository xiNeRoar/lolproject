import AdminLayout from "@/components/layout/AdminLayout";
import {
  useListPlayers,
  useCreatePlayer,
  useUpdatePlayer,
  useDeletePlayer,
  useListBans,
  useCreateBan,
  useLiftBan,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, ShieldBan, ShieldOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ROLES } from "@/lib/lol-utils";

export default function ManagePlayers() {
  const { data: players, isLoading } = useListPlayers();
  const { data: bans, isError: bansError } = useListBans();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banTargetPlayer, setBanTargetPlayer] = useState<{ id: number; riotId: string } | null>(null);

  const createMut = useCreatePlayer();
  const updateMut = useUpdatePlayer();
  const deleteMut = useDeletePlayer();
  const createBanMut = useCreateBan();
  const liftBanMut = useLiftBan();

  const { register, handleSubmit, reset } = useForm();
  const { register: registerBan, handleSubmit: handleBanSubmit, reset: resetBan } = useForm();

  const activeBansByPlayerId = new Map<number, { id: number; reason: string; banType: string; expiresAt?: string | null }>();
  if (bans) {
    for (const ban of bans) {
      if (ban.playerId && ban.isActive) {
        activeBansByPlayerId.set(ban.playerId, ban);
      }
    }
  }

  const openNew = () => {
    reset({ riotId: "", discordUsername: "", primaryRole: "", secondaryRole: "", isActive: true });
    setEditingId(null);
    setIsOpen(true);
  };

  const openEdit = (player: any) => {
    reset({ ...player });
    setEditingId(player.id);
    setIsOpen(true);
  };

  const openBanDialog = (player: { id: number; riotId: string }) => {
    setBanTargetPlayer(player);
    resetBan({ reason: "", banType: "temp_ban", expiresAt: "" });
    setBanDialogOpen(true);
  };

  const onSubmit = (data: any) => {
    const payload = {
      riotId: data.riotId,
      discordUsername: data.discordUsername,
      email: data.email || undefined,
      notificationPreference: data.notificationPreference || undefined,
      primaryRole: data.primaryRole || undefined,
      secondaryRole: data.secondaryRole || undefined,
      isActive: data.isActive === true || data.isActive === "true",
    };

    if (editingId) {
      updateMut.mutate({ id: editingId, data: payload }, {
        onSuccess: () => {
          setIsOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/players"] });
        },
      });
    } else {
      createMut.mutate({ data: payload }, {
        onSuccess: () => {
          setIsOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/players"] });
        },
      });
    }
  };

  const onBanSubmit = (data: any) => {
    if (!banTargetPlayer) return;
    createBanMut.mutate({
      data: {
        playerId: banTargetPlayer.id,
        reason: data.reason,
        banType: data.banType || null,
        expiresAt: data.expiresAt || null,
      },
    }, {
      onSuccess: () => {
        setBanDialogOpen(false);
        setBanTargetPlayer(null);
        queryClient.invalidateQueries({ queryKey: ["/api/bans"] });
        toast({ title: "Player banned", description: `${banTargetPlayer.riotId} has been banned.` });
      },
      onError: () => {
        toast({ title: "Failed to ban player", variant: "destructive" });
      },
    });
  };

  const handleLiftBan = (banId: number, playerRiotId: string) => {
    liftBanMut.mutate({ id: banId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/bans"] });
        toast({ title: "Ban lifted", description: `Ban on ${playerRiotId} has been lifted.` });
      },
      onError: () => {
        toast({ title: "Failed to lift ban", variant: "destructive" });
      },
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this player? This cannot be undone.")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/players"] }),
      });
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display font-bold">Manage Players</h1>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> Add Player
        </Button>
      </div>

      {bansError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-yellow-400/30 bg-yellow-400/5 px-4 py-3 text-sm text-yellow-400">
          <ShieldBan className="w-4 h-4 flex-shrink-0" />
          Ban status could not be loaded. Ban badges may not appear.
        </div>
      )}

      <div className="bg-card border border-border/50 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
            <tr>
              <th className="px-6 py-3">Player</th>
              <th className="px-6 py-3">Discord</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/20">
                  <td className="px-6 py-4"><div className="h-4 w-28 bg-muted/40 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-24 bg-muted/40 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-16 bg-muted/40 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-5 w-14 bg-muted/40 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-8 w-20 bg-muted/40 rounded animate-pulse ml-auto" /></td>
                </tr>
              ))
            ) : players?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                  No players yet. Add one to get started.
                </td>
              </tr>
            ) : (
              players?.map((player) => {
                const activeBan = activeBansByPlayerId.get(player.id);
                return (
                  <tr key={player.id} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-2">
                        {player.riotId}
                        {activeBan && (
                          <Badge className="bg-red-400/10 text-red-400 border-red-400/30">
                            Banned
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{player.discordUsername}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {player.primaryRole || "-"}
                      {player.secondaryRole && ` / ${player.secondaryRole}`}
                    </td>
                    <td className="px-6 py-4">
                      {player.isActive ? (
                        <Badge variant="outline" className="text-green-400 border-green-400/30 bg-green-400/10">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {activeBan ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Lift ban"
                            onClick={() => handleLiftBan(activeBan.id, player.riotId)}
                            disabled={liftBanMut.isPending}
                          >
                            <ShieldOff className="w-4 h-4 text-yellow-400" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Ban player"
                            onClick={() => openBanDialog({ id: player.id, riotId: player.riotId })}
                          >
                            <ShieldBan className="w-4 h-4 text-muted-foreground hover:text-red-400" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(player)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(player.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogHeader>
          <DialogTitle>{editingId ? "Edit Player" : "Add Player"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <Input placeholder="Riot ID (e.g. Faker#KR1)" {...register("riotId", { required: true })} />
          <Input
            placeholder="Discord Username (e.g. faker#0001)"
            {...register("discordUsername", { required: true })}
          />
          <Input
            type="email"
            placeholder="Email (optional)"
            {...register("email")}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Primary Role</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register("primaryRole")}
              >
                <option value="">None</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Secondary Role</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register("secondaryRole")}
              >
                <option value="">None</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notification Preference</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register("notificationPreference")}
            >
              <option value="">Default (web)</option>
              <option value="web">Web only</option>
              <option value="email">Email</option>
              <option value="discord">Discord DM</option>
              <option value="both">Email + Discord</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" {...register("isActive")} defaultChecked />
            <label htmlFor="isActive" className="text-sm">Active player</label>
          </div>
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={createMut.isPending || updateMut.isPending}
            >
              Save
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogHeader>
          <DialogTitle>Ban Player — {banTargetPlayer?.riotId}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleBanSubmit(onBanSubmit)} className="space-y-4 mt-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Reason</label>
            <Input placeholder="Reason for ban" {...registerBan("reason", { required: true })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Ban Type</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...registerBan("banType")}
            >
              <option value="warning">Warning</option>
              <option value="temporary">Temporary Ban</option>
              <option value="permanent">Permanent Ban</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Expires At (optional)</label>
            <Input type="datetime-local" {...registerBan("expiresAt")} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={createBanMut.isPending}
            >
              <ShieldBan className="w-4 h-4 mr-2" />
              Confirm Ban
            </Button>
          </div>
        </form>
      </Dialog>
    </AdminLayout>
  );
}
