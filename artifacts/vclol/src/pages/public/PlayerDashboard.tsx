import PublicLayout from "@/components/layout/PublicLayout";
import {
  useGetPlayerById, useGetEloHistory, useGetPlayerBadges,
  useGetChallengesForPlayer, useListSeasons, useAcceptChallenge,
  useDeclineChallenge, useUpdatePlayerProfile, useGetLadderSettings,
  useSetChallengeGameReady, useGetPlayerChampions, useGetPlayerEvents,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Swords, Zap, Shield, TrendingUp, CalendarDays } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";

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

// ── Rank system ─────────────────────────────────────────────────────────────
const RANKS = [
  { name: "Diamond",  min: 1450, color: "#A78BFA", text: "text-violet-400",        border: "border-violet-500/50", bg: "bg-violet-500/10",  glow: "shadow-violet-500/20" },
  { name: "Platinum", min: 1350, color: "#2DD4BF", text: "text-teal-400",          border: "border-teal-500/50",   bg: "bg-teal-500/10",    glow: "shadow-teal-500/20"   },
  { name: "Gold",     min: 1250, color: "#FBBF24", text: "text-yellow-400",        border: "border-yellow-500/50", bg: "bg-yellow-500/10",  glow: "shadow-yellow-500/20" },
  { name: "Silver",   min: 1150, color: "#94A3B8", text: "text-slate-300",         border: "border-slate-400/50",  bg: "bg-slate-500/10",   glow: "shadow-slate-500/20"  },
  { name: "Bronze",   min: 1050, color: "#CD853F", text: "text-amber-500",         border: "border-amber-600/50",  bg: "bg-amber-700/10",   glow: "shadow-amber-700/20"  },
  { name: "Unranked", min: 0,    color: "#64748B", text: "text-muted-foreground",  border: "border-border/50",     bg: "bg-muted/10",       glow: "shadow-none"          },
];
const getRank = (elo: number) => RANKS.find((r) => elo >= r.min) ?? RANKS[RANKS.length - 1];

// ── Badge config ─────────────────────────────────────────────────────────────
type BadgeMeta = { icon: LucideIcon; label: string; desc: string; iconColor: string; border: string; bg: string };
const BADGE_CONFIG: Record<string, BadgeMeta> = {
  season_champion: { icon: Trophy,     label: "Season Champion", desc: "Won an official VCLoL season",        iconColor: "text-yellow-400", border: "border-yellow-500/40", bg: "bg-yellow-500/5"  },
  first_blood:     { icon: Swords,     label: "First Blood",     desc: "First player to record a match win",  iconColor: "text-red-400",    border: "border-red-500/40",    bg: "bg-red-500/5"     },
  win_streak:      { icon: Zap,        label: "Win Streak",      desc: "Won 3+ consecutive matches",          iconColor: "text-orange-400", border: "border-orange-500/40", bg: "bg-orange-500/5"  },
  veteran:         { icon: Shield,     label: "Veteran",         desc: "Competed in 10+ official matches",    iconColor: "text-purple-400", border: "border-purple-500/40", bg: "bg-purple-500/5"  },
  climber:         { icon: TrendingUp, label: "Climber",         desc: "Gained 100+ ELO in a season",         iconColor: "text-blue-400",   border: "border-blue-500/40",   bg: "bg-blue-500/5"    },
};

// ── Helper sub-components ────────────────────────────────────────────────────
function LoggedOutState() {
  return (
    <div className="max-w-sm mx-auto px-4 pt-24 pb-16">
      <div className="border border-border/40 bg-card/60 rounded-xl p-8 text-center">
        <h2 className="text-xl font-display font-bold mb-3">You must be logged in to view your dashboard.</h2>
        <Link href="/login">
          <Button className="mt-2" style={{ backgroundColor: "#5865F2" }}>Login with Discord →</Button>
        </Link>
      </div>
    </div>
  );
}

function RoflUploadButton({ matchId, matchDate }: { matchId: number; matchDate: string }) {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const expiryDate = new Date(new Date(matchDate).getTime() + 14 * 24 * 60 * 60 * 1000);
  const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (daysLeft <= 0) return <span className="text-xs text-muted-foreground/40 italic">Expired</span>;
  if (done) return <span className="text-xs text-green-400">✓ Uploaded</span>;
  return (
    <div className="flex items-center gap-1">
      <input ref={fileRef} type="file" accept=".rofl" className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]; if (!file) return;
          setUploading(true);
          try {
            const fd = new FormData();
            fd.append("rofl", file); fd.append("matchId", String(matchId));
            const res = await fetch("/api/replays", { method: "POST", body: fd });
            if (res.ok) setDone(true);
          } finally { setUploading(false); }
        }}
      />
      <button onClick={() => fileRef.current?.click()} disabled={uploading}
        className="text-xs text-primary hover:underline disabled:opacity-50">
        {uploading ? "Uploading..." : "Upload .rofl"}
      </button>
      {daysLeft <= 3 && <span className="text-xs text-yellow-400">({daysLeft}d)</span>}
    </div>
  );
}

function GameIdSubmit({ challengeId }: { challengeId: number }) {
  const [gameId, setGameId] = useState("");
  const setGameReady = useSetChallengeGameReady();
  const queryClient = useQueryClient();
  return (
    <div className="flex gap-2 mt-2">
      <input type="text" placeholder="Enter Game ID" value={gameId}
        onChange={(e) => setGameId(e.target.value)}
        className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
      <Button size="sm" className="h-8 text-xs shrink-0"
        disabled={!gameId.trim() || setGameReady.isPending}
        onClick={() => setGameReady.mutate({ id: challengeId, data: { gameId: gameId.trim() } }, {
          onSuccess: () => { setGameId(""); queryClient.invalidateQueries({ queryKey: ["/api/challenges"] }); }
        })}>
        {setGameReady.isPending ? "..." : "Submit"}
      </Button>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
function DashboardContent({ pid }: { pid: number }) {
  const { data: player }         = useGetPlayerById(pid);
  const { data: eloHistory }     = useGetEloHistory(pid);
  const { data: badges }         = useGetPlayerBadges(pid);
  const { data: challenges }     = useGetChallengesForPlayer(pid);
  const { data: seasons }        = useListSeasons();
  const { data: ladderSettings } = useGetLadderSettings();
  const { data: champions }      = useGetPlayerChampions(pid);
  const { data: events }         = useGetPlayerEvents(pid);

  const acceptChallenge  = useAcceptChallenge();
  const declineChallenge = useDeclineChallenge();
  const updatePlayer     = useUpdatePlayerProfile();
  const [notifPref, setNotifPref] = useState<string | null>(null);

  const activeSeason      = seasons?.find((s) => s.status === "active");
  const totalMatches      = (player?.wins ?? 0) + (player?.losses ?? 0);
  const winRate           = totalMatches > 0 ? Math.round(((player?.wins ?? 0) / totalMatches) * 100) : 0;
  const pendingChallenges = (challenges ?? []).filter((c) => c.status === "pending" && c.challengedId === pid);
  const upcomingMatches   = (challenges ?? []).filter((c) => c.status === "accepted");
  const eloChartData      = (eloHistory ?? []).map((e) => ({
    date: new Date(e.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
    elo:  e.elo,
  }));

  const handleSaveNotif = () => {
    if (!notifPref) return;
    updatePlayer.mutate({ id: pid, data: { notificationPreference: notifPref } },
      { onSuccess: () => toast.success("Preferences saved") });
  };

  if (!player) return (
    <div className="max-w-5xl mx-auto px-4 pt-16 pb-16 space-y-4 animate-pulse">
      <div className="h-48 bg-card/60 rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        {[0,1,2].map(i => <div key={i} className="h-24 bg-card/60 rounded-xl" />)}
      </div>
      <div className="h-64 bg-card/60 rounded-xl" />
    </div>
  );

  const rank = getRank(player.currentElo);
  const minRequired = ladderSettings?.minMatchesForDisplay ?? 4;
  const currentNotifPref = notifPref ?? player.notificationPreference ?? "web";
  const topChampion = champions?.[0]?.champion;

  return (
    <div className="max-w-5xl mx-auto px-4 pt-10 pb-16 sm:px-6 space-y-4">

      {/* ── HERO CARD ──────────────────────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-2xl border ${rank.border} bg-card/60`}>
        {/* Champion splash background (if player has a main) */}
        {topChampion && (
          <div className="absolute inset-0 pointer-events-none select-none">
            <img
              src={champPortraitUrl(topChampion)}
              alt=""
              className="absolute right-0 top-0 h-full w-1/2 object-cover object-top opacity-10"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-card/95 via-card/80 to-transparent" />
          </div>
        )}
        <div className="relative px-6 py-7 sm:px-8 sm:py-8 flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Identity */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              {player.discordUsername}
            </p>
            <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight truncate mb-3">
              {player.riotId}
            </h1>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${rank.border} ${rank.bg} ${rank.text}`}>
              {rank.name}
            </span>
            {activeSeason && (
              <p className="text-xs text-muted-foreground mt-2 opacity-70">{activeSeason.name}</p>
            )}
          </div>
          {/* ELO */}
          <div className="text-right flex-shrink-0">
            <div className={`text-6xl sm:text-7xl font-display font-black leading-none ${rank.text}`}>
              {player.currentElo}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">ELO</div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Peak <span className="text-foreground font-semibold">{player.peakElo}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── W / L / WR ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-green-500/25 bg-green-500/5 p-4 sm:p-5 text-center">
          <div className="text-4xl sm:text-5xl font-display font-black text-green-400 leading-none">{player.wins}</div>
          <div className="text-[10px] font-semibold text-green-500/70 uppercase tracking-widest mt-2">Wins</div>
        </div>
        <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 sm:p-5 text-center">
          <div className="text-4xl sm:text-5xl font-display font-black text-red-400 leading-none">{player.losses}</div>
          <div className="text-[10px] font-semibold text-red-500/70 uppercase tracking-widest mt-2">Losses</div>
        </div>
        <div className={`rounded-xl border ${rank.border} ${rank.bg} p-4 sm:p-5 text-center`}>
          <div className={`text-4xl sm:text-5xl font-display font-black leading-none ${rank.text}`}>{winRate}<span className="text-2xl">%</span></div>
          <div className={`text-[10px] font-semibold uppercase tracking-widest mt-2 opacity-70 ${rank.text}`}>Win Rate</div>
        </div>
      </div>

      {/* Ladder eligibility */}
      {totalMatches < minRequired ? (
        <div className="rounded-xl border border-border/30 bg-card/30 px-5 py-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Ladder eligibility</span>
            <span>{totalMatches} / {minRequired} matches</span>
          </div>
          <Progress value={Math.min((totalMatches / minRequired) * 100, 100)} className="h-1.5" />
          <p className="text-xs text-muted-foreground/70 mt-2">
            {minRequired - totalMatches} more {minRequired - totalMatches === 1 ? "match" : "matches"} needed to appear on the public ladder
          </p>
        </div>
      ) : (
        <div className={`rounded-xl border ${rank.border} ${rank.bg} px-5 py-3 flex items-center gap-3`}>
          <span className={`text-base ${rank.text}`}>✦</span>
          <p className={`text-sm font-medium ${rank.text}`}>You are ranked on the public ladder</p>
          <Link href="/ladder" className={`ml-auto text-xs hover:underline ${rank.text}`}>View Ladder →</Link>
        </div>
      )}

      {/* ── ELO CHART + CHAMPION POOL ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Chart */}
        <div className="lg:col-span-3 rounded-xl border border-border/30 bg-card/40 p-5">
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4">ELO History</h2>
          {eloChartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={eloChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="eloGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={rank.color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={rank.color} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} width={42} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: `1px solid ${rank.color}30`, borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#94a3b8" }}
                  itemStyle={{ color: rank.color }}
                />
                <Area type="monotone" dataKey="elo" stroke={rank.color} strokeWidth={2} fill="url(#eloGrad)" dot={false} activeDot={{ r: 4, fill: rank.color }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground/60">
              Play more matches to see your ELO trend
            </div>
          )}
        </div>

        {/* Champion pool */}
        <div className="lg:col-span-2 rounded-xl border border-border/30 bg-card/40 p-5">
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Champion Pool</h2>
          {!champions?.length ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground/60 text-center px-4">
              No champion data yet — play in a recorded VOD match
            </div>
          ) : (
            <div className="flex flex-wrap gap-5 pt-1">
              {champions.map(({ champion, games }, i) => (
                <div key={champion} className="flex flex-col items-center gap-2">
                  <div className={`relative w-[60px] h-[60px] rounded-full overflow-hidden border-2 ${i === 0 ? rank.border : "border-border/40"} flex-shrink-0`}>
                    <img
                      src={champPortraitUrl(champion)}
                      alt={champion}
                      className="w-full h-full object-cover object-top scale-[1.4] translate-y-1"
                      onError={(e) => {
                        const el = e.currentTarget;
                        el.style.display = "none";
                        el.parentElement!.style.background = "#1e293b";
                      }}
                    />
                  </div>
                  <div className="text-center leading-tight">
                    <div className="text-[11px] font-semibold truncate max-w-[64px]">{champion}</div>
                    <div className="text-[10px] text-muted-foreground">{games}G</div>
                  </div>
                  {i === 0 && (
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${rank.bg} ${rank.text} border ${rank.border}`}>
                      Main
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RECENT RESULTS ─────────────────────────────────────────────── */}
      {(player.recentMatches ?? []).length > 0 && (
        <div className="rounded-xl border border-border/30 bg-card/40 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border/20">
            <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Recent Results</h2>
          </div>
          <div className="divide-y divide-border/15">
            {(player.recentMatches ?? []).slice(0, 5).map((m) => {
              const isA  = m.playerAId === pid;
              const myName = isA ? m.sideAName : m.sideBName;
              const won  = m.winnerName === myName;
              const opp  = isA ? m.sideBName : m.sideAName;
              const delta = isA
                ? (m.playerAEloAfter ?? 0) - (m.playerAEloBefore ?? 0)
                : (m.playerBEloAfter ?? 0) - (m.playerBEloBefore ?? 0);
              const oppRiotId = isA ? m.playerBRiotId : m.playerARiotId;
              return (
                <Link key={m.id} href={`/matches/${m.id}`}>
                  <div className={`flex items-center gap-3 sm:gap-4 px-4 py-3.5 hover:bg-card/60 transition-colors cursor-pointer border-l-[3px] ${won ? "border-green-500" : "border-red-500/70"}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${won ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                      {won ? "W" : "L"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">vs {opp}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {m.matchTitle && (
                          <span className="text-[10px] text-muted-foreground/70">{m.matchTitle}</span>
                        )}
                        {m.score && (
                          <span className="text-[10px] text-muted-foreground/70">{m.score}</span>
                        )}
                        {m.isPlayoff && (
                          <span className="text-[10px] text-yellow-400/80 font-semibold uppercase tracking-wider">Playoff</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {delta !== 0 && (
                        <span className={`text-sm font-bold tabular-nums ${delta > 0 ? "text-green-400" : "text-red-400"}`}>
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      )}
                      <RoflUploadButton matchId={m.id} matchDate={m.createdAt} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BADGES ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border/30 bg-card/40 p-5">
        <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Badges</h2>
        {!badges?.length ? (
          <p className="text-sm text-muted-foreground/60 py-4">No badges earned yet — keep competing.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {badges.map((b) => {
              const cfg = BADGE_CONFIG[b.badgeType] ?? {
                icon: Trophy, label: b.badgeType, desc: "",
                iconColor: "text-primary", border: "border-border/40", bg: "bg-card/20",
              };
              const Icon = cfg.icon;
              return (
                <div key={b.id} className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.border} ${cfg.bg}`}>
                  <div className={`mt-0.5 flex-shrink-0 ${cfg.iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-sm font-bold ${cfg.iconColor}`}>{cfg.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{cfg.desc}</div>
                    <div className="text-[10px] text-muted-foreground/50 mt-1.5">
                      {new Date(b.earnedAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── EVENT HISTORY ──────────────────────────────────────────────── */}
      {(events ?? []).length > 0 && (
        <div className="rounded-xl border border-border/30 bg-card/40 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border/20">
            <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Event History</h2>
          </div>
          <div className="divide-y divide-border/15">
            {(events ?? []).map((e) => (
              <Link key={e.eventId} href={`/events/${e.eventSlug}`}>
                <div className="flex items-center gap-4 px-5 py-4 hover:bg-card/60 transition-colors cursor-pointer">
                  <CalendarDays className="w-4 h-4 text-primary flex-shrink-0 opacity-70" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{e.eventTitle}</div>
                    <div className="text-xs text-muted-foreground/70 mt-0.5">
                      {e.eventFormat} · {new Date(e.eventDate).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm">
                      <span className="text-green-400 font-bold">{e.wins}W</span>
                      <span className="text-muted-foreground/50 mx-1">/</span>
                      <span className="text-red-400 font-bold">{e.losses}L</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/60 mt-0.5">{e.matchesPlayed} matches</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── CHALLENGES ─────────────────────────────────────────────────── */}
      {(pendingChallenges.length > 0 || upcomingMatches.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pendingChallenges.length > 0 && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5">
              <h2 className="text-[11px] font-bold text-yellow-500/80 uppercase tracking-widest mb-4">Pending Challenges</h2>
              <div className="space-y-3">
                {pendingChallenges.map((c) => (
                  <div key={c.id} className="p-3 rounded-lg bg-background/40 border border-border/20">
                    <p className="text-sm font-semibold">{c.challengerRiotId ?? `Player #${c.challengerId}`}</p>
                    {c.scheduledTime && (
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(c.scheduledTime).toLocaleString()}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={() => acceptChallenge.mutate({ id: c.id })}>Accept</Button>
                      <Button size="sm" variant="outline"
                        onClick={() => declineChallenge.mutate({ id: c.id }, {
                          onError: (err: any) => {
                            if (err?.status === 403) toast.error("Decline limit reached — auto-accepted.");
                          },
                        })}>
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {upcomingMatches.length > 0 && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
              <h2 className="text-[11px] font-bold text-primary/70 uppercase tracking-widest mb-4">Upcoming Matches</h2>
              <div className="space-y-3">
                {upcomingMatches.map((c) => {
                  const isHost = c.challengerId === pid;
                  return (
                    <div key={c.id} className="p-3 rounded-lg bg-background/40 border border-border/20 space-y-1.5">
                      <p className="text-sm font-semibold">
                        vs {c.challengerId === pid ? c.challengedRiotId : c.challengerRiotId ?? "Opponent"}
                      </p>
                      {c.scheduledTime && (
                        <p className="text-xs text-muted-foreground">{new Date(c.scheduledTime).toLocaleString()}</p>
                      )}
                      {c.gameId ? (
                        <p className="text-xs text-green-400">✓ Room ready — Game ID: {c.gameId}</p>
                      ) : isHost ? (
                        <div>
                          <p className="text-xs text-yellow-400">You are room host. Open a custom game and submit the Game ID.</p>
                          <GameIdSubmit challengeId={c.id} />
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Waiting for host to submit Game ID...</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── NOTIFICATION SETTINGS ──────────────────────────────────────── */}
      <div className="rounded-xl border border-border/30 bg-card/40 p-5">
        <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Notification Settings</h2>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { value: "web",     label: "Web only"       },
            { value: "email",   label: "Email"          },
            { value: "discord", label: "Discord DM"     },
            { value: "both",    label: "Email + Discord" },
          ].map((opt) => (
            <label key={opt.value} className={`flex items-center gap-2 text-sm cursor-pointer px-3 py-2.5 rounded-lg border transition-colors ${
              currentNotifPref === opt.value
                ? `${rank.border} ${rank.bg} ${rank.text}`
                : "border-border/30 text-muted-foreground hover:border-border/60"
            }`}>
              <input type="radio" name="notifPref" value={opt.value}
                checked={currentNotifPref === opt.value}
                onChange={() => setNotifPref(opt.value)}
                className="accent-primary" />
              {opt.label}
            </label>
          ))}
        </div>
        <Button size="sm" onClick={handleSaveNotif} disabled={updatePlayer.isPending}>
          {updatePlayer.isPending ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}

export default function PlayerDashboard() {
  const [playerId, setPlayerId] = useState<string | null>(() =>
    localStorage.getItem("vclol_player_id")
  );
  useEffect(() => {
    const sync = () => setPlayerId(localStorage.getItem("vclol_player_id"));
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("focus", sync); };
  }, []);

  if (!playerId) return <PublicLayout><LoggedOutState /></PublicLayout>;
  return <PublicLayout><DashboardContent pid={Number(playerId)} /></PublicLayout>;
}
