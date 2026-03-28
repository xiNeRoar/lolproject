import AdminLayout from "@/components/layout/AdminLayout";
import {
  useListTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useListPlayers,
  useListBans,
  useCreateBan,
  useLiftBan,
  useListTeamMembers,
  useAddTeamMember,
  useUpdateTeamMember,
  useRemoveTeamMember,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus, Edit, Trash2, TrendingUp, ShieldBan, ShieldOff,
  ChevronDown, ChevronUp, Users, UserPlus, UserMinus, Pencil,
} from "lucide-react";
import { useState, Fragment } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ROLES } from "@/lib/lol-utils";

function TeamMembersPanel({ teamId }: { teamId: number }) {
  const { data: members, isLoading } = useListTeamMembers(teamId);
  const { data: allPlayers } = useListPlayers();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<{ memberId: number; role: string } | null>(null);

  const addMut = useAddTeamMember();
  const updateMut = useUpdateTeamMember();
  const removeMut = useRemoveTeamMember();

  const { register: regAdd, handleSubmit: handleAddSubmit, reset: resetAdd } = useForm();
  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit } = useForm();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/members`] });
  };

  const onAdd = (data: any) => {
    addMut.mutate({ id: teamId, data: { playerId: Number(data.playerId), role: data.role || null } }, {
      onSuccess: () => {
        setAddOpen(false);
        resetAdd();
        invalidate();
        toast({ title: "Member added" });
      },
      onError: () => toast({ title: "Failed to add member", variant: "destructive" }),
    });
  };

  const onEditRole = (data: any) => {
    if (!editingMember) return;
    updateMut.mutate({ id: teamId, memberId: editingMember.memberId, data: { role: data.role || null } }, {
      onSuccess: () => {
        setEditingMember(null);
        invalidate();
        toast({ title: "Role updated" });
      },
      onError: () => toast({ title: "Failed to update role", variant: "destructive" }),
    });
  };

  const onRemove = (memberId: number) => {
    if (!confirm("Remove this member from the team?")) return;
    removeMut.mutate({ id: teamId, memberId }, {
      onSuccess: () => {
        invalidate();
        toast({ title: "Member removed" });
      },
      onError: () => toast({ title: "Failed to remove member", variant: "destructive" }),
    });
  };

  const memberPlayerIds = new Set((members || []).map((m: any) => m.playerId));
  const availablePlayers = (allPlayers || []).filter(p => !memberPlayerIds.has(p.id));

  return (
    <div className="px-6 pb-4">
      <Card className="bg-muted/20 border-border/30">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Members
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => { resetAdd(); setAddOpen(true); }}>
            <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-8 bg-muted/40 rounded animate-pulse" />
              ))}
            </div>
          ) : !members || members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No members yet.</p>
          ) : (
            <div className="space-y-1">
              {members.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.playerRiotId || `Player #${m.playerId}`}</span>
                    {m.role && (
                      <Badge variant="outline" className="text-xs">{m.role}</Badge>
                    )}
                    <Badge variant="outline" className={
                      m.status === "active"
                        ? "text-green-400 border-green-400/30 bg-green-400/10 text-xs"
                        : "text-muted-foreground text-xs"
                    }>
                      {m.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      title="Edit role"
                      onClick={() => {
                        setEditingMember({ memberId: m.id, role: m.role || "" });
                        resetEdit({ role: m.role || "" });
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      title="Remove member"
                      onClick={() => onRemove(m.id)}
                      disabled={removeMut.isPending}
                    >
                      <UserMinus className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddSubmit(onAdd)} className="space-y-4 mt-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Player</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...regAdd("playerId", { required: true })}
            >
              <option value="">Select player...</option>
              {availablePlayers.map(p => (
                <option key={p.id} value={p.id}>{p.riotId} ({p.discordUsername})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Role</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...regAdd("role")}
            >
              <option value="">None</option>
              {ROLES.map(r => <option key={r} value={r.toLowerCase()}>{r}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={addMut.isPending}>Add Member</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={!!editingMember} onOpenChange={(open) => { if (!open) setEditingMember(null); }}>
        <DialogHeader>
          <DialogTitle>Edit Member Role</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleEditSubmit(onEditRole)} className="space-y-4 mt-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Role</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...regEdit("role")}
            >
              <option value="">None</option>
              {ROLES.map(r => <option key={r} value={r.toLowerCase()}>{r}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button>
            <Button type="submit" disabled={updateMut.isPending}>Save</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export default function ManageTeams() {
  const { data: teams, isLoading } = useListTeams();
  const { data: players } = useListPlayers();
  const { data: bans, isError: bansError } = useListBans();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banTargetTeam, setBanTargetTeam] = useState<{ id: number; name: string } | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);

  const createMut = useCreateTeam();
  const updateMut = useUpdateTeam();
  const deleteMut = useDeleteTeam();
  const createBanMut = useCreateBan();
  const liftBanMut = useLiftBan();

  const { register, handleSubmit, reset } = useForm();
  const { register: registerBan, handleSubmit: handleBanSubmit, reset: resetBan } = useForm();

  const activeBansByTeamId = new Map<number, { id: number; reason: string; banType: string }>();
  if (bans) {
    for (const ban of bans) {
      if (ban.teamId && ban.isActive) {
        activeBansByTeamId.set(ban.teamId, ban);
      }
    }
  }

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

  const openBanDialog = (team: { id: number; name: string }) => {
    setBanTargetTeam(team);
    resetBan({ reason: "", banType: "temp_ban", expiresAt: "" });
    setBanDialogOpen(true);
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

  const onBanSubmit = (data: any) => {
    if (!banTargetTeam) return;
    createBanMut.mutate({
      data: {
        teamId: banTargetTeam.id,
        reason: data.reason,
        banType: data.banType || null,
        expiresAt: data.expiresAt || null,
      },
    }, {
      onSuccess: () => {
        setBanDialogOpen(false);
        setBanTargetTeam(null);
        queryClient.invalidateQueries({ queryKey: ["/api/bans"] });
        toast({ title: "Team banned", description: `${banTargetTeam.name} has been banned.` });
      },
      onError: () => {
        toast({ title: "Failed to ban team", variant: "destructive" });
      },
    });
  };

  const handleLiftBan = (banId: number, teamName: string) => {
    liftBanMut.mutate({ id: banId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/bans"] });
        toast({ title: "Ban lifted", description: `Ban on ${teamName} has been lifted.` });
      },
      onError: () => {
        toast({ title: "Failed to lift ban", variant: "destructive" });
      },
    });
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
              <th className="px-6 py-3 w-8"></th>
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
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-border/20">
                  <td className="px-6 py-4"><div className="h-4 w-4 bg-muted/40 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-28 bg-muted/40 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-12 bg-muted/40 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-16 bg-muted/40 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-4 w-16 bg-muted/40 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-5 w-14 bg-muted/40 rounded animate-pulse" /></td>
                  <td className="px-6 py-4"><div className="h-8 w-24 bg-muted/40 rounded animate-pulse ml-auto" /></td>
                </tr>
              ))
            ) : teams?.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                  No teams yet. Add one to get started.
                </td>
              </tr>
            ) : (
              teams?.map((team) => {
                const activeBan = activeBansByTeamId.get(team.id);
                const isExpanded = expandedTeamId === team.id;
                return (
                  <Fragment key={team.id}>
                    <tr className="border-b border-border/20 hover:bg-muted/20">
                      <td className="px-6 py-4">
                        <Button
                          variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                        >
                          {isExpanded
                            ? <ChevronUp className="w-4 h-4" />
                            : <ChevronDown className="w-4 h-4" />
                          }
                        </Button>
                      </td>
                      <td className="px-6 py-4 font-medium">
                        <div className="flex items-center gap-2">
                          {team.name}
                          {activeBan && (
                            <Badge className="bg-red-400/10 text-red-400 border-red-400/30">
                              Banned
                            </Badge>
                          )}
                        </div>
                      </td>
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
                        <div className="flex items-center justify-end gap-1">
                          {activeBan ? (
                            <Button
                              variant="ghost" size="icon"
                              title="Lift ban"
                              onClick={() => handleLiftBan(activeBan.id, team.name)}
                              disabled={liftBanMut.isPending}
                            >
                              <ShieldOff className="w-4 h-4 text-yellow-400" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost" size="icon"
                              title="Ban team"
                              onClick={() => openBanDialog({ id: team.id, name: team.name })}
                            >
                              <ShieldBan className="w-4 h-4 text-muted-foreground hover:text-red-400" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => openEdit(team)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(team.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-border/20 bg-muted/10">
                        <td colSpan={7}>
                          <TeamMembersPanel teamId={team.id} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
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

      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogHeader>
          <DialogTitle>Ban Team — {banTargetTeam?.name}</DialogTitle>
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
