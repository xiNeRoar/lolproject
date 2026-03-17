import AdminLayout from "@/components/layout/AdminLayout";
import {
  useListSeasons,
  useCreateSeason,
  useUpdateSeason,
  useDeleteSeason,
  useActivateSeason,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Play } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

function statusBadge(status: string) {
  if (status === "active") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
  if (status === "ended") return <Badge variant="secondary">Ended</Badge>;
  return <Badge variant="outline">Upcoming</Badge>;
}

export default function ManageSeasons() {
  const { data: seasons, isLoading } = useListSeasons();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const createMut = useCreateSeason();
  const updateMut = useUpdateSeason();
  const deleteMut = useDeleteSeason();
  const activateMut = useActivateSeason();

  const { register, handleSubmit, reset } = useForm();

  const openNew = () => {
    reset({ name: "", startDate: "", endDate: "", eloResetFactor: "0.50" });
    setEditingId(null);
    setIsOpen(true);
  };

  const openEdit = (season: any) => {
    reset({ ...season });
    setEditingId(season.id);
    setIsOpen(true);
  };

  const onSubmit = (data: any) => {
    const payload = {
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      eloResetFactor: data.eloResetFactor || "0.50",
      status: data.status || undefined,
    };

    if (editingId) {
      updateMut.mutate({ id: editingId, data: payload }, {
        onSuccess: () => {
          setIsOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
        },
      });
    } else {
      createMut.mutate({ data: payload }, {
        onSuccess: () => {
          setIsOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
        },
      });
    }
  };

  const handleActivate = (id: number, name: string) => {
    if (
      confirm(
        `Activate "${name}"? This will end any currently active season and apply an ELO soft reset to all players.`
      )
    ) {
      activateMut.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
          queryClient.invalidateQueries({ queryKey: ["/api/players"] });
          queryClient.invalidateQueries({ queryKey: ["/api/ladder"] });
        },
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this season?")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/seasons"] }),
      });
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display font-bold">Manage Seasons</h1>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> New Season
        </Button>
      </div>

      <div className="bg-card border border-border/50 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
            <tr>
              <th className="px-6 py-3">Season</th>
              <th className="px-6 py-3">Dates</th>
              <th className="px-6 py-3">ELO Reset Factor</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : seasons?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                  No seasons yet. Create one to start tracking ELO.
                </td>
              </tr>
            ) : (
              seasons?.map((season) => (
                <tr key={season.id} className="border-b border-border/20 hover:bg-muted/20">
                  <td className="px-6 py-4 font-medium">{season.name}</td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {season.startDate} → {season.endDate}
                  </td>
                  <td className="px-6 py-4 font-mono">{season.eloResetFactor}</td>
                  <td className="px-6 py-4">{statusBadge(season.status)}</td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                    {season.status !== "active" && season.status !== "ended" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Activate Season"
                        onClick={() => handleActivate(season.id, season.name)}
                        disabled={activateMut.isPending}
                      >
                        <Play className="w-4 h-4 text-green-400" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(season)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(season.id)}>
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
          <DialogTitle>{editingId ? "Edit Season" : "New Season"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <Input placeholder="Season Name (e.g. Spring 2025)" {...register("name", { required: true })} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
              <Input type="date" {...register("startDate", { required: true })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
              <Input type="date" {...register("endDate", { required: true })} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              ELO Reset Factor (0.00–1.00)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              placeholder="0.50"
              {...register("eloResetFactor")}
            />
            <p className="text-xs text-muted-foreground mt-1">
              0.50 = compress halfway to 1000. 0 = full reset. 1 = no reset.
            </p>
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
