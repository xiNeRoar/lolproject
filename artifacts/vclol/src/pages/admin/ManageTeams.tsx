import AdminLayout from "@/components/layout/AdminLayout";
import {
  useListTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useListPlayers,
  useListTeamMembers,
  useAddTeamMember,
  useUpdateTeamMember,
  useRemoveTeamMember,
  useCreateBan,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Ban, Users, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const ROLES = ["top", "jungle", "mid", "adc", "support", "fill"];

function TeamMemberPanel({ teamId }: { teamId: number }) {
  const { data: members, isLoading } = useListTeamMembers(teamId);
  const queryClient = useQueryClient();
  const addMut = useAddTeamMember();
  const updateMut = useUpdateTeamMember();
  const removeMut = useRemoveTeamMember();
  const { data: players } = useListPlayers();
  const [addPlayerId, setAddPlayerId] = useState("");
  const [addRole, setAddRole] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/members`] });

  const handleAdd = () => {
    if (!addPlayerId) return;
    addMut.mutate({ id: teamId, data: { playerId: Number(addPlayerId), role: addRole || null } }, {
      onSuccess: () => { toast.success("Member added"); invalidate(); setAddPlayerId(""); setAddRole(""); },
      onError: () => toast.error("Failed to add member"),
    });
  };

  const handleRoleChange = (memberId: number, role: string) => {
    updateMut.mutate({ id: teamId, memberId, data: { role: role || null } }, {
      onSuccess: () => { toast.success("Role updated"); invalidate(); },
      onError: () => toast.error("Failed to update role"),
    });
  };

  const handleRemove = (memberId: number) => {
    if (!confirm("Remove this member?")) return;
    removeMut.mutate({ id: teamId, memberId }, {
      onSuccess: () => { toast.success("Member removed"); invalidate(); },
      onError: () => toast.error("Failed to remove member"),
    });
  };

  if (isLoading) return <div className="px-6 py-3 text-sm text-muted-foreground animate-pulse">Loading members...</div>;

  return (
    <div className="px-6 py-3 bg-muted/20 border-t border-border/20">
      <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Roster</p>

      {members?.length === 0 && <p className="text-sm text-muted-foreground mb-2">No members.</p>}

      {members?.map((m) => (
        <div key={m.id} className="flex items-center gap-3 py-1.5 text-sm">
          <span className="flex-1 font-medium">{m.playerRiotId ?? `Player #${m.playerId}`}</span>
          <select
            value={m.role ?? ""}
            onChange={(e) => handleRoleChange(m.id, e.target.value)}
            className="h-7 rounded border border-input bg-background px-2 text-xs"
          >
            <option value="">No role</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <Badge variant={m.status === "active" ? "outline" : "secondary"} className="text-xs">
            {m.status}
          </Badge>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemove(m.id)}>
            <Trash2 className="w-3 h-3 text-destructive" />
          </Button>
        </div>
      ))}

      {/* Add member */}
      <div className="flex items-center gap-2 mt-2">
        <select
          value={addPlayerId}
          onChange={(e) => setAddPlayerId(e.target.value)}
          className="h-8 flex-1 rounded border border-input bg-background px-2 text-xs"
        >
          <option value="">Select player...</option>
          {players?.filter(p => p.isActive).map((p) => (
            <option key={p.id} value={p.id}>{p.riotId}</option>
          ))}
        </select>
        <select
          value={addRole}
          onChange={(e) => setAddRole(e.target.value)}
          className="h-8 rounded border border-input bg-background px-2 text-xs"
        >
          <option value="">Role</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <Button size="sm" className="h-8 text-xs" onClick={handleAdd} disabled={!addPlayerId || addMut.isPending}>
          Add
        </Button>
      </div>
    </div>
  );
}

export default function ManageTeams() {
  const { data: teams, isLoading } = useListTeams();
  const { data: players } = useListPlayers();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);
  const [banTarget, setBanTarget] = useState<{ id: number; name: string } | null>(null);

  const createMut = useCreateTeam();
  const updateMut = useUpdateTeam();
  const deleteMut = useDeleteTeam();
  const banMut = useCreateBan();

  const { register, handleSubmit, reset } = useForm();
  const { register: registerBan, handleSubmit: handleBanSubmit, reset: resetBan } = useForm();

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
    const payload = { ...data, teamElo: Number(data.teamElo), captainPlayerId: Number(data.captainPlayerId), isActive: !!data.isActive };
    if (editingId) {
      updateMut.mutate({ id: editingId, data: payload }, {
        onSuccess: () => { toast.success("Team updated"); queryClient.invalidateQueries({ queryKey: ["/api/teams"] }); setIsOpen(false); },
        onError: () => toast.error("Failed to update team"),
      });
    } else {
      createMut.mutate({ data: payload }, {
        onSuccess: () => { toast.success("Team created"); queryClient.invalidateQueries({ queryKey: ["/api/teams"] }); setIsOpen(false); },
        onError: () => toast.error("Failed to create team"),
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this team?")) return;
    deleteMut.mutate({ id }, {
      onSuccess: () => { toast.success("Team deleted"); queryClient.invalidateQueries({ queryKey: ["/api/teams"] }); },
      onError: () => toast.error("Failed to delete team"),
    });
  };

  const onBanSubmit = (data: any) => {
    if (!banTarget) return;
    banMut.mutate({
      data: { teamId: banTarget.id, reason: data.reason, banType: data.banType || "permanent", expiresAt: data.expiresAt || null }
    }, {
      onSuccess: () => { toast.success(`${banTarget.name} banned`); setBanTarget(null); resetBan(); },
      onError: () => toast.error("Failed to ban team"),
    });
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold">Teams</h1>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Add Team</Button>
      </div>

      <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
            <tr>
              <th className="px-6 py-3 text-left w-8"></th>
              <th className="px-6 py-3 text-left">Team</th>
              <th className="px-6 py-3 text-left">ELO</th>
              <th className="px-6 py-3 text-left">Record</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1,2,3].map(i => (
                <tr key={i}><td colSpan={6} className="px-6 py-4">
                  <div className="h-8 bg-card rounded animate-pulse" />
                </td></tr>
              ))
            ) : teams?.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">No teams yet.</td></tr>
            ) : (
              teams?.map((team) => (
                <>
                  <tr key={team.id} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-4 py-4">
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}>
                        {expandedTeam === team.id
                          ? <ChevronDown className="w-3 h-3" />
                          : <ChevronRight className="w-3 h-3" />}
                      </Button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium">{team.name}</span>
                      <span className="text-muted-foreground ml-2 text-sm">[{team.tag}]</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">{team.teamElo}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="text-green-400">{team.wins}W</span>
                      <span className="text-muted-foreground mx-1">/</span>
                      <span className="text-red-400">{team.losses}L</span>
                    </td>
                    <td className="px-6 py-4">
                      {team.isActive
                        ? <Badge variant="outline" className="text-green-400 border-green-400/30 bg-green-400/10">Active</Badge>
                        : <Badge variant="secondary">Inactive</Badge>}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Manage members"
                        onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}>
                        <Users className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(team)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon"
                        onClick={() => { setBanTarget({ id: team.id, name: team.name }); resetBan(); }}
                        title="Ban team">
                        <Ban className="w-4 h-4 text-destructive" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(team.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                  {expandedTeam === team.id && (
                    <tr key={`members-${team.id}`} className="border-b border-border/20">
                      <td colSpan={6} className="p-0">
                        <TeamMemberPanel teamId={team.id} />
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Team" : "Add Team"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <Input placeholder="Team Name" {...register("name", { required: true })} />
            <Input placeholder="Tag (e.g. TSM)" {...register("tag", { required: true })} />
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Captain</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("captainPlayerId", { required: true })}>
                <option value="">Select captain...</option>
                {players?.map((p) => <option key={p.id} value={p.id}>{p.riotId}</option>)}
              </select>
            </div>
            <Input type="number" placeholder="Starting ELO (default 1000)" {...register("teamElo")} />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" {...register("isActive")} defaultChecked />
              <label htmlFor="isActive" className="text-sm">Active team</label>
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
            <DialogTitle>Ban Team: {banTarget?.name}</DialogTitle>
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
              <label className="text-xs text-muted-foreground mb-1 block">Expires At (optional)</label>
              <Input type="datetime-local" {...registerBan("expiresAt")} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setBanTarget(null)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={banMut.isPending}>Ban Team</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
