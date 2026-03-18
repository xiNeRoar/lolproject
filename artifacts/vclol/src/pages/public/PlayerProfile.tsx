import { useState, useEffect } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import { useGetPlayer, useGetEloHistory, useGetPlayerBadges, useListSeasonChampions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Trophy, ExternalLink, Video, Star, Medal, Crown } from "lucide-react";
import { Link, useParams } from "wouter";
import { ChallengeModal } from "@/components/ChallengeModal";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

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

function eloDelta(before: number | null | undefined, after: number | null | undefined) {
  if (before == null || after == null) return null;
  const delta = after - before;
  if (delta > 0) return <span className="text-green-400 text-xs font-medium">+{delta}</span>;
  if (delta < 0) return <span className="text-red-400 text-xs font-medium">{delta}</span>;
  return <span className="text-muted-foreground text-xs">±0</span>;
}

export default function PlayerProfile() {
  const { riotId } = useParams<{ riotId: string }>();
  const { data: player, isLoading, isError } = useGetPlayer(riotId ?? "");
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState(0);
  const { data: eloHistory } = useGetEloHistory(player?.id ?? 0, { query: { enabled: !!player?.id } });
  const { data: badges } = useGetPlayerBadges(player?.id ?? 0, { query: { enabled: !!player?.id } });
  const { data: seasonChampions } = useListSeasonChampions({ query: { enabled: !!player?.id } });
  const myChampionships = seasonChampions?.filter(c => c.playerId === player?.id) ?? [];

  useEffect(() => {
    const id = localStorage.getItem("vclol_player_id");
    setIsLoggedIn(!!id);
    setMyPlayerId(id ? Number(id) : 0);
  }, []);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 animate-pulse">
          <div className="h-32 bg-card rounded-xl mb-6" />
          <div className="h-64 bg-card rounded-xl" />
        </div>
      </PublicLayout>
    );
  }

  if (isError || !player) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
          <p className="text-muted-foreground">Player not found.</p>
          <button onClick={() => window.history.back()} className="text-primary hover:underline text-sm mt-2 inline-block">
            ← Back
          </button>
        </div>
      </PublicLayout>
    );
  }

  const winRate =
    player.wins + player.losses > 0
      ? Math.round((player.wins / (player.wins + player.losses)) * 100)
      : 0;

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-16 sm:px-6 lg:px-8">
        {/* Hero card */}
        <Card className="bg-card/40 border-border/40 mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-2xl font-display font-bold text-primary">
                {player.riotId.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="text-3xl font-display font-bold">{player.riotId}</h1>
                  <span
                    className={`text-sm px-3 py-1 rounded-full border font-medium ${eloBadgeColor(player.currentElo)}`}
                  >
                    {rankLabel(player.currentElo)}
                  </span>
                  {!player.isActive && (
                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">{player.discordUsername}</p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                      <TrendingUp className="w-3 h-3" /> ELO
                    </div>
                    <div className="text-2xl font-display font-bold text-primary">{player.currentElo}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                      <Trophy className="w-3 h-3" /> Peak
                    </div>
                    <div className="text-2xl font-display font-bold text-yellow-400">{player.peakElo}</div>
                  </div>
                </div>
                {isLoggedIn && player.id !== myPlayerId && (
                  <Button size="sm" onClick={() => setChallengeOpen(true)}>
                    Challenge
                  </Button>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border/40 pt-6">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Wins</div>
                <div className="text-xl font-display font-bold text-green-400">{player.wins}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Losses</div>
                <div className="text-xl font-display font-bold text-red-400">{player.losses}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
                <div className="text-xl font-display font-bold">{winRate}%</div>
              </div>
            </div>
            {myChampionships.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/40 flex flex-wrap gap-2">
                {myChampionships.map((c) => (
                  <span key={c.id} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-medium">
                    🏆 Season Champion
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Badges */}
        {badges && badges.length > 0 && (
          <Card className="bg-card/40 border-border/40 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-display">
                <Medal className="w-5 h-5 text-yellow-400" />
                Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {badges.map((badge) => {
                  const isChampion = badge.badgeType === "season_champion";
                  return (
                    <div
                      key={badge.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                        isChampion
                          ? "bg-yellow-500/20 border-yellow-400/50 text-yellow-300 ring-1 ring-yellow-400/30"
                          : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {isChampion ? (
                        <Crown className="w-4 h-4 shrink-0 text-yellow-300" />
                      ) : (
                        <Star className="w-4 h-4 shrink-0" />
                      )}
                      <div>
                        <div className={`text-sm font-medium capitalize ${isChampion ? "font-bold" : ""}`}>
                          {badge.badgeType.replace(/_/g, " ")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(badge.earnedAt).toLocaleDateString("en-CA", { year: "numeric", month: "short" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ELO History Chart */}
        {eloHistory && eloHistory.length > 1 && (
          <Card className="bg-card/40 border-border/40 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-display">
                <TrendingUp className="w-5 h-5 text-primary" />
                ELO History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart
                  data={[...eloHistory].reverse().map((h, i) => ({
                    game: i + 1,
                    elo: h.elo,
                    delta: h.delta,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="game"
                    tick={{ fontSize: 11, fill: "#888" }}
                    label={{ value: "Match", position: "insideBottom", offset: -2, fontSize: 11, fill: "#888" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#888" }}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number, name: string) => [value, name === "elo" ? "ELO" : "Delta"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="elo"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#3b82f6" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Champion Pool — grouped from player VODs */}
        {player.vods?.some((v) => v.champion) && (
          <Card className="bg-card/40 border-border/40 mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-display">Champion Pool</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(
                  player.vods
                    .filter((v) => v.champion)
                    .reduce<Record<string, number>>((acc, v) => {
                      const champ = v.champion as string;
                      acc[champ] = (acc[champ] ?? 0) + 1;
                      return acc;
                    }, {})
                )
                  .sort(([, a], [, b]) => b - a)
                  .map(([champion, count]) => (
                    <div
                      key={champion}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20"
                    >
                      <span className="text-sm font-medium text-primary">{champion}</span>
                      <span className="text-xs text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Matches */}
          <Card className="bg-card/40 border-border/40">
            <CardHeader>
              <CardTitle className="text-lg font-display">Recent Matches</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!player.recentMatches?.length ? (
                <div className="px-6 py-8 text-center text-muted-foreground text-sm">
                  No matches recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {player.recentMatches.map((match) => {
                    const isA = match.playerAId === player.id;
                    const won = match.winnerName === (isA ? match.sideAName : match.sideBName);
                    const eloBefore = isA ? match.playerAEloBefore : match.playerBEloBefore;
                    const eloAfter = isA ? match.playerAEloAfter : match.playerBEloAfter;
                    return (
                      <Link key={match.id} href={`/matches/${match.id}`} className="block px-6 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors cursor-pointer">
                        <span
                          className={`w-8 h-8 rounded shrink-0 flex items-center justify-center text-xs font-bold ${
                            won ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {won ? "W" : "L"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {match.sideAName} <span className="text-muted-foreground text-xs">vs</span> {match.sideBName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {match.matchTitle}
                            {match.isPlayoff && (
                              <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">Playoff</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-display font-bold">{match.score || "-"}</div>
                          <div>{eloDelta(eloBefore, eloAfter)}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* VODs */}
          <Card className="bg-card/40 border-border/40">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Video className="w-4 h-4" /> VODs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!player.vods?.length ? (
                <div className="px-6 py-8 text-center text-muted-foreground text-sm">
                  No VODs available yet.
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {player.vods.map((vod) => (
                    <Link key={vod.id} href={`/vods/${vod.id}`}>
                      <div className="px-6 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{vod.title}</div>
                          <div className="text-xs text-muted-foreground flex gap-2">
                            {vod.champion && <span>{vod.champion}</span>}
                            {vod.position && <span>• {vod.position}</span>}
                            {vod.patch && <span>• Patch {vod.patch}</span>}
                          </div>
                        </div>
                        <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {challengeOpen && (
        <ChallengeModal
          targetPlayer={player ? { id: player.id, riotId: player.riotId } : null}
          challengerId={myPlayerId}
          onClose={() => setChallengeOpen(false)}
        />
      )}
    </PublicLayout>
  );
}
