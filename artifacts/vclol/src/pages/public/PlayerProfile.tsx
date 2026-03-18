import { useState, useEffect } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import {
  useGetPlayer, useGetEloHistory, useGetPlayerBadges, useListSeasonChampions,
  useGetPlayerEvents, useGetPlayerChampions,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Trophy, ExternalLink, Video, Star, Medal, Crown, Swords, CalendarDays } from "lucide-react";
import { Link, useParams } from "wouter";
import { ChallengeModal } from "@/components/ChallengeModal";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// ── Champion utilities ──────────────────────────────────────────────────────
const CHAMP_IDS: Record<string, string> = {
  "Aurelion Sol": "AurelionSol", "Bel'Veth": "Belveth", "Cho'Gath": "Chogath",
  "Dr. Mundo": "DrMundo", "Jarvan IV": "JarvanIV", "Kai'Sa": "Kaisa",
  "Kha'Zix": "Khazix", "Kog'Maw": "KogMaw", "LeBlanc": "Leblanc",
  "Lee Sin": "LeeSin", "Master Yi": "MasterYi", "Miss Fortune": "MissFortune",
  "Nunu & Willump": "Nunu", "Rek'Sai": "RekSai", "Renata Glasc": "Renata",
  "Tahm Kench": "TahmKench", "Twisted Fate": "TwistedFate", "Vel'Koz": "Velkoz",
  "Wukong": "MonkeyKing", "Xin Zhao": "XinZhao", "K'Sante": "KSante",
};
const toChampId = (name: string) => CHAMP_IDS[name] ?? name.replace(/[\s'.]/g, "");
const champPortraitUrl = (name: string) =>
  `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${toChampId(name)}_0.jpg`;

// ── Rank system (shared with Ladder / Dashboard) ────────────────────────────
const RANKS = [
  { name: "Diamond",  min: 1450, color: "#A78BFA", border: "border-violet-500/40",  bg: "bg-violet-500/10",  text: "text-violet-400"       },
  { name: "Platinum", min: 1350, color: "#2DD4BF", border: "border-teal-500/40",    bg: "bg-teal-500/10",    text: "text-teal-400"         },
  { name: "Gold",     min: 1250, color: "#FBBF24", border: "border-yellow-500/40",  bg: "bg-yellow-500/10",  text: "text-yellow-400"       },
  { name: "Silver",   min: 1150, color: "#94A3B8", border: "border-slate-400/40",   bg: "bg-slate-500/10",   text: "text-slate-300"        },
  { name: "Bronze",   min: 1050, color: "#CD853F", border: "border-amber-600/40",   bg: "bg-amber-700/10",   text: "text-amber-500"        },
  { name: "Unranked", min: 0,    color: "#64748B", border: "border-border/40",      bg: "bg-muted/10",       text: "text-muted-foreground" },
];
const getRank = (elo: number) => RANKS.find((r) => elo >= r.min) ?? RANKS[RANKS.length - 1];

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
  const { data: eloHistory }    = useGetEloHistory(player?.id ?? 0,    { query: { enabled: !!player?.id } });
  const { data: badges }        = useGetPlayerBadges(player?.id ?? 0,  { query: { enabled: !!player?.id } });
  const { data: seasonChamps }  = useListSeasonChampions(              { query: { enabled: !!player?.id } });
  const { data: playerEvents }  = useGetPlayerEvents(player?.id ?? 0,  { query: { enabled: !!player?.id } });
  const { data: championStats } = useGetPlayerChampions(player?.id ?? 0, { query: { enabled: !!player?.id } });

  const myChampionships = seasonChamps?.filter((c) => c.playerId === player?.id) ?? [];

  useEffect(() => {
    const id = localStorage.getItem("vclol_player_id");
    setIsLoggedIn(!!id);
    setMyPlayerId(id ? Number(id) : 0);
  }, []);

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
          <button onClick={() => window.history.back()} className="text-primary hover:underline text-sm mt-2 inline-block">
            ← Back
          </button>
        </div>
      </PublicLayout>
    );
  }

  const rank = getRank(player.currentElo);
  const winRate = player.wins + player.losses > 0
    ? Math.round((player.wins / (player.wins + player.losses)) * 100)
    : 0;
  const topChampion = championStats?.[0]?.champion;

  const eloChartData = [...(eloHistory ?? [])].reverse().map((h, i) => ({
    match: i + 1,
    elo: h.elo,
  }));

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-16 sm:px-6 lg:px-8">

        {/* ── HERO CARD ────────────────────────────────────────────────── */}
        <Card className="bg-card/40 border-border/40 mb-6 relative overflow-hidden">
          {/* Champion splash art background — subtle, fades left */}
          {topChampion && (
            <div className="absolute inset-0 pointer-events-none select-none">
              <img
                src={champPortraitUrl(topChampion)}
                alt=""
                className="absolute right-0 top-0 h-full w-2/5 object-cover object-top opacity-[0.08]"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-card/95 via-card/80 to-transparent" />
            </div>
          )}

          <CardContent className="p-6 sm:p-8 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Avatar */}
              <div className={`w-16 h-16 rounded-full border-2 ${rank.border} ${rank.bg} flex items-center justify-center text-2xl font-display font-bold ${rank.text} flex-shrink-0`}>
                {player.riotId.charAt(0).toUpperCase()}
              </div>

              {/* Identity */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="text-3xl font-display font-bold truncate">{player.riotId}</h1>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${rank.border} ${rank.bg} ${rank.text}`}>
                    {rank.name}
                  </span>
                  {!player.isActive && (
                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">{player.discordUsername}</p>
                {myChampionships.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {myChampionships.map((c) => (
                      <span key={c.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-medium">
                        <Crown className="w-3 h-3" /> Season Champion
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ELO + Peak + Challenge */}
              <div className="flex flex-col items-end gap-3 flex-shrink-0">
                <div className="flex gap-5">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground flex items-center gap-1 justify-center mb-0.5">
                      <TrendingUp className="w-3 h-3" /> ELO
                    </div>
                    <div className={`text-3xl font-display font-bold ${rank.text}`}>{player.currentElo}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground flex items-center gap-1 justify-center mb-0.5">
                      <Trophy className="w-3 h-3" /> Peak
                    </div>
                    <div className="text-3xl font-display font-bold text-yellow-400">{player.peakElo}</div>
                  </div>
                </div>
                {isLoggedIn && player.id !== myPlayerId && (
                  <Button size="sm" onClick={() => setChallengeOpen(true)}>
                    <Swords className="w-3.5 h-3.5 mr-1.5" /> Challenge
                  </Button>
                )}
              </div>
            </div>

            {/* ── W / L / WR ─────────────────────────────────────────── */}
            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border/30 pt-5">
              <div className="text-center">
                <div className="text-2xl font-display font-bold text-green-400">{player.wins}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Wins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-display font-bold text-red-400">{player.losses}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Losses</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-display font-bold ${rank.text}`}>{winRate}%</div>
                <div className="text-xs text-muted-foreground mt-0.5">Win Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── BADGES ───────────────────────────────────────────────────── */}
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
                          ? "bg-yellow-500/15 border-yellow-400/40 text-yellow-300 ring-1 ring-yellow-400/20"
                          : "bg-card/60 border-border/40 text-muted-foreground"
                      }`}
                    >
                      {isChampion ? (
                        <Crown className="w-4 h-4 shrink-0 text-yellow-300" />
                      ) : (
                        <Star className="w-4 h-4 shrink-0" />
                      )}
                      <div>
                        <div className={`text-sm font-medium capitalize ${isChampion ? "font-bold text-yellow-300" : ""}`}>
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

        {/* ── ELO HISTORY CHART ────────────────────────────────────────── */}
        {eloChartData.length > 1 && (
          <Card className="bg-card/40 border-border/40 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-display">
                <TrendingUp className="w-5 h-5 text-primary" />
                ELO History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={eloChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eloGradProfile" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={rank.color} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={rank.color} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="match" tick={{ fontSize: 11, fill: "#888" }} label={{ value: "Match", position: "insideBottom", offset: -2, fontSize: 11, fill: "#888" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#888" }} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ background: "#1a1a2e", border: `1px solid ${rank.color}30`, borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [value, "ELO"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="elo"
                    stroke={rank.color}
                    strokeWidth={2}
                    fill="url(#eloGradProfile)"
                    dot={{ r: 3, fill: rank.color }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── CHAMPION POOL ─────────────────────────────────────────────── */}
        {championStats && championStats.length > 0 && (
          <Card className="bg-card/40 border-border/40 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-display">
                <Swords className="w-5 h-5 text-primary" />
                Champion Pool
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-5">
                {championStats.map(({ champion, games }, i) => (
                  <div key={champion} className="flex flex-col items-center gap-2">
                    <div className={`w-14 h-14 rounded-full overflow-hidden border-2 flex-shrink-0 ${i === 0 ? rank.border : "border-border/40"}`}>
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
                    <div className="text-center leading-tight">
                      <div className="text-xs font-medium truncate max-w-[56px]">{champion}</div>
                      <div className="text-[10px] text-muted-foreground">{games}G</div>
                    </div>
                    {i === 0 && (
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${rank.border} ${rank.bg} ${rank.text}`}>
                        Main
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── EVENTS ────────────────────────────────────────────────────── */}
        {playerEvents && playerEvents.length > 0 && (
          <Card className="bg-card/40 border-border/40 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-display">
                <CalendarDays className="w-5 h-5 text-primary" />
                Events
              </CardTitle>
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

        {/* ── RECENT MATCHES + VODS ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card/40 border-border/40">
            <CardHeader>
              <CardTitle className="text-lg font-display">Recent Matches</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!player.recentMatches?.length ? (
                <div className="px-6 py-8 text-center text-muted-foreground text-sm">No matches recorded yet.</div>
              ) : (
                <div className="divide-y divide-border/30">
                  {player.recentMatches.map((match) => {
                    const isA = match.playerAId === player.id;
                    const won = match.winnerName === (isA ? match.sideAName : match.sideBName);
                    const eloBefore = isA ? match.playerAEloBefore : match.playerBEloBefore;
                    const eloAfter  = isA ? match.playerAEloAfter  : match.playerBEloAfter;
                    const oppRiotId = isA ? match.playerBRiotId : match.playerARiotId;
                    const oppName   = isA ? match.sideBName : match.sideAName;
                    return (
                      <Link key={match.id} href={`/matches/${match.id}`} className="block px-6 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors cursor-pointer">
                        <span className={`w-8 h-8 rounded shrink-0 flex items-center justify-center text-xs font-bold ${won ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {won ? "W" : "L"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            vs{" "}
                            {oppRiotId ? (
                              <span
                                className="text-primary hover:underline"
                                onClick={(e) => { e.preventDefault(); window.location.href = `/players/${encodeURIComponent(oppRiotId)}`; }}
                              >
                                {oppName}
                              </span>
                            ) : oppName}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            {match.matchTitle}
                            {match.isPlayoff && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">Playoff</Badge>
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

          <Card className="bg-card/40 border-border/40">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Video className="w-4 h-4" /> VODs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!player.vods?.length ? (
                <div className="px-6 py-8 text-center text-muted-foreground text-sm">No VODs available yet.</div>
              ) : (
                <div className="divide-y divide-border/30">
                  {player.vods.map((vod) => (
                    <Link key={vod.id} href={`/vods/${vod.id}`}>
                      <div className="px-6 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{vod.title}</div>
                          <div className="text-xs text-muted-foreground flex gap-2">
                            {vod.champion && <span>{vod.champion}</span>}
                            {vod.position && <span>· {vod.position}</span>}
                            {vod.patch && <span>· Patch {vod.patch}</span>}
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
