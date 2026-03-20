import PublicLayout from "@/components/layout/PublicLayout";
import { useGetMatch, useListSeasons, useGetMatchPlayers, useGetPlayerById } from "@workspace/api-client-react";
import { Link, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, PlayCircle, Video, Users, Download, Eye, EyeOff, FileVideo, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "";

function EloDelta({ before, after }: { before: number | null | undefined; after: number | null | undefined }) {
  if (before == null || after == null) return null;
  const delta = after - before;
  return (
    <div className="text-xs mt-0.5">
      <span className="text-muted-foreground">{before} → {after}</span>{" "}
      <span className={delta >= 0 ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
        {delta >= 0 ? `+${delta}` : delta}
      </span>
    </div>
  );
}

function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
  } catch {
    return null;
  }
  return null;
}

function bracketRoundLabel(round: number | null | undefined, bracketSlot: number | null | undefined): string | null {
  if (round == null) return null;
  switch (round) {
    case 1: return "Quarter Final";
    case 2: return "Semi Final";
    case 3: return "Grand Final";
    default: return `Round ${round}${bracketSlot != null ? ` · Match ${bracketSlot}` : ""}`;
  }
}

function isWithinTwoWeeks(dateStr: string): boolean {
  const created = new Date(dateStr).getTime();
  const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
  return Date.now() - created < twoWeeksMs;
}

function daysRemaining(dateStr: string): number {
  const created = new Date(dateStr).getTime();
  const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
  const remaining = twoWeeksMs - (Date.now() - created);
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const matchId = Number(id);
  const { data: match, isLoading, isError, refetch } = useGetMatch(matchId);
  const { data: seasons } = useListSeasons();
  const { data: matchPlayers } = useGetMatchPlayers(matchId, { query: { enabled: !!match } });
  const { playerIdNum, isLoggedIn } = useAuth();
  const { data: playerProfile } = useGetPlayerById(playerIdNum, { query: { enabled: isLoggedIn && playerIdNum > 0 } });
  const [povRequesting, setPovRequesting] = useState(false);
  const [povStatus, setPovStatus] = useState<{ exists: boolean; status?: string; submittedAt?: string } | null>(null);
  const [povStatusLoading, setPovStatusLoading] = useState(false);
  const [visUpdating, setVisUpdating] = useState(false);

  const teamAPlayers = (matchPlayers ?? []).filter((p) => p.teamSide === "blue" || p.teamSide === "A");
  const teamBPlayers = (matchPlayers ?? []).filter((p) => p.teamSide === "red" || p.teamSide === "B");
  const allPlayers = [...teamAPlayers, ...teamBPlayers];
  const currentPlayerInMatch = allPlayers.find((p) => p.playerId === playerIdNum);

  useEffect(() => {
    if (!isLoggedIn || !currentPlayerInMatch || !playerIdNum) return;
    setPovStatusLoading(true);
    fetch(`${API_BASE}/api/replays/status?matchId=${matchId}&playerId=${playerIdNum}`)
      .then(r => r.json())
      .then(data => setPovStatus(data))
      .catch(() => setPovStatus(null))
      .finally(() => setPovStatusLoading(false));
  }, [isLoggedIn, matchId, playerIdNum, !!currentPlayerInMatch]);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 animate-pulse">
          <div className="h-12 bg-card rounded mb-6 w-32" />
          <div className="h-48 bg-card rounded-xl mb-6" />
        </div>
      </PublicLayout>
    );
  }

  if (isError || !match) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
          <p className="text-muted-foreground">Match not found.</p>
          <button onClick={() => window.history.back()} className="text-primary hover:underline text-sm mt-2 inline-block">← Back</button>
        </div>
      </PublicLayout>
    );
  }

  const seasonName = match.seasonId ? seasons?.find((s) => s.id === match.seasonId)?.name : null;
  const sideAWon = match.winnerName === match.sideAName;
  const sideBWon = match.winnerName === match.sideBName;
  const roundLabel = match.isPlayoff ? bracketRoundLabel(match.round, match.bracketSlot) : null;

  const vods = match.vods ?? [];
  const roflAvailable = !!(match as any).roflFilePath && isWithinTwoWeeks(match.createdAt);
  const roflDaysLeft = roflAvailable ? daysRemaining(match.createdAt) : 0;

  const isCaptainOfMatch = !!playerProfile?.teams?.some(
    (t) => (t.teamId === match.teamAId || t.teamId === match.teamBId) && t.isCaptain
  );
  const canChangeVisibility = isLoggedIn && isCaptainOfMatch;


  const handlePovRequest = async () => {
    if (!currentPlayerInMatch) return;
    if (povStatus?.exists && povStatus.status === "pending") {
      toast.info("You already have a pending POV request for this match.");
      return;
    }
    setPovRequesting(true);
    try {
      const res = await fetch(`${API_BASE}/api/replays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          matchId,
          playerId: playerIdNum,
          renderMode: "pov",
        }),
      });
      if (res.ok) {
        toast.success("POV render requested! Check back here for updates.");
        setPovStatus({ exists: true, status: "pending" });
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to request POV render.");
      }
    } catch {
      toast.error("Failed to request POV render.");
    } finally {
      setPovRequesting(false);
    }
  };

  const handleVisibilityChange = async (visibility: "public" | "private" | "default") => {
    setVisUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/api/matches/${matchId}/visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ visibility }),
      });
      if (res.ok) {
        toast.success(`Match visibility set to ${visibility}.`);
        refetch();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to update visibility.");
      }
    } catch {
      toast.error("Failed to update visibility.");
    } finally {
      setVisUpdating(false);
    }
  };

  const currentVisibility = match.visibleAfter
    ? new Date(match.visibleAfter).getTime() <= 0
      ? "public"
      : new Date(match.visibleAfter).getFullYear() >= 9000
        ? "private"
        : "default"
    : "default";

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-16 sm:px-6 lg:px-8">
        <button onClick={() => window.history.back()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold mb-3">{match.matchTitle}</h1>
          <div className="flex flex-wrap gap-2">
            {match.format && <Badge variant="outline">{match.format}</Badge>}
            {match.isPlayoff && <Badge className="bg-primary/20 text-primary border-primary/30">Playoff</Badge>}
            {roundLabel && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{roundLabel}</Badge>}
            {seasonName && <Badge variant="secondary">{seasonName}</Badge>}
            {match.eventTitle && match.eventSlug && (
              <Link href={`/events/${match.eventSlug}`}>
                <Badge variant="outline" className="hover:border-primary/50 cursor-pointer">{match.eventTitle}</Badge>
              </Link>
            )}
            {match.gameVersion && <Badge variant="outline" className="text-xs">Patch {match.gameVersion}</Badge>}
            {match.gameDuration != null && match.gameDuration > 0 && (
              <Badge variant="outline" className="text-xs">
                {Math.floor(match.gameDuration / 60000)}:{String(Math.floor((match.gameDuration % 60000) / 1000)).padStart(2, "0")}
              </Badge>
            )}
          </div>
        </div>

        <div className="mb-8">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className={`p-5 rounded-xl border text-center ${sideAWon ? "border-primary bg-primary/5" : "border-border/40 bg-card/30"}`}>
              {sideAWon && <div className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">Winner</div>}
              <div className="text-lg font-display font-bold mb-1">
                {match.teamAId ? (
                  <Link href={`/teams/${match.teamAId}`} className="hover:text-primary transition-colors">
                    {match.sideAName}
                  </Link>
                ) : match.sideAName}
              </div>
              {match.teamATag && <div className="text-xs text-muted-foreground">[{match.teamATag}]</div>}
              <EloDelta before={match.teamAEloBefore} after={match.teamAEloAfter} />
            </div>
            <div className={`p-5 rounded-xl border text-center ${sideBWon ? "border-primary bg-primary/5" : "border-border/40 bg-card/30"}`}>
              {sideBWon && <div className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">Winner</div>}
              <div className="text-lg font-display font-bold mb-1">
                {match.teamBId ? (
                  <Link href={`/teams/${match.teamBId}`} className="hover:text-primary transition-colors">
                    {match.sideBName}
                  </Link>
                ) : match.sideBName}
              </div>
              {match.teamBTag && <div className="text-xs text-muted-foreground">[{match.teamBTag}]</div>}
              <EloDelta before={match.teamBEloBefore} after={match.teamBEloAfter} />
            </div>
          </div>
          {match.score && (
            <div className="text-center">
              <span className="text-3xl font-display font-bold tracking-widest">{match.score}</span>
            </div>
          )}
        </div>

        {(roflAvailable || (isLoggedIn && currentPlayerInMatch)) && (
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {roflAvailable && (
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href={`${API_BASE}/api/matches/${matchId}/replay`} download>
                  <Download className="w-4 h-4" />
                  Download .rofl
                  <span className="text-xs text-muted-foreground ml-1">({roflDaysLeft}d left)</span>
                </a>
              </Button>
            )}
            {isLoggedIn && currentPlayerInMatch && (
              <>
                {povStatusLoading ? (
                  <Button variant="outline" size="sm" className="gap-2" disabled>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking...
                  </Button>
                ) : povStatus?.exists && povStatus.status === "pending" ? (
                  <Button variant="outline" size="sm" className="gap-2 border-yellow-400/30 text-yellow-400" disabled>
                    <Clock className="w-4 h-4" />
                    POV Requested — Processing
                  </Button>
                ) : povStatus?.exists && povStatus.status === "done" ? (
                  <Button variant="outline" size="sm" className="gap-2 border-green-400/30 text-green-400" disabled>
                    <CheckCircle2 className="w-4 h-4" />
                    POV Ready — Check VODs below
                  </Button>
                ) : povStatus?.exists && povStatus.status === "failed" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-red-400/30 text-red-400"
                    onClick={handlePovRequest}
                    disabled={povRequesting}
                  >
                    <AlertCircle className="w-4 h-4" />
                    {povRequesting ? "Requesting..." : "POV Failed — Retry"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handlePovRequest}
                    disabled={povRequesting}
                  >
                    <FileVideo className="w-4 h-4" />
                    {povRequesting ? "Requesting..." : "Request My POV"}
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {(teamAPlayers.length > 0 || teamBPlayers.length > 0) && (
          <Card className="bg-card/40 border-border/40 mb-6">
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Player Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
                    <tr>
                      <th className="px-4 py-2">Player</th>
                      <th className="px-4 py-2">Champion</th>
                      <th className="px-4 py-2">K/D/A</th>
                      <th className="px-4 py-2 hidden sm:table-cell">CS</th>
                      <th className="px-4 py-2 hidden sm:table-cell">Gold</th>
                      <th className="px-4 py-2 hidden md:table-cell">Dmg</th>
                      <th className="px-4 py-2 hidden md:table-cell">Vision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamAPlayers.length > 0 && (
                      <tr className="bg-blue-500/5 border-b border-border/30">
                        <td colSpan={7} className="px-4 py-1.5 text-xs font-semibold text-blue-400">
                          {match.sideAName} {sideAWon ? "(WIN)" : "(LOSS)"}
                        </td>
                      </tr>
                    )}
                    {teamAPlayers.map((p) => (
                      <tr key={p.id} className="border-b border-border/20 hover:bg-muted/20">
                        <td className="px-4 py-2">
                          {p.playerRiotId ? (
                            <Link href={`/players/${encodeURIComponent(p.playerRiotId)}`} className="text-primary hover:underline text-xs">
                              {p.playerRiotId}
                            </Link>
                          ) : <span className="text-xs text-muted-foreground">Player #{p.playerId}</span>}
                          {p.teamPosition && <div className="text-[10px] text-muted-foreground">{p.teamPosition}</div>}
                        </td>
                        <td className="px-4 py-2 text-xs">{p.champion || "-"}</td>
                        <td className="px-4 py-2 text-xs font-medium">
                          <span className="text-green-400">{p.kills}</span>/<span className="text-red-400">{p.deaths}</span>/<span className="text-blue-400">{p.assists}</span>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground hidden sm:table-cell">{p.cs + p.neutralCs}</td>
                        <td className="px-4 py-2 text-xs text-yellow-400 hidden sm:table-cell">{(p.gold / 1000).toFixed(1)}k</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground hidden md:table-cell">{(p.damageToChampions / 1000).toFixed(1)}k</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground hidden md:table-cell">{p.visionScore}</td>
                      </tr>
                    ))}
                    {teamBPlayers.length > 0 && (
                      <tr className="bg-red-500/5 border-b border-border/30">
                        <td colSpan={7} className="px-4 py-1.5 text-xs font-semibold text-red-400">
                          {match.sideBName} {sideBWon ? "(WIN)" : "(LOSS)"}
                        </td>
                      </tr>
                    )}
                    {teamBPlayers.map((p) => (
                      <tr key={p.id} className="border-b border-border/20 hover:bg-muted/20">
                        <td className="px-4 py-2">
                          {p.playerRiotId ? (
                            <Link href={`/players/${encodeURIComponent(p.playerRiotId)}`} className="text-primary hover:underline text-xs">
                              {p.playerRiotId}
                            </Link>
                          ) : <span className="text-xs text-muted-foreground">Player #{p.playerId}</span>}
                          {p.teamPosition && <div className="text-[10px] text-muted-foreground">{p.teamPosition}</div>}
                        </td>
                        <td className="px-4 py-2 text-xs">{p.champion || "-"}</td>
                        <td className="px-4 py-2 text-xs font-medium">
                          <span className="text-green-400">{p.kills}</span>/<span className="text-red-400">{p.deaths}</span>/<span className="text-blue-400">{p.assists}</span>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground hidden sm:table-cell">{p.cs + p.neutralCs}</td>
                        <td className="px-4 py-2 text-xs text-yellow-400 hidden sm:table-cell">{(p.gold / 1000).toFixed(1)}k</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground hidden md:table-cell">{(p.damageToChampions / 1000).toFixed(1)}k</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground hidden md:table-cell">{p.visionScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {vods.length > 0 && (
          <Card className="bg-card/40 border-border/40 mb-6">
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Video className="w-4 h-4 text-primary" /> VODs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                {vods.map((vod) => {
                  const vid = extractYouTubeId(vod.videoUrl);
                  return (
                    <div key={vod.id} className="px-6 py-4">
                      {vid && (
                        <div className="mb-3 rounded-lg overflow-hidden border border-border/40 bg-black aspect-video">
                          <iframe
                            src={`https://www.youtube.com/embed/${vid}?rel=0&modestbranding=1`}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={vod.title}
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        {!vid && <PlayCircle className="w-5 h-5 text-muted-foreground shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <Link href={`/vods/${vod.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                            {vod.title}
                          </Link>
                          <div className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                            {vod.playerRiotId && (
                              <Link href={`/players/${encodeURIComponent(vod.playerRiotId)}`} className="text-primary/80 hover:text-primary">
                                {vod.playerRiotId}
                              </Link>
                            )}
                            {vod.champion && <span>{vod.champion}{vod.opponentChampion ? ` vs ${vod.opponentChampion}` : ""}</span>}
                            {vod.position && <span>• {vod.position}</span>}
                          </div>
                        </div>
                        {vod.videoUrl && !vid && (
                          <a href={vod.videoUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline shrink-0">
                            Watch →
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {canChangeVisibility && (
          <Card className="bg-card/40 border-border/40 mb-6">
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                {currentVisibility === "private" ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-primary" />}
                Match Visibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                {currentVisibility === "public" && "This match is publicly visible."}
                {currentVisibility === "private" && "This match is hidden from public view."}
                {currentVisibility === "default" && "This match follows the default 7-day delay before becoming public."}
              </p>
              <div className="flex gap-2">
                <Button
                  variant={currentVisibility === "public" ? "default" : "outline"}
                  size="sm"
                  disabled={visUpdating || currentVisibility === "public"}
                  onClick={() => handleVisibilityChange("public")}
                >
                  Public
                </Button>
                <Button
                  variant={currentVisibility === "default" ? "default" : "outline"}
                  size="sm"
                  disabled={visUpdating || currentVisibility === "default"}
                  onClick={() => handleVisibilityChange("default")}
                >
                  Default (7d)
                </Button>
                <Button
                  variant={currentVisibility === "private" ? "default" : "outline"}
                  size="sm"
                  disabled={visUpdating || currentVisibility === "private"}
                  onClick={() => handleVisibilityChange("private")}
                >
                  Private
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                As team captain, you can control when this match becomes publicly visible.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PublicLayout>
  );
}
