import { useEffect, useState, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import PublicLayout from "@/components/layout/PublicLayout";
import { useGetTeam, getGetTeamQueryKey, useAddTeamMember, useUpdateTeamMember, useRemoveTeamMember, useUpdateMatchVisibility } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ChevronLeft, Eye, EyeOff, Users, Settings, ShieldCheck, UserPlus, Trash2,
  Crown, AlertTriangle, Check, X, Loader2
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";
const ROLES = ["Top", "Jungle", "Mid", "Bot", "Support", null] as const;
const VIS_OPTIONS = ["public", "default", "private"] as const;

function visLabel(visibleAfter: string | null | undefined): string {
  if (visibleAfter == null) return "default";
  const d = new Date(visibleAfter);
  if (d.getFullYear() <= 1970) return "public";
  if (d.getFullYear() >= 9000) return "private";
  return "default";
}

function visBadge(v: string) {
  if (v === "public") return "bg-green-500/20 text-green-400 border-green-500/30";
  if (v === "private") return "bg-red-500/20 text-red-400 border-red-500/30";
  return "bg-muted/40 text-muted-foreground border-border/40";
}

function MatchVisibilitySection({ team, teamId }: { team: any; teamId: number }) {
  const queryClient = useQueryClient();
  const matches = team.recentMatches ?? [];
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const updateVis = useUpdateMatchVisibility();

  const toggleSingle = async (matchId: number, newVis: string) => {
    setLoading(matchId);
    try {
      const visibleAfter = newVis === "public" ? new Date(0).toISOString()
        : newVis === "private" ? new Date("9999-01-01").toISOString() : null;
      await updateVis.mutateAsync({ id: matchId, data: { visibleAfter } });
      queryClient.invalidateQueries({ queryKey: getGetTeamQueryKey(teamId) });
      toast.success(`Match visibility set to ${newVis}`);
    } catch {
      toast.error("Failed to update visibility");
    }
    setLoading(null);
  };

  const bulkSetVisibility = async (vis: string) => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      await fetch(`${API_BASE}/api/teams/${teamId}/matches/visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ visibility: vis, matchIds: [...selected] }),
      });
      queryClient.invalidateQueries({ queryKey: getGetTeamQueryKey(teamId) });
      setSelected(new Set());
      toast.success(`${selected.size} match(es) set to ${vis}`);
    } catch {
      toast.error("Failed to bulk update visibility");
    }
    setBulkLoading(false);
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === matches.length) setSelected(new Set());
    else setSelected(new Set(matches.map((m: any) => m.id)));
  };

  return (
    <Card className="bg-card/40 border-border/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" /> Match Visibility
          </CardTitle>
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selected.size} selected</span>
              {VIS_OPTIONS.map(v => (
                <button
                  key={v}
                  onClick={() => bulkSetVisibility(v)}
                  disabled={bulkLoading}
                  className="text-xs px-2.5 py-1 rounded border border-border/40 hover:bg-muted/30 transition-colors capitalize disabled:opacity-50"
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {matches.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg mx-6 mb-6 py-12 text-center">
            <EyeOff className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-xl font-medium mb-2">No matches yet</p>
            <p className="text-muted-foreground text-sm">Matches will appear here after scrims are recorded.</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-2 border-b border-border/30 flex items-center gap-3">
              <input type="checkbox" checked={selected.size === matches.length && matches.length > 0} onChange={toggleAll} className="accent-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Select all</span>
            </div>
            <div className="divide-y divide-border/30">
              {matches.map((m: any) => {
                const isA = m.teamAId === teamId;
                const oppName = isA ? m.sideBName : m.sideAName;
                const won = m.winnerName === (isA ? m.sideAName : m.sideBName);
                const vis = visLabel(m.visibleAfter);
                const isLoading = loading === m.id;
                return (
                  <div key={m.id} className="px-6 py-3 flex items-center gap-3">
                    <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleSelect(m.id)} className="accent-primary" />
                    <span className={`w-7 h-7 rounded shrink-0 flex items-center justify-center text-xs font-bold ${won ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {won ? "W" : "L"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">vs {oppName}</div>
                      <div className="text-xs text-muted-foreground">{m.matchTitle}</div>
                    </div>
                    <Badge className={`text-xs capitalize ${visBadge(vis)}`}>{vis}</Badge>
                    <div className="flex items-center gap-1">
                      {VIS_OPTIONS.filter(v => v !== vis).map(v => (
                        <button
                          key={v}
                          onClick={() => toggleSingle(m.id, v)}
                          disabled={isLoading}
                          className="text-[11px] px-2 py-0.5 rounded border border-border/30 hover:bg-muted/30 transition-colors capitalize disabled:opacity-50"
                        >
                          {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : v}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RosterSection({ team, teamId }: { team: any; teamId: number }) {
  const queryClient = useQueryClient();
  const addMember = useAddTeamMember();
  const updateMember = useUpdateTeamMember();
  const removeMember = useRemoveTeamMember();
  const [riotId, setRiotId] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);

  const members = (team.members ?? []).filter((m: any) => m.status === "active");

  const handleAdd = async () => {
    const trimmed = riotId.trim();
    if (!trimmed) return;
    setAddLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/players?search=${encodeURIComponent(trimmed)}`);
      const players = await res.json();
      const player = players.find((p: any) => p.riotId?.toLowerCase() === trimmed.toLowerCase());
      if (!player) {
        toast.error("Player not found. They must be registered first.");
        setAddLoading(false);
        return;
      }
      await addMember.mutateAsync({ id: teamId, data: { playerId: player.id } });
      queryClient.invalidateQueries({ queryKey: getGetTeamQueryKey(teamId) });
      setRiotId("");
      toast.success(`Added ${player.riotId} to the team`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add member");
    }
    setAddLoading(false);
  };

  const handleRemove = async (memberId: number) => {
    try {
      await removeMember.mutateAsync({ id: teamId, memberId });
      queryClient.invalidateQueries({ queryKey: getGetTeamQueryKey(teamId) });
      setConfirmRemove(null);
      toast.success("Member removed");
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const handleRoleChange = async (memberId: number, role: string | null) => {
    try {
      await updateMember.mutateAsync({ id: teamId, memberId, data: { role } });
      queryClient.invalidateQueries({ queryKey: getGetTeamQueryKey(teamId) });
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    }
  };

  return (
    <Card className="bg-card/40 border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Roster
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-6 py-3 border-b border-border/30">
          <div className="flex gap-2">
            <input
              value={riotId}
              onChange={e => setRiotId(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="Add by Riot ID (e.g. Player#NA1)"
              className="flex-1 px-3 py-2 rounded-md bg-muted/30 border border-border/40 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={handleAdd}
              disabled={addLoading || !riotId.trim()}
              className="px-4 py-2 rounded-md bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors border border-primary/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              {addLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              Add
            </button>
          </div>
        </div>

        {members.length === 0 ? (
          <div className="px-6 py-8 text-center text-muted-foreground text-sm">No active members.</div>
        ) : (
          <div className="divide-y divide-border/30">
            {members.map((m: any) => {
              const isCaptain = m.playerId === team.captainPlayerId;
              const linked = !!m.playerRiotId;
              return (
                <div key={m.id} className="px-6 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {linked ? (
                        <Link href={`/players/${encodeURIComponent(m.playerRiotId)}`} className="text-sm font-medium hover:text-primary transition-colors">
                          {m.playerRiotId}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">Player #{m.playerId} <span className="text-yellow-400 text-xs">(pending)</span></span>
                      )}
                      {linked ? (
                        <span className="text-green-400 text-xs flex items-center gap-0.5"><Check className="w-3 h-3" /> linked</span>
                      ) : (
                        <span className="text-yellow-400 text-xs flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" /> pending</span>
                      )}
                    </div>
                    {m.playerDiscordUsername && (
                      <div className="text-xs text-muted-foreground">{m.playerDiscordUsername}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isCaptain && (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs flex items-center gap-1">
                        <Crown className="w-3 h-3" /> Captain
                      </Badge>
                    )}
                    <select
                      value={m.role || ""}
                      onChange={e => handleRoleChange(m.id, e.target.value || null)}
                      className="text-xs px-2 py-1 rounded border border-border/40 bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">No role</option>
                      {ROLES.filter(Boolean).map(r => (
                        <option key={r!} value={r!}>{r}</option>
                      ))}
                    </select>
                    {!isCaptain && (
                      confirmRemove === m.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleRemove(m.id)} className="text-red-400 hover:text-red-300 p-1"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setConfirmRemove(null)} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmRemove(m.id)} className="text-muted-foreground hover:text-red-400 p-1 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TeamSettingsSection({ team, teamId }: { team: any; teamId: number }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(team.name);
  const [tag, setTag] = useState(team.tag);
  const [defaultVis, setDefaultVis] = useState(team.defaultMatchVisibility || "participants");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/teams/${teamId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), tag: tag.trim(), defaultMatchVisibility: defaultVis }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      queryClient.invalidateQueries({ queryKey: getGetTeamQueryKey(teamId) });
      toast.success("Team settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    }
    setSaving(false);
  };

  return (
    <Card className="bg-card/40 border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" /> Team Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Team Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-muted/30 border border-border/40 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Tag (2-5 chars)</label>
          <input
            value={tag}
            onChange={e => setTag(e.target.value.toUpperCase())}
            maxLength={5}
            className="w-full px-3 py-2 rounded-md bg-muted/30 border border-border/40 text-sm uppercase focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Default Match Visibility</label>
          <select
            value={defaultVis}
            onChange={e => setDefaultVis(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-muted/30 border border-border/40 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="public">Public</option>
            <option value="participants">Participants Only</option>
            <option value="private">Private</option>
          </select>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Changes
        </button>
      </CardContent>
    </Card>
  );
}

function TransferCaptainSection({ team, teamId }: { team: any; teamId: number }) {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const members = (team.members ?? []).filter((m: any) => m.status === "active" && m.playerId !== team.captainPlayerId);
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTransfer = async () => {
    if (!selectedPlayer) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/teams/${teamId}/transfer-captain`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newCaptainPlayerId: selectedPlayer }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to transfer");
      }
      queryClient.invalidateQueries({ queryKey: getGetTeamQueryKey(teamId) });
      toast.success("Captain transferred successfully");
      navigate(`/teams/${teamId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to transfer captain");
    }
    setLoading(false);
    setConfirming(false);
  };

  if (members.length === 0) {
    return (
      <Card className="bg-card/40 border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Transfer Captain
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No other active members to transfer captain to.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/40 border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" /> Transfer Captain
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Transfer team leadership to another active member. You will lose captain privileges.</p>
        <select
          value={selectedPlayer ?? ""}
          onChange={e => { setSelectedPlayer(Number(e.target.value) || null); setConfirming(false); }}
          className="w-full px-3 py-2 rounded-md bg-muted/30 border border-border/40 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Select a member...</option>
          {members.map((m: any) => (
            <option key={m.playerId} value={m.playerId}>
              {m.playerRiotId || `Player #${m.playerId}`}
            </option>
          ))}
        </select>

        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            disabled={!selectedPlayer}
            className="px-6 py-2 rounded-md bg-red-500/10 text-red-400 border border-red-500/30 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            Transfer Captain
          </button>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400">Are you sure?</p>
              <p className="text-xs text-muted-foreground">This action cannot be undone from the website.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleTransfer}
                disabled={loading}
                className="px-4 py-1.5 rounded bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm
              </button>
              <button onClick={() => setConfirming(false)} className="px-4 py-1.5 rounded border border-border/40 text-sm hover:bg-muted/30 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CaptainHub() {
  const { id } = useParams<{ id: string }>();
  const teamId = Number(id);
  const [, navigate] = useLocation();
  const { playerIdNum, isLoggedIn } = useAuth();
  const { data: team, isLoading, isError } = useGetTeam(teamId);

  const isCaptain = team && playerIdNum > 0 && team.captainPlayerId === playerIdNum;

  useEffect(() => {
    if (!isLoading && team && !isCaptain) {
      navigate(`/teams/${teamId}`);
    }
  }, [isLoading, team, isCaptain, navigate, teamId]);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 animate-pulse space-y-4">
          <div className="h-10 w-48 bg-card rounded" />
          <div className="h-48 bg-card rounded-xl" />
          <div className="h-48 bg-card rounded-xl" />
          <div className="h-40 bg-card rounded-xl" />
          <div className="h-32 bg-card rounded-xl" />
        </div>
      </PublicLayout>
    );
  }

  if (isError || !team) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
          <p className="text-muted-foreground">Team not found.</p>
          <button onClick={() => window.history.back()} className="text-primary hover:underline text-sm mt-2 inline-block">← Back</button>
        </div>
      </PublicLayout>
    );
  }

  if (!isCaptain) return null;

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-16 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(`/teams/${teamId}`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Team
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold">Manage {team.name}</h1>
            <p className="text-sm text-muted-foreground">[{team.tag}] · Captain Hub</p>
          </div>
        </div>

        <div className="space-y-6">
          <MatchVisibilitySection team={team} teamId={teamId} />
          <RosterSection team={team} teamId={teamId} />
          <TeamSettingsSection team={team} teamId={teamId} />
          <TransferCaptainSection team={team} teamId={teamId} />
        </div>
      </div>
    </PublicLayout>
  );
}
