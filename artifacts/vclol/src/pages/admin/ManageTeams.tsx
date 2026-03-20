import AdminLayout from "@/components/layout/AdminLayout";
import {
  useListTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useListPlayers,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

export default function ManageTeams() {
  const { data: teams, isLoading } = useListTeams();
  const { data: players } = useListPlayers();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const createMut = useCreateTeam();
  const updateMut = useUpdateTeam();
  const deleteMut = useDeleteTeam();

  const { register, handleSubmit, reset } = useForm();

  const openNew = () => {
    reset({ name: "", tag: "", captainPlayerId: "", teamElo: 1000, isActive: true });
    setEditingId(null);
    setIsOpen(true);
  };

  const openEdit = (team: any) => {
    reset({ ...team, captainPlayerId: String(team.captainPlayerId) });
    setEditingId(team.id);
    setIsOpen(true);
  };

  const onSubmit = (data: any) => {
    const payload = {
      name: data.name,
      tag: data.tag,
      captainPlayerId: Number(data.captainPlayerId),
      discordServerId: data.discordServerId || undefined,
      teamElo: data.teamElo ? Number(data.teamElo) : undefined,
      isActive: data.isActive === true || data.isActive === "true",
    };

    if (editingId) {
      updateMut.mutate({ id: editingId, data: payload }, {
        onSuccess: () => {
          setIsOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
        },
      });
    } else {
      createMut.mutate({ data: payload }, {
        onSuccess: () => {
          setIsOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this team? This cannot be undone.")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/teams"] }),
      });
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display font-bold">Manage Teams</h1>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> Add Team
        </Button>
      </div>

      <div className="bg-card border border-border/50 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
            <tr>
              <th className="px-6 py-3">Team</th>
              <th className="px-6 py-3">Tag</th>
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
            ) : teams?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                  No teams yet. Add one to get started.
                </td>
              </tr>
            ) : (
              teams?.map((team) => (
                <tr key={team.id} className="border-b border-border/20 hover:bg-muted/20">
                  <td className="px-6 py-4 font-medium">{team.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">[{team.tag}]</td>
                  <td className="px-6 py-4">
                    <div className="font-display font-bold text-primary">{team.teamElo}</div>
                    <div className="text-xs text-muted-foreground">Peak: {team.peakElo}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-green-400">{team.wins}W</span>
                    {" / "}
                    <span className="text-red-400">{team.losses}L</span>
                  </td>
                  <td className="px-6 py-4">
                    {team.isActive ? (
                      <Badge variant="outline" className="text-green-400 border-green-400/30 bg-green-400/10">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(team)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(team.id)}>
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
          <DialogTitle>{editingId ? "Edit Team" : "Add Team"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <Input placeholder="Team Name" {...register("name", { required: true })} />
          <Input placeholder="Tag (e.g. TSM)" {...register("tag", { required: true })} />
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Captain</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...register("captainPlayerId", { required: true })}
            >
              <option value="">Select captain...</option>
              {players?.map((p) => (
                <option key={p.id} value={p.id}>{p.riotId} ({p.discordUsername})</option>
              ))}
            </select>
          </div>
          <Input placeholder="Discord Server ID (optional)" {...register("discordServerId")} />
          <Input
            type="number"
            placeholder="Starting ELO (default 1000)"
            {...register("teamElo")}
          />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" {...register("isActive")} defaultChecked />
            <label htmlFor="isActive" className="text-sm">Active team</label>
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
