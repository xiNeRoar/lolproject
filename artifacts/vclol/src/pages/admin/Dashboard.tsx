import AdminLayout from "@/components/layout/AdminLayout";
import { useGetAdminStats, useGetBotStatus, useGetReplayQueueStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Calendar, ClipboardList, Swords, Video, UserCheck, Trophy,
  Bot, CircleDot, AlertTriangle, Clock
} from "lucide-react";

function BotStatusCard() {
  const { data, isLoading, isError } = useGetBotStatus();

  const online = data?.online ?? false;
  const lastSeen = data?.lastSeen;

  const formatLastSeen = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <Card className="bg-card border border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" /> Bot Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-6 w-20 bg-muted/40 rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted/40 rounded animate-pulse" />
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">Unable to fetch status</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={online
                ? "bg-green-500/20 text-green-400 border-green-500/30"
                : "bg-red-500/20 text-red-400 border-red-500/30"
              }>
                <CircleDot className="w-3 h-3 mr-1" />
                {online ? "Online" : "Offline"}
              </Badge>
            </div>
            {lastSeen && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Last seen: {formatLastSeen(lastSeen)}
              </div>
            )}
            {!online && !lastSeen && (
              <p className="text-xs text-muted-foreground">No heartbeat recorded yet.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RenderQueueCard() {
  const { data, isLoading, isError } = useGetReplayQueueStats();

  const formatAge = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "< 1m";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <Card className="bg-card border border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" /> Render Queue
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="text-center space-y-2">
                <div className="h-8 w-12 mx-auto bg-muted/40 rounded animate-pulse" />
                <div className="h-3 w-16 mx-auto bg-muted/40 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">Unable to fetch queue stats</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold font-display text-yellow-400">{data?.pending ?? 0}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold font-display text-primary">{data?.processing ?? 0}</div>
                <div className="text-xs text-muted-foreground">Processing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold font-display text-red-400">{data?.failedLast24h ?? 0}</div>
                <div className="text-xs text-muted-foreground">Failed (24h)</div>
              </div>
            </div>
            {data?.oldestPendingAge && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Oldest pending: {formatAge(data.oldestPendingAge)}
              </div>
            )}
            {(data?.staleJobsReset ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-yellow-400">
                <AlertTriangle className="w-3 h-3" />
                {data?.staleJobsReset} stale job(s) reset
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useGetAdminStats();

  const statCards = [
    { label: "Teams", value: stats?.teams || 0, icon: Users, color: "text-blue-400" },
    { label: "Registered Players", value: stats?.players || 0, icon: UserCheck, color: "text-green-400" },
    { label: "Total Events", value: stats?.events || 0, icon: Calendar, color: "text-purple-400" },
    { label: "Event Registrations", value: stats?.registrations || 0, icon: ClipboardList, color: "text-primary" },
    { label: "Matches Recorded", value: stats?.matches || 0, icon: Swords, color: "text-yellow-400" },
    { label: "VODs Archived", value: stats?.vods || 0, icon: Video, color: "text-red-400" },
    { label: "Seasons", value: stats?.seasons || 0, icon: Trophy, color: "text-primary" },
  ];

  return (
    <AdminLayout>
      <h1 className="text-3xl font-display font-bold mb-8">System Dashboard</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="bg-card/50 border-border/40">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <BotStatusCard />
        <RenderQueueCard />
      </div>
    </AdminLayout>
  );
}
