import PublicLayout from "@/components/layout/PublicLayout";
import { useGetPlayer, useGetEloHistory, useGetPlayerBadges, useGetChallengesForPlayer, useListSeasons, useAcceptChallenge, useDeclineChallenge, useUpdatePlayer, useGetLadderSettings, useSetChallengeGameReady } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function eloBadgeColor(elo: number) {
  if (elo >= 1400) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  if (elo >= 1200) return "bg-purple-500/20 text-purple-400 border-purple-500/30";
  if (elo >= 1100) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  return "bg-muted text-muted-foreground";
}

function rankLabel(elo: number) {
  if (elo >= 1400) return "Gold";
  if (elo >= 1200) return "Silver";
  if (elo >= 1100) return "Bronze";
  return "Unranked";
}

const BADGE_META: Record<string, { emoji: string; label: string }> = {
  season_champion: { emoji: "🏆", label: "Season Champion" },
  first_blood: { emoji: "⚡", label: "First Blood" },
  win_streak: { emoji: "🔥", label: "Win Streak" },
  veteran: { emoji: "💪", label: "Veteran" },
  climber: { emoji: "📈", label: "Climber" },
};

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

function RoflUploadButton({ matchId, matchDate }: { matchId: number; matchDate: string }) {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Estimate patch expiry: ~14 days from match date
  const expiryDate = new Date(new Date(matchDate).getTime() + 14 * 24 * 60 * 60 * 1000);
  const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  const expired = daysLeft <= 0;

  if (expired) {
    return <span className="text-xs text-muted-foreground/50 italic">Replay expired</span>;
  }

  if (done) {
    return <span className="text-xs text-green-400">✓ Uploaded</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={fileRef}
        type="file"
        accept=".rofl"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true);
          try {
            const formData = new FormData();
            formData.append("rofl", file);
            formData.append("matchId", String(matchId));
            const res = await fetch("/api/replays", { method: "POST", body: formData });
            if (res.ok) setDone(true);
          } finally {
            setUploading(false);
          }
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="text-xs text-primary hover:underline disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload .rofl"}
      </button>
      {daysLeft <= 3 && (
        <span className="text-xs text-yellow-400">({daysLeft}d left)</span>
      )}
    </div>
  );
}

function GameIdSubmit({ challengeId }: { challengeId: number }) {
  const [gameId, setGameId] = useState("");
  const setGameReady = useSetChallengeGameReady();
  const queryClient = useQueryClient();

  return (
    <div className="flex gap-2 mt-2">
      <input
        type="text"
        placeholder="Enter Game ID"
        value={gameId}
        onChange={(e) => setGameId(e.target.value)}
        className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <Button
        size="sm"
        className="h-8 text-xs shrink-0"
        disabled={!gameId.trim() || setGameReady.isPending}
        onClick={() =>
          setGameReady.mutate(
            { id: challengeId, data: { gameId: gameId.trim() } },
            {
              onSuccess: () => {
                setGameId("");
                queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
              },
            }
          )
        }
      >
        {setGameReady.isPending ? "..." : "Submit"}
      </Button>
    </div>
  );
}

function DashboardContent({ pid }: { pid: number }) {
  const { data: player } = useGetPlayer(String(pid));
  const { data: eloHistory } = useGetEloHistory(pid);
  const { data: badges } = useGetPlayerBadges(pid);
  const { data: challenges } = useGetChallengesForPlayer(pid);
  const { data: seasons } = useListSeasons();
  const { data: ladderSettings } = useGetLadderSettings();
  const acceptChallenge = useAcceptChallenge();
  const declineChallenge = useDeclineChallenge();
  const updatePlayer = useUpdatePlayer();

  const [notifPref, setNotifPref] = useState<string | null>(null);

  const activeSeason = seasons?.find((s) => s.status === "active");
  const totalMatches = (player?.wins ?? 0) + (player?.losses ?? 0);
  const winRate = totalMatches > 0 ? Math.round(((player?.wins ?? 0) / totalMatches) * 100) : 0;

  const pendingChallenges = (challenges ?? []).filter((c) => c.status === "pending" && c.challengedId === pid);
  const upcomingMatches = (challenges ?? []).filter((c) => c.status === "accepted");

  const eloChartData = (eloHistory ?? []).map((e) => ({
    date: new Date(e.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
    elo: e.elo,
  }));

  const handleSaveNotif = () => {
    if (!notifPref) return;
    updatePlayer.mutate(
      { id: pid, data: { notificationPreference: notifPref } as Parameters<typeof updatePlayer.mutate>[0]["data"] },
      { onSuccess: () => toast.success("Notification preference saved") }
    );
  };

  if (!player) return <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 animate-pulse"><div className="h-48 bg-card rounded-xl" /></div>;

  const currentNotifPref = notifPref ?? player.notificationPreference ?? "web";

  return (
    <div className="max-w-4xl mx-auto px-4 pt-12 pb-16 sm:px-6 space-y-6">
      <h1 className="text-2xl font-display font-bold">My Dashboard</h1>

      {/* ELO Card */}
      <Card className="border-border/40 bg-card/60">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-5xl font-display font-bold">{player.currentElo}</span>
                <span className={`text-sm px-2.5 py-1 rounded-full border font-semibold ${eloBadgeColor(player.currentElo)}`}>
                  {rankLabel(player.currentElo)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Peak ELO: <span className="text-foreground font-medium">{player.peakElo}</span></p>
            </div>
            <div className="text-right text-sm space-y-1">
              <div><span className="text-green-400 font-bold">{player.wins}W</span> · <span className="text-red-400 font-bold">{player.losses}L</span> · <span className="text-muted-foreground">{winRate}% WR</span></div>
              {activeSeason && <div className="text-muted-foreground">{activeSeason.name}</div>}
            </div>
          </div>

          {/* Season Progress */}
          <div className="mt-4">
            {(() => {
              const minRequired = ladderSettings?.minMatchesForDisplay ?? 4;
              const pct = Math.min((totalMatches / minRequired) * 100, 100);
              return (
                <>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Matches played</span>
                    <span>{totalMatches} / {minRequired} required for ladder</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  {totalMatches >= minRequired && (
                    <p className="text-xs text-primary mt-1">You appear on the public ladder!</p>
                  )}
                </>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Pending + Upcoming */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-border/40 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pending Challenges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingChallenges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending challenges</p>
            ) : (
              pendingChallenges.map((c) => (
                <div key={c.id} className="p-3 rounded-lg bg-background/50 border border-border/30">
                  <p className="text-sm font-medium">{c.challengerRiotId ?? `Player #${c.challengerId}`}</p>
                  {c.scheduledTime && <p className="text-xs text-muted-foreground">{new Date(c.scheduledTime).toLocaleString()}</p>}
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => acceptChallenge.mutate({ id: c.id })}>Accept</Button>
                    {/* TODO: when backend returns 403 on decline (quota reached), hide this button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        declineChallenge.mutate(
                          { id: c.id },
                          {
                            onError: (err: any) => {
                              if (err?.status === 403) {
                                toast.error("Decline limit reached — this challenge has been auto-accepted.");
                              }
                            },
                          }
                        )
                      }
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upcoming Matches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming matches</p>
            ) : (
              upcomingMatches.map((c) => {
                const isHost = c.challengerId === pid;
                return (
                  <div key={c.id} className="p-3 rounded-lg bg-background/50 border border-border/30 space-y-1">
                    <p className="text-sm font-medium">
                      vs {c.challengerId === pid ? c.challengedRiotId : c.challengerRiotId ?? "Opponent"}
                    </p>
                    {c.scheduledTime && (
                      <p className="text-xs text-muted-foreground">{new Date(c.scheduledTime).toLocaleString()}</p>
                    )}
                    {c.gameId ? (
                      <p className="text-xs text-green-400">✓ Room ready — Game ID: {c.gameId}</p>
                    ) : isHost ? (
                      <div>
                        <p className="text-xs text-yellow-400">
                          You are the room host. Open a custom game, invite your opponent by their Riot ID, then submit the Game ID below.
                        </p>
                        <GameIdSubmit challengeId={c.id} />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Waiting for room host to open the game and submit Game ID...</p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* ELO History Graph */}
      {eloChartData.length >= 2 && (
        <Card className="border-border/40 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">ELO History</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={eloChartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748b" domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
                <Line type="monotone" dataKey="elo" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Results */}
      {(player.recentMatches ?? []).length > 0 && (
        <Card className="border-border/40 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(player.recentMatches ?? []).slice(0, 5).map((m) => {
              const isA = m.playerAId === pid;
              const won = m.winnerName === (isA ? m.sideAName : m.sideBName);
              const delta = (m.playerAId === pid ? (m.playerAEloAfter ?? 0) - (m.playerAEloBefore ?? 0) : (m.playerBEloAfter ?? 0) - (m.playerBEloBefore ?? 0));
              return (
                <Link key={m.id} href={`/matches/${m.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30 hover:border-primary/40 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${won ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{won ? "W" : "L"}</span>
                      <span className="text-sm">vs {m.sideAName === player.riotId ? m.sideBName : m.sideAName}</span>
                      {m.score && <span className="text-xs text-muted-foreground">{m.score}</span>}
                    </div>
                    {delta !== 0 && (
                      <span className={`text-xs font-semibold ${delta > 0 ? "text-green-400" : "text-red-400"}`}>
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    )}
                    <RoflUploadButton matchId={m.id} matchDate={m.createdAt} />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Badges */}
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

      {/* Notification Settings */}
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
  const [playerId, setPlayerId] = useState<string | null>(() =>
    localStorage.getItem("vclol_player_id")
  );

  useEffect(() => {
    const onStorage = () => setPlayerId(localStorage.getItem("vclol_player_id"));
    window.addEventListener("storage", onStorage);
    // Also re-check on focus in case localStorage was set in same tab
    window.addEventListener("focus", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onStorage);
    };
  }, []);

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
