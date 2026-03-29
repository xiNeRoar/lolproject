import PublicLayout from "@/components/layout/PublicLayout";
import { useGetPlayerById, useGetPlayerBadges, useListSeasons, useUpdatePlayerProfile, useListNotifications, useMarkNotificationRead, getGetAuthMeQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { BADGE_META } from "@/lib/lol-utils";
import { Users, Award, Bell, Settings, AlertTriangle, Swords, Crown, ArrowRight, CheckCircle2, Circle, Eye, EyeOff, ShieldCheck } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

function LoggedOutState() {
  return (
    <div className="max-w-sm mx-auto px-4 pt-24 pb-16">
      <Card className="border-border/40 bg-card/60 text-center">
        <CardContent className="pt-8 pb-8">
          <h2 className="text-xl font-display font-bold mb-3">You must be logged in to view your dashboard.</h2>
          <Link href="/login">
            <Button className="mt-2" style={{ backgroundColor: "#5865F2" }}>Login with Discord →</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardContent({ pid }: { pid: number }) {
  const { data: player } = useGetPlayerById(pid);
  const { data: badges } = useGetPlayerBadges(pid);
  const { data: seasons } = useListSeasons();
  const { data: notifications, isError: notifError } = useListNotifications({ query: { retry: false } });
  const markRead = useMarkNotificationRead();
  const updatePlayer = useUpdatePlayerProfile();
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("rso") === "success") {
      toast.success("Riot account verified", {
        description: "Your identity is now confirmed. Welcome to VCLoL.",
      });
      window.history.replaceState({}, "", "/dashboard");
      queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() });
    }
  }, [queryClient]);

  const [notifPref, setNotifPref] = useState<string | null>(null);
  const [privacyPref, setPrivacyPref] = useState<string | null>(null);

  const activeSeason = seasons?.find((s) => s.status === "active");

  const devMockNotifications = import.meta.env.DEV && notifError ? [
    { id: -1, type: "match_result", title: "Match Result: Team Alpha vs Team Beta", message: "Your team won 2-1 in the Semi Final!", isRead: false, createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), entityId: 38 },
    { id: -2, type: "event_registration_confirmed", title: "Event Registration Confirmed", message: "You have been registered for VCLoL 5v5 Spring Open.", isRead: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), entityId: null },
    { id: -3, type: "badge_earned", title: "New Badge Earned!", message: "You earned the \"First Blood\" badge for your first match.", isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), entityId: null },
  ] : null;

  const displayNotifications = notifications ?? devMockNotifications ?? [];
  const unreadCount = displayNotifications.filter((n) => !n.isRead).length;

  function notifIcon(type: string) {
    if (type === "match_result") return { icon: "⚔️", color: "text-primary" };
    if (type === "season_completed") return { icon: "🏆", color: "text-yellow-400" };
    if (type === "badge_earned") return { icon: "🎖", color: "text-yellow-400" };
    if (type === "event_registration_confirmed") return { icon: "✓", color: "text-green-400" };
    if (type === "event_registration_declined") return { icon: "✕", color: "text-red-400" };
    return { icon: "🔔", color: "text-muted-foreground" };
  }

  function notifHref(n: { type: string; entityId?: number | null }): string | null {
    if (n.type === "match_result") {
      if (n.entityId) return `/matches/${n.entityId}`;
      const team = player.teams?.[0];
      return team ? `/teams/${team.teamId}` : `/players/${encodeURIComponent(player.riotId)}`;
    }
    if (n.type === "season_completed") return "/teams";
    if (n.type === "badge_earned") return `/players/${encodeURIComponent(player.riotId)}`;
    return null;
  }

  const handleSaveNotif = () => {
    if (!notifPref) return;
    updatePlayer.mutate(
      { id: pid, data: { notificationPreference: notifPref } },
      {
        onSuccess: () => toast.success("Notification preference saved"),
        onError: () => toast.error("Failed to save notification preference"),
      }
    );
  };

  const handleSavePrivacy = () => {
    if (!privacyPref) return;
    updatePlayer.mutate(
      { id: pid, data: { profileVisibility: privacyPref } },
      {
        onSuccess: () => {
          toast.success(`Profile set to ${privacyPref}`);
          queryClient.invalidateQueries({ queryKey: ["/api/players"] });
        },
        onError: () => {
          toast.error("Failed to update privacy setting");
        },
      }
    );
  };

  if (!player) return <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 animate-pulse"><div className="h-48 bg-card rounded-xl" /></div>;

  const currentNotifPref = notifPref ?? player.notificationPreference ?? "web";
  const currentPrivacy = privacyPref ?? player.profileVisibility ?? "public";

  return (
    <div className="max-w-4xl mx-auto px-4 pt-12 pb-16 sm:px-6 space-y-6">
      <h1 className="text-2xl font-display font-bold">My Dashboard</h1>

      {(player.riotId.startsWith("pending") || !player.puuid) && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-400/30 bg-yellow-400/5 px-4 py-3 flex-wrap">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-400">Riot Account not verified</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verify your Riot identity to unlock champion stats, match history, and your public profile.
            </p>
          </div>
          <a href={`${API_BASE}/api/auth/rso`} className="flex-shrink-0 self-center w-full sm:w-auto">
            <Button size="sm" className="gap-1.5 w-full sm:w-auto">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verify with Riot
            </Button>
          </a>
        </div>
      )}

      <Card className="border-border/40 bg-card/60">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl font-display font-bold">{player.riotId}</span>
              </div>
              <p className="text-sm text-muted-foreground">{player.discordUsername}</p>
              {player.primaryRole && (
                <p className="text-xs text-muted-foreground mt-1">
                  Role: <span className="text-foreground">{player.primaryRole}</span>
                  {player.secondaryRole && <span> / {player.secondaryRole}</span>}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <Link href={`/players/${encodeURIComponent(player.riotId)}`}>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5">
                    View Public Profile
                  </Button>
                </Link>
              </div>
            </div>
            <div className="text-right text-sm space-y-1">
              {activeSeason && <div className="text-muted-foreground">{activeSeason.name}</div>}
            </div>
          </div>
          {player.aggregateStats && (() => {
            const s = player.aggregateStats;
            const totalGames = (s.wins ?? 0) + (s.losses ?? 0);
            const winRate = totalGames > 0 ? Math.round(((s.wins ?? 0) / totalGames) * 100) : 0;
            const avgKda = s.averageKda != null ? Number(s.averageKda).toFixed(1) : null;
            return (
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/30">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-0.5">Record</div>
                  <div className="text-sm font-medium">
                    <span className="text-green-400">{s.wins ?? 0}W</span>
                    {" / "}
                    <span className="text-red-400">{s.losses ?? 0}L</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-0.5">Win Rate</div>
                  <div className="text-sm font-display font-bold">{winRate}%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-0.5">Avg KDA</div>
                  <div className="text-sm font-display font-bold">{avgKda ?? "—"}</div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {player.teams?.some((t) => t.isCaptain) && (
        <div className="flex flex-col gap-2">
          {player.teams.filter((t) => t.isCaptain).map((t) => (
            <Link key={t.teamId} href={`/teams/${t.teamId}/manage`} className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 hover:bg-primary/10 transition-colors group">
              <div className="flex items-center gap-2 text-sm">
                <Crown className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">You captain:</span>
                <span className="font-medium">{t.teamName}</span>
                <span className="text-xs text-muted-foreground">[{t.teamTag}]</span>
              </div>
              <span className="flex items-center gap-1 text-sm font-medium text-primary group-hover:translate-x-0.5 transition-transform">
                Manage Team <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          ))}
        </div>
      )}

      {(() => {
        const captainTeams = player.teams?.filter((t) => t.isCaptain) ?? [];
        if (captainTeams.length === 0) return null;

        const team = captainTeams[0];
        const hasRoster = (team.memberCount ?? 0) >= 5;
        const hasMatches = (player.recentMatches?.length ?? 0) > 0;
        const hasLinkedRiot = !player.riotId.startsWith("pending") && !!player.puuid;

        const steps = [
          { done: hasLinkedRiot, label: "Verify your Riot identity", cmd: "/connect" },
          { done: hasMatches, label: "Submit your first scrim", cmd: "/submit" },
          { done: hasRoster, label: "Build your roster through match replays", cmd: null },
        ];

        const allDone = steps.every((s) => s.done);
        if (allDone) return null;

        return (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Crown className="w-4 h-4 text-primary" /> Getting Started</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {step.done ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                    <span className={`text-sm ${step.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {step.label}
                    </span>
                    {!step.done && (
                      <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs ml-auto shrink-0">{step.cmd}</code>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Swords className="w-4 h-4 text-primary" /> Recent Matches</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!player.recentMatches?.length ? (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              No matches yet. Submit your first scrim via <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">/submit</code> in Discord.
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {player.recentMatches.slice(0, 5).map((match) => {
                const playerTeamOnA = player.teams?.some((t) => t.teamId === match.teamAId);
                const playerTeamOnB = player.teams?.some((t) => t.teamId === match.teamBId);
                const playerSide = playerTeamOnA ? match.sideAName : playerTeamOnB ? match.sideBName : null;
                const won = playerSide ? match.winnerName === playerSide : false;
                const date = new Date(match.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
                return (
                  <Link key={match.id} href={`/matches/${match.id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/20 transition-colors">
                    <span className={`w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-xs font-bold ${won ? "bg-green-400/20 text-green-400" : "bg-red-400/20 text-red-400"}`}>
                      {won ? "W" : "L"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{match.sideAName} vs {match.sideBName}</div>
                      <div className="text-xs text-muted-foreground">{match.matchTitle}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-display font-bold">{match.score || "-"}</div>
                      <div className="text-xs text-muted-foreground">{date}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> My Teams</CardTitle>
        </CardHeader>
        <CardContent>
          {player.teams && player.teams.length > 0 ? (
            <div className="space-y-2">
              {player.teams.map((t) => (
                <Link key={t.teamId} href={`/teams/${t.teamId}`} className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:border-primary/40 transition-colors">
                  <div>
                    <span className="text-sm font-medium">{t.teamName}</span>
                    <span className="text-xs text-muted-foreground ml-2">[{t.teamTag}]</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.role && <Badge variant="outline" className="text-xs">{t.role}</Badge>}
                    <Badge variant={t.status === "active" ? "default" : "secondary"} className="text-xs capitalize">{t.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Teams are managed through Discord. Use <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">/register-team</code> to
              create a team. Players are automatically added from submitted match replays.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Award className="w-4 h-4 text-primary" /> Badges</CardTitle>
        </CardHeader>
        <CardContent>
          {!badges?.length ? (
            <p className="text-sm text-muted-foreground">No badges earned yet. Keep competing!</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => {
                const meta = BADGE_META[b.badgeType] ?? { emoji: "🎖️", label: b.badgeType };
                return (
                  <span key={b.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border/40 text-sm">
                    <span>{meta.emoji}</span>
                    <span className="font-medium">{meta.label}</span>
                  </span>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-primary" /> Notifications</CardTitle>
            {unreadCount > 0 && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{unreadCount}</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {displayNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <div className="space-y-1">
              {displayNotifications.slice(0, 10).map((n) => {
                const { icon, color } = notifIcon(n.type);
                const href = notifHref(n);
                const timeAgo = (() => {
                  const diff = Date.now() - new Date(n.createdAt).getTime();
                  const mins = Math.floor(diff / 60000);
                  if (mins < 60) return `${mins}m ago`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs}h ago`;
                  return `${Math.floor(hrs / 24)}d ago`;
                })();
                const inner = (
                  <>
                    <span className={`text-base leading-5 flex-shrink-0 ${color}`}>{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{n.title}</div>
                      <div className="text-muted-foreground text-xs">{n.message}</div>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">{timeAgo}</span>
                  </>
                );
                const cls = `flex items-start gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${n.isRead ? "opacity-60" : "bg-muted/40 cursor-pointer hover:bg-muted/60"}`;
                const handleClick = () => {
                  if (!n.isRead) {
                    markRead.mutate({ id: n.id }, {
                      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
                    });
                  }
                };
                return href ? (
                  <Link key={n.id} href={href} className={cls} onClick={handleClick}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id} className={cls} onClick={handleClick}>
                    {inner}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Settings className="w-4 h-4 text-primary" /> Notification Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "web", label: "Web only" },
              { value: "email", label: "Email" },
              { value: "discord", label: "Discord DM" },
              { value: "both", label: "Email + Discord" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded border border-border/40 hover:border-primary/40">
                <input
                  type="radio"
                  name="notifPref"
                  value={opt.value}
                  checked={currentNotifPref === opt.value}
                  onChange={() => setNotifPref(opt.value)}
                  className="accent-primary"
                />
                {opt.label}
              </label>
            ))}
          </div>
          <Button size="sm" onClick={handleSaveNotif} disabled={updatePlayer.isPending}>
            {updatePlayer.isPending ? "Saving..." : "Save"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            {currentPrivacy === "private" ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-primary" />}
            Profile Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {currentPrivacy === "private"
              ? "Your profile is private. Only your Riot ID and team affiliations are visible to others."
              : currentPrivacy === "participants-only"
              ? "Your profile is visible only to players who have been in a match with you."
              : "Your profile is public. Anyone can see your stats, champion pool, and match history."}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "public", label: "Public", desc: "Full profile visible" },
              { value: "participants-only", label: "Participants", desc: "Match participants only" },
              { value: "private", label: "Private", desc: "Stats hidden" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded border border-border/40 hover:border-primary/40">
                <input
                  type="radio"
                  name="privacyPref"
                  value={opt.value}
                  checked={currentPrivacy === opt.value}
                  onChange={() => setPrivacyPref(opt.value)}
                  className="accent-primary"
                />
                <div>
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
          <Button size="sm" onClick={handleSavePrivacy} disabled={updatePlayer.isPending}>
            {updatePlayer.isPending ? "Saving..." : "Save"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PlayerDashboard() {
  const { playerId } = useAuth();

  if (!playerId) {
    return (
      <PublicLayout>
        <LoggedOutState />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <DashboardContent pid={Number(playerId)} />
    </PublicLayout>
  );
}
