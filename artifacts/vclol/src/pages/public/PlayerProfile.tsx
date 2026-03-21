import PublicLayout from "@/components/layout/PublicLayout";
import {
  useGetPlayer, useGetPlayerBadges, useListSeasonChampions,
  useGetPlayerEvents, useGetPlayerChampions,
} from "@workspace/api-client-react";
import { getTeamEloHistory, getGetTeamEloHistoryQueryKey } from "@workspace/api-client-react";
import { useQueries } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, PlayCircle, TrendingUp, Award, Crosshair, CalendarDays, Swords, Video } from "lucide-react";
import { Link, useParams } from "wouter";
import { champPortraitUrl, BADGE_META } from "@/lib/lol-utils";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useAuth } from "@/hooks/use-auth";

function EloTrajectory({ teams }: { teams: Array<{ teamId: number; teamName: string }> }) {
  return <EloTrajectoryInner teams={teams} />;
}

function EloTrajectoryInner({ teams }: { teams: Array<{ teamId: number; teamName: string }> }) {
  const COLORS = ["hsl(var(--primary))", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

  const eloQueries = useQueries({
    queries: teams.map((t) => ({
      queryKey: getGetTeamEloHistoryQueryKey(t.teamId),
      queryFn: ({ signal }: { signal: AbortSignal }) => getTeamEloHistory(t.teamId, { signal }),
      enabled: t.teamId > 0,
    })),
  });

  const teamsWithHistory = teams
    .map((team, i) => ({ team, history: eloQueries[i]?.data ?? [] }))
    .filter((t) => t.history.length >= 2);

  if (teamsWithHistory.length === 0) return null;

  if (teamsWithHistory.length === 1) {
    const { team, history } = teamsWithHistory[0];
    return (
      <Card className="bg-card/40 border-border/40 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            ELO Trajectory
            <span className="text-xs text-muted-foreground font-normal ml-1">via {team.teamName}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history.map((e) => ({
                elo: e.elo,
                date: new Date(e.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} domain={["dataMin - 30", "dataMax + 30"]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  formatter={(value: number) => [`${value} ELO`, "Rating"]}
                />
                <Line type="monotone" dataKey="elo" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  const mergedData: Record<string, unknown>[] = [];
  teamsWithHistory.forEach(({ team, history }) => {
    history.forEach((e) => {
      const date = new Date(e.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
      let existing = mergedData.find((d) => d.date === date);
      if (!existing) {
        existing = { date };
        mergedData.push(existing);
      }
      (existing as Record<string, unknown>)[team.teamName] = e.elo;
    });
  });

  return (
    <Card className="bg-card/40 border-border/40 mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          ELO Trajectory
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 mb-3">
          {teamsWithHistory.map(({ team }, i) => (
            <div key={team.teamId} className="flex items-center gap-1.5 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-muted-foreground">{team.teamName}</span>
            </div>
          ))}
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} domain={["dataMin - 30", "dataMax + 30"]} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              />
              {teamsWithHistory.map(({ team }, i) => (
                <Line key={team.teamId} type="monotone" dataKey={team.teamName} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PlayerProfile() {
  const { riotId } = useParams<{ riotId: string }>();
  const { isLoggedIn } = useAuth();
  const { data: player, isLoading, isError } = useGetPlayer(riotId ?? "");
  const { data: badges }        = useGetPlayerBadges(player?.id ?? 0,    { query: { enabled: !!player?.id } });
  const { data: seasonChamps }  = useListSeasonChampions(                { query: { enabled: !!player?.id } });
  const { data: playerEvents }  = useGetPlayerEvents(player?.id ?? 0,    { query: { enabled: !!player?.id } });
  const { data: championStats } = useGetPlayerChampions(player?.id ?? 0, { query: { enabled: !!player?.id } });

  const allTeams = player?.teams ?? [];

  const playerTeamIds = new Set((player?.teams ?? []).map((t) => t.teamId));
  const myChampionships = seasonChamps?.filter((c) => playerTeamIds.has(c.teamId)) ?? [];

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 animate-pulse space-y-4">
          <div className="h-40 bg-card rounded-xl" />
          <div className="h-48 bg-card rounded-xl" />
        </div>
      </PublicLayout>
    );
  }

  if (isError || !player) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
          <p className="text-muted-foreground">Player not found.</p>
          <Link href="/players" className="text-primary hover:underline text-sm mt-2 inline-block">
            ← Back to Players
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const topChampion = championStats?.[0]?.champion;

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-16 sm:px-6 lg:px-8">


        <Card className="bg-card/40 border-border/40 mb-8 relative overflow-hidden">
          {topChampion && (
            <div className="absolute inset-0 pointer-events-none select-none">
              <img
                src={champPortraitUrl(topChampion)}
                alt=""
                className="absolute right-0 top-0 h-full w-2/5 object-cover object-top opacity-[0.07]"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-card/95 via-card/80 to-transparent" />
            </div>
          )}

          <CardContent className="p-8 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-2xl font-display font-bold text-primary flex-shrink-0">
                {player.riotId.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="text-3xl font-display font-bold">{player.riotId}</h1>
                  {!player.isActive && (
                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">{player.discordUsername}</p>
                {player.primaryRole && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Role: <span className="text-foreground">{player.primaryRole}</span>
                    {player.secondaryRole && <span> / {player.secondaryRole}</span>}
                  </p>
                )}
                {myChampionships.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {myChampionships.map((c) => (
                      <span key={c.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-medium">
                        <Crown className="w-3 h-3" /> Season Champion
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-3 flex-shrink-0">
                {player.teams && player.teams.length > 0 && (
                  <div className="text-right space-y-1">
                    {player.teams.map((t) => (
                      <Link key={t.teamId} href={`/teams/${t.teamId}`} className="text-sm text-primary hover:underline block">
                        {t.teamName} [{t.teamTag}]
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {player.aggregateStats && player.aggregateStats.totalGames > 0 && (
              <div className="mt-6 border-t border-border/40 pt-5">
                <div className="flex items-center divide-x divide-border/40">
                  <div className="flex-1 text-center px-4 py-1">
                    <div className="text-xl font-display font-bold text-green-400">{player.aggregateStats.wins}</div>
                    <div className="text-xs text-muted-foreground mt-1">Wins</div>
                  </div>
                  <div className="flex-1 text-center px-4 py-1">
                    <div className="text-xl font-display font-bold text-red-400">{player.aggregateStats.losses}</div>
                    <div className="text-xs text-muted-foreground mt-1">Losses</div>
                  </div>
                  <div className="flex-1 text-center px-4 py-1">
                    <div className="text-xl font-display font-bold">
                      {player.aggregateStats.avgKills.toFixed(1)} / {player.aggregateStats.avgDeaths.toFixed(1)} / {player.aggregateStats.avgAssists.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Avg KDA</div>
                  </div>
                  <div className="flex-1 text-center px-4 py-1">
                    <div className="text-xl font-display font-bold">
                      {player.aggregateStats.wins + player.aggregateStats.losses > 0
                        ? Math.round((player.aggregateStats.wins / (player.aggregateStats.wins + player.aggregateStats.losses)) * 100)
                        : 0}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Win Rate</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {badges && badges.length > 0 && (
          <Card className="bg-card/40 border-border/40 mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2"><Award className="w-4 h-4 text-primary" /> Badges</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}

        {allTeams.length > 0 && <EloTrajectory teams={allTeams} />}

        {championStats && championStats.length > 0 && (
          <Card className="bg-card/40 border-border/40 mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2"><Crosshair className="w-4 h-4 text-primary" /> Champion Pool</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {championStats.map(({ champion, games, wins, avgKda }, i) => {
                  const safeWins = wins ?? 0;
                  const wr = games > 0 ? Math.round((safeWins / games) * 100) : 0;
                  return (
                    <div key={champion} className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full overflow-hidden border-2 flex-shrink-0 ${i === 0 ? "border-primary/50" : "border-border/40"}`}>
                        <img
                          src={champPortraitUrl(champion)}
                          alt={champion}
                          className="w-full h-full object-cover object-top scale-[1.4] translate-y-1"
                          onError={(e) => {
                            const el = e.currentTarget;
                            el.style.display = "none";
                            if (el.parentElement) el.parentElement.style.background = "#1e293b";
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{champion}</span>
                          {i === 0 && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                              Main
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {games} game{games !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-medium ${wr >= 60 ? "text-green-400" : wr >= 50 ? "text-foreground" : "text-red-400"}`}>
                          {wr}% WR
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {avgKda != null ? `${avgKda.toFixed(1)} KDA` : "-"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {playerEvents && playerEvents.length > 0 && (
          <Card className="bg-card/40 border-border/40 mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" /> Events</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                {playerEvents.map((ev) => (
                  <div key={ev.eventId} className="px-6 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      {ev.eventSlug ? (
                        <Link href={`/events/${ev.eventSlug}`} className="text-sm font-medium hover:text-primary transition-colors truncate block">
                          {ev.eventTitle ?? `Event #${ev.eventId}`}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium truncate block">{ev.eventTitle ?? `Event #${ev.eventId}`}</span>
                      )}
                      <div className="flex gap-2 mt-0.5 flex-wrap">
                        {ev.eventFormat && <span className="text-xs text-muted-foreground">{ev.eventFormat}</span>}
                        {ev.eventDate && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(ev.eventDate).toLocaleDateString("en-CA", { year: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-medium shrink-0 text-right">
                      <span className="text-green-400">{ev.wins}W</span>
                      {" / "}
                      <span className="text-red-400">{ev.losses}L</span>
                      {ev.matchesPlayed > 0 && (
                        <div className="text-xs text-muted-foreground">{ev.matchesPlayed} matches</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card/40 border-border/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-display flex items-center gap-2"><Swords className="w-4 h-4 text-primary" /> Recent Matches</CardTitle>
                <Link href="/matches" className="text-xs text-primary hover:underline">View All →</Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!player.recentMatches?.length ? (
                <div className="px-6 py-8 text-center text-muted-foreground text-sm">No matches recorded yet.</div>
              ) : (
                <div className="divide-y divide-border/30">
                  {player.recentMatches.map((match) => {
                    const isOnTeamA = playerTeamIds.has(match.teamAId ?? -1);
                    const isOnTeamB = playerTeamIds.has(match.teamBId ?? -1);
                    const playerSideName = isOnTeamA ? match.sideAName : isOnTeamB ? match.sideBName : null;
                    const won = playerSideName ? match.winnerName === playerSideName : false;
                    return (
                      <Link key={match.id} href={`/matches/${match.id}`} className="block px-6 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors cursor-pointer">
                        <span className={`w-8 h-8 rounded shrink-0 flex items-center justify-center text-xs font-bold ${won ? "bg-green-400/20 text-green-400" : "bg-red-400/20 text-red-400"}`}>
                          {won ? "W" : "L"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{match.matchTitle}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span>{new Date(match.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</span>
                            <span>·</span>
                            {match.sideAName} vs {match.sideBName}
                            {match.isPlayoff && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">Playoff</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-display font-bold">{match.score || "-"}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2"><Video className="w-4 h-4 text-primary" /> VODs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!player.vods?.length ? (
                <div className="px-6 py-8 text-center text-muted-foreground text-sm">No VODs available yet.</div>
              ) : (
                <div className="divide-y divide-border/30">
                  {player.vods.map((vod) => (
                    <div key={vod.id} className="px-6 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <Link href={`/vods/${vod.id}`} className="text-sm font-medium truncate block hover:text-primary transition-colors">
                          {vod.title}
                        </Link>
                        <div className="text-xs text-muted-foreground flex gap-2">
                          {vod.champion && <span>{vod.champion}</span>}
                          {vod.position && <span>· {vod.position}</span>}
                          {vod.patch && <span>· Patch {vod.patch}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {vod.matchId && (
                          <Link href={`/matches/${vod.matchId}`} className="text-xs text-primary hover:underline">
                            Match →
                          </Link>
                        )}
                        <Link href={`/vods/${vod.id}`}>
                          <PlayCircle className="w-3 h-3 text-muted-foreground" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
