import PublicLayout from "@/components/layout/PublicLayout";
import { useGetTeam } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, ChevronLeft, Swords, UserMinus, Settings } from "lucide-react";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function TeamProfile() {
  const { id } = useParams<{ id: string }>();
  const teamId = Number(id);
  const { playerIdNum } = useAuth();
  const { data: team, isLoading, isError } = useGetTeam(teamId);
  const isCaptain = team?.captainPlayerId === playerIdNum;

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

  if (isError || !team) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
          <p className="text-muted-foreground">Team not found.</p>
          <Link href="/teams" className="text-primary hover:underline text-sm mt-2 inline-block">
            ← Back to Ranking
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const winRate = team.wins + team.losses > 0
    ? Math.round((team.wins / (team.wins + team.losses)) * 100)
    : 0;

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-16 sm:px-6 lg:px-8">
        <Link
          href="/teams"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Ranking
        </Link>

        <Card className="bg-card/40 border-border/40 mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-2xl font-display font-bold text-primary flex-shrink-0">
                {team.tag.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="text-3xl font-display font-bold">{team.name}</h1>
                  <span className="text-lg text-muted-foreground">[{team.tag}]</span>
                  {!team.isActive && (
                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                  )}
                </div>
                {isCaptain && (
                  <Link href={`/teams/${teamId}/manage`}>
                    <Button variant="outline" size="sm" className="text-xs gap-1.5 mt-2">
                      <Settings className="w-3.5 h-3.5" /> Manage Team
                    </Button>
                  </Link>
                )}
              </div>

              <div className="flex gap-6 flex-shrink-0">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                    <Trophy className="w-3 h-3" /> Record
                  </div>
                  <div className="text-3xl font-display font-bold">
                    <span className="text-green-400">{team.wins}</span>
                    <span className="text-muted-foreground mx-1">-</span>
                    <span className="text-red-400">{team.losses}</span>
                  </div>
                </div>
                {team.wins + team.losses > 0 && (
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Win Rate</div>
                    <div className="text-3xl font-display font-bold text-primary">{winRate}%</div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 border-t border-border/40 pt-5">
              <div className="flex items-center divide-x divide-border/40">
                <div className="flex-1 text-center px-4 py-1">
                  <div className="text-xl font-display font-bold text-green-400">{team.wins}</div>
                  <div className="text-xs text-muted-foreground mt-1">Wins</div>
                </div>
                <div className="flex-1 text-center px-4 py-1">
                  <div className="text-xl font-display font-bold text-red-400">{team.losses}</div>
                  <div className="text-xs text-muted-foreground mt-1">Losses</div>
                </div>
                <div className="flex-1 text-center px-4 py-1">
                  <div className="text-xl font-display font-bold">{winRate}%</div>
                  <div className="text-xs text-muted-foreground mt-1">Win Rate</div>
                </div>
              </div>
              {team.wins + team.losses > 0 && (
                <div className="mt-4 space-y-1.5">
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-border/30">
                    <div className="bg-green-400/70 transition-all" style={{ width: `${winRate}%` }} />
                    <div className="bg-red-400/70 flex-1" />
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    {team.wins + team.losses} games played
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {(() => {
          const currentMembers = team.members?.filter(m => m.status === "active") ?? [];
          const pastMembers = team.members?.filter(m => m.status !== "active") ?? [];

          const renderMemberRow = (m: NonNullable<typeof team.members>[number]) => (
            <div key={m.id} className="px-6 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                {m.playerRiotId ? (
                  <Link href={`/players/${encodeURIComponent(m.playerRiotId)}`} className="text-sm font-medium hover:text-primary transition-colors">
                    {m.playerRiotId}
                  </Link>
                ) : (
                  <span className="text-sm font-medium">Player #{m.playerId}</span>
                )}
                {m.playerDiscordUsername && (
                  <div className="text-xs text-muted-foreground">{m.playerDiscordUsername}</div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {m.playerId === team.captainPlayerId && (
                  <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 text-xs">Captain</Badge>
                )}
                {m.role && (
                  <Badge variant="outline" className="text-xs">{m.role}</Badge>
                )}
              </div>
            </div>
          );

          return (
            <>
              <Card className="bg-card/40 border-border/40 mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <Users className="w-4 h-4" /> Current Roster
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {currentMembers.length === 0 ? (
                    <div className="px-6 py-8 text-center text-muted-foreground text-sm">No active members.</div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {currentMembers.map(renderMemberRow)}
                    </div>
                  )}
                </CardContent>
              </Card>

              {pastMembers.length > 0 && (
                <Card className="bg-card/40 border-border/40 mb-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-display flex items-center gap-2 text-muted-foreground">
                      <UserMinus className="w-4 h-4" /> Past Members
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/30 opacity-70">
                      {pastMembers.map(renderMemberRow)}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          );
        })()}

        {team.recentMatches && team.recentMatches.length > 0 && (
          <Card className="bg-card/40 border-border/40 mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-display flex items-center gap-2"><Swords className="w-4 h-4 text-primary" /> Recent Matches</CardTitle>
                <Link href={`/matches?teamId=${teamId}`} className="text-xs text-primary hover:underline">View All →</Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                {team.recentMatches.map((match) => {
                  const isA = match.teamAId === teamId;
                  const won = match.winnerName === (isA ? match.sideAName : match.sideBName);
                  const oppName = isA ? match.sideBName : match.sideAName;
                  return (
                    <Link key={match.id} href={`/matches/${match.id}`} className="block px-6 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors cursor-pointer">
                      <span className={`w-8 h-8 rounded shrink-0 flex items-center justify-center text-xs font-bold ${won ? "bg-green-400/20 text-green-400" : "bg-red-400/20 text-red-400"}`}>
                        {won ? "W" : "L"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">vs {oppName}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span>{new Date(match.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</span>
                          <span className="w-1 h-1 rounded-full bg-border inline-block" />
                          {match.matchTitle}
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
            </CardContent>
          </Card>
        )}

      </div>
    </PublicLayout>
  );
}
