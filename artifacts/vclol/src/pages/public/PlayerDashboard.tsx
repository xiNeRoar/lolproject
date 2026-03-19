import PublicLayout from "@/components/layout/PublicLayout";
import { useGetPlayerById, useGetPlayerBadges, useListSeasons, useUpdatePlayerProfile, useListNotifications, useMarkNotificationRead } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { BADGE_META } from "@/lib/lol-utils";

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
  const { data: notifications } = useListNotifications();
  const markRead = useMarkNotificationRead();
  const updatePlayer = useUpdatePlayerProfile();
  const queryClient = useQueryClient();

  const [notifPref, setNotifPref] = useState<string | null>(null);

  const activeSeason = seasons?.find((s) => s.status === "active");

  const unreadCount = (notifications ?? []).filter((n) => !n.isRead).length;

  function notifIcon(type: string) {
    if (type === "match_result") return { icon: "🏆", color: "text-yellow-400" };
    if (type === "season_completed") return { icon: "🏆", color: "text-yellow-400" };
    if (type === "badge_earned") return { icon: "🎖", color: "text-yellow-400" };
    if (type === "event_registration_confirmed") return { icon: "✓", color: "text-green-400" };
    if (type === "event_registration_declined") return { icon: "✕", color: "text-red-400" };
    return { icon: "🔔", color: "text-muted-foreground" };
  }

  const handleSaveNotif = () => {
    if (!notifPref) return;
    updatePlayer.mutate(
      { id: pid, data: { notificationPreference: notifPref } },
      { onSuccess: () => toast.success("Notification preference saved") }
    );
  };

  if (!player) return <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 animate-pulse"><div className="h-48 bg-card rounded-xl" /></div>;

  const currentNotifPref = notifPref ?? player.notificationPreference ?? "web";

  return (
    <div className="max-w-4xl mx-auto px-4 pt-12 pb-16 sm:px-6 space-y-6">
      <h1 className="text-2xl font-display font-bold">My Dashboard</h1>

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
            </div>
            <div className="text-right text-sm space-y-1">
              {activeSeason && <div className="text-muted-foreground">{activeSeason.name}</div>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">My Teams</CardTitle>
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
              create a team, or ask a captain to add you with <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">/add @you</code>.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Badges</CardTitle>
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
            <CardTitle className="text-base">Notifications</CardTitle>
            {unreadCount > 0 && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{unreadCount}</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!notifications || notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <div className="space-y-1">
              {notifications.slice(0, 10).map((n) => {
                const { icon, color } = notifIcon(n.type);
                const timeAgo = (() => {
                  const diff = Date.now() - new Date(n.createdAt).getTime();
                  const mins = Math.floor(diff / 60000);
                  if (mins < 60) return `${mins}m ago`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs}h ago`;
                  return `${Math.floor(hrs / 24)}d ago`;
                })();
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${n.isRead ? "opacity-60" : "bg-muted/40 cursor-pointer hover:bg-muted/60"}`}
                    onClick={() => {
                      if (!n.isRead) {
                        markRead.mutate({ id: n.id }, {
                          onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
                        });
                      }
                    }}
                  >
                    <span className={`text-base leading-5 flex-shrink-0 ${color}`}>{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{n.title}</div>
                      <div className="text-muted-foreground text-xs">{n.message}</div>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">{timeAgo}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notification Settings</CardTitle>
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
