import AdminLayout from "@/components/layout/AdminLayout";
import {
  useListPlayers,
  useCreatePlayer,
  useUpdatePlayer,
  useDeletePlayer,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

export default function ManagePlayers() {
  const { data: players, isLoading } = useListPlayers();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const createMut = useCreatePlayer();
  const updateMut = useUpdatePlayer();
  const deleteMut = useDeletePlayer();

  const { register, handleSubmit, reset } = useForm();

  const openNew = () => {
    reset({ riotId: "", discordUsername: "", currentElo: 1000, isActive: true });
    setEditingId(null);
    setIsOpen(true);
  };

  const openEdit = (player: any) => {
    reset({ ...player });
    setEditingId(player.id);
    setIsOpen(true);
  };

  const onSubmit = (data: any) => {
    const payload = {
      riotId: data.riotId,
      discordUsername: data.discordUsername,
      email: data.email || undefined,
      notificationPreference: data.notificationPreference || undefined,
      currentElo: data.currentElo ? Number(data.currentElo) : undefined,
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

      <div className="bg-card border border-border/50 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
            <tr>
              <th className="px-6 py-3">Player</th>
              <th className="px-6 py-3">Discord</th>
              <th className="px-6 py-3">
                <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> ELO</span>
              </th>
              <th className="px-6 py-3">W/L</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : players?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                  No players yet. Add one to get started.
                </td>
              </tr>
            ) : (
              players?.map((player) => (
                <tr key={player.id} className="border-b border-border/20 hover:bg-muted/20">
                  <td className="px-6 py-4 font-medium">{player.riotId}</td>
                  <td className="px-6 py-4 text-muted-foreground">{player.discordUsername}</td>
                  <td className="px-6 py-4">
                    <div className="font-display font-bold text-primary">{player.currentElo}</div>
                    <div className="text-xs text-muted-foreground">Peak: {player.peakElo}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-green-400">{player.wins}W</span>
                    {" / "}
                    <span className="text-red-400">{player.losses}L</span>
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
                    <Button variant="ghost" size="icon" onClick={() => openEdit(player)}>
                      <Edit className="w-4 h-4" />
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
          <Input
            type="number"
            placeholder="Starting ELO (default 1000)"
            {...register("currentElo")}
          />
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
    </AdminLayout>
  );
}
