import PublicLayout from "@/components/layout/PublicLayout";
import {
  useGetPlayer, useGetPlayerBadges, useListSeasonChampions,
  useGetPlayerEvents, useGetPlayerChampions,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, ExternalLink } from "lucide-react";
import { Link, useParams } from "wouter";
import { champPortraitUrl, BADGE_META } from "@/lib/lol-utils";

export default function PlayerProfile() {
  const { riotId } = useParams<{ riotId: string }>();
  const { data: player, isLoading, isError } = useGetPlayer(riotId ?? "");
  const { data: badges }        = useGetPlayerBadges(player?.id ?? 0,    { query: { enabled: !!player?.id } });
  const { data: seasonChamps }  = useListSeasonChampions(                { query: { enabled: !!player?.id } });
  const { data: playerEvents }  = useGetPlayerEvents(player?.id ?? 0,    { query: { enabled: !!player?.id } });
  const { data: championStats } = useGetPlayerChampions(player?.id ?? 0, { query: { enabled: !!player?.id } });

  const myChampionships = seasonChamps?.filter((c) => c.teamId && player?.id) ?? [];

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
                      <span key={c.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-medium">
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
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {badges && badges.length > 0 && (
          <Card className="bg-card/40 border-border/40 mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display">Badges</CardTitle>
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

        {championStats && championStats.length > 0 && (
          <Card className="bg-card/40 border-border/40 mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display">Champion Pool</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-5">
                {championStats.map(({ champion, games }, i) => (
                  <div key={champion} className="flex flex-col items-center gap-2">
                    <div className={`w-14 h-14 rounded-full overflow-hidden border-2 flex-shrink-0 ${i === 0 ? "border-primary/50" : "border-border/40"}`}>
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
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                        Main
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {playerEvents && playerEvents.length > 0 && (
          <Card className="bg-card/40 border-border/40 mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display">Events</CardTitle>
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
              <CardTitle className="text-base font-display">Recent Matches</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!player.recentMatches?.length ? (
                <div className="px-6 py-8 text-center text-muted-foreground text-sm">No matches recorded yet.</div>
              ) : (
                <div className="divide-y divide-border/30">
                  {player.recentMatches.map((match) => {
                    const won = match.winnerName === match.sideAName || match.winnerName === match.sideBName;
                    return (
                      <Link key={match.id} href={`/matches/${match.id}`} className="block px-6 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{match.matchTitle}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
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
              <CardTitle className="text-base font-display">VODs</CardTitle>
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
    </PublicLayout>
  );
}
