import PublicLayout from "@/components/layout/PublicLayout";
import { useGetMatch, useListSeasons, useGetMatchPlayers, useGetPlayerById, useClaimTeamForMatch, getGetMatchQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, PlayCircle, Video, Users, Download, Eye, EyeOff, FileVideo, Clock, CheckCircle2, AlertCircle, Loader2, ShieldAlert, Info, X, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { champPortraitUrl, itemIconUrl } from "@/lib/lol-utils";
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

function bracketRoundLabel(
  round: number | null | undefined,
  bracketSlot: number | null | undefined,
  bracketSize: number | null | undefined,
  isLosersBracket: boolean | null | undefined
): string | null {
  if (round == null) return null;

  let label: string;

  if (bracketSize && bracketSize >= 2) {
    const totalRounds = Math.ceil(Math.log2(bracketSize));
    const roundsFromFinal = totalRounds - round;

    if (roundsFromFinal <= 0) label = "Grand Final";
    else if (roundsFromFinal === 1) label = "Semi Final";
    else if (roundsFromFinal === 2) label = "Quarter Final";
    else label = `Round of ${Math.pow(2, roundsFromFinal + 1)}`;
  } else {
    switch (round) {
      case 1: label = "Quarter Final"; break;
      case 2: label = "Semi Final"; break;
      case 3: label = "Grand Final"; break;
      default: label = `Round ${round}`; break;
    }
  }

  if (isLosersBracket) label = `Losers ${label}`;
  if (bracketSlot != null) label += ` · Match ${bracketSlot}`;

  return label;
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
  const [showExplainer, setShowExplainer] = useState(!isLoggedIn);
  const [povRequesting, setPovRequesting] = useState(false);
  const [povStatus, setPovStatus] = useState<{ exists: boolean; status?: string; submittedAt?: string } | null>(null);
  const [povStatusLoading, setPovStatusLoading] = useState(false);
  const [visUpdating, setVisUpdating] = useState(false);
  const [claimingSide, setClaimingSide] = useState<"A" | "B" | null>(null);
  const queryClient = useQueryClient();
  const claimMutation = useClaimTeamForMatch();

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
          <Link href="/matches" className="text-primary hover:underline text-sm mt-2 inline-block">← Back to Matches</Link>
        </div>
      </PublicLayout>
    );
  }

  const seasonName = match.seasonId ? seasons?.find((s) => s.id === match.seasonId)?.name : null;
  const sideAWon = match.winnerName === match.sideAName;
  const sideBWon = match.winnerName === match.sideBName;
  const roundLabel = match.isPlayoff ? bracketRoundLabel(match.round, match.bracketSlot, match.bracketSize, match.isLosersBracket) : null;

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
        body: JSON.stringify({ visibility, playerId: playerIdNum }),
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

  const captainTeams = (playerProfile?.teams ?? []).filter((t: any) => t.isCaptain);
  const sideAUnregistered = match.teamAId == null;
  const sideBUnregistered = match.teamBId == null;
  const canClaimA = sideAUnregistered && captainTeams.length > 0;
  const canClaimB = sideBUnregistered && captainTeams.length > 0;

  const handleClaim = async (side: "A" | "B", teamId: number) => {
    setClaimingSide(side);
    try {
      await claimMutation.mutateAsync({ id: matchId, data: { teamId } });
      queryClient.invalidateQueries({ queryKey: getGetMatchQueryKey(matchId) });
      toast.success("Match claimed for your team!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to claim match");
    }
    setClaimingSide(null);
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
        <Link href="/matches" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" /> Matches
        </Link>

        {showExplainer && !isLoggedIn && (
          <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3">
            <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">What is VCLoL?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                VCLoL is a competitive 5v5 scrim platform. Teams submit replay files, and match results are automatically parsed and tracked — including ELO, champion picks, KDA, and more.
              </p>
              <div className="flex gap-3 mt-2">
                <Link href="/about" className="text-xs text-primary hover:underline">Learn more</Link>
                <Link href="/register" className="text-xs text-primary hover:underline">Join VCLoL</Link>
              </div>
            </div>
            <button onClick={() => setShowExplainer(false)} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold mb-3">{match.matchTitle}</h1>
          <div className="flex flex-wrap gap-2">
            {match.format && <Badge variant="outline">{match.format}</Badge>}
            {match.isPlayoff && <Badge className="bg-primary/20 text-primary border-primary/30">Playoff</Badge>}
            {roundLabel && <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30">{roundLabel}</Badge>}
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
          <div className="flex items-center justify-center gap-4 sm:gap-8 py-4">
            <div className="flex-1 text-right min-w-0">
              <div className={`text-lg sm:text-xl font-display font-bold truncate ${sideAWon ? "text-primary" : ""}`}>
                {match.teamAId ? (
                  <Link href={`/teams/${match.teamAId}`} className="hover:text-primary/80 transition-colors">
                    {match.sideAName}
                  </Link>
                ) : match.sideAName}
              </div>
              {match.teamATag && <div className="text-xs text-muted-foreground">[{match.teamATag}]</div>}
              {sideAWon && <div className="flex items-center justify-end gap-1 mt-1"><Trophy className="w-4 h-4 text-primary" /></div>}
            </div>
            <div className="text-center shrink-0 px-2">
              <div className="text-4xl sm:text-5xl font-display font-bold tracking-widest text-foreground">
                {match.score || "—"}
              </div>
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className={`text-lg sm:text-xl font-display font-bold truncate ${sideBWon ? "text-primary" : ""}`}>
                {match.teamBId ? (
                  <Link href={`/teams/${match.teamBId}`} className="hover:text-primary/80 transition-colors">
                    {match.sideBName}
                  </Link>
                ) : match.sideBName}
              </div>
              {match.teamBTag && <div className="text-xs text-muted-foreground">[{match.teamBTag}]</div>}
              {sideBWon && <div className="flex items-center gap-1 mt-1"><Trophy className="w-4 h-4 text-primary" /></div>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className={`p-3 rounded-xl border text-center ${sideAWon ? "border-primary/20 bg-primary/5" : "border-border/40 bg-card/30"}`}>
              <EloDelta before={match.teamAEloBefore} after={match.teamAEloAfter} />
              {sideAUnregistered && (
                <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 text-[10px] mt-1">
                  <ShieldAlert className="w-3 h-3 mr-1" /> Unregistered
                </Badge>
              )}
              {canClaimA && (
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] text-muted-foreground">Captains: link your team to this side for ELO tracking</p>
                  {captainTeams.length === 1 ? (
                    <button
                      onClick={() => handleClaim("A", captainTeams[0].teamId)}
                      disabled={claimingSide === "A"}
                      className="text-xs px-3 py-1 rounded border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                      {claimingSide === "A" ? "Claiming..." : `Claim as ${captainTeams[0].teamName}`}
                    </button>
                  ) : (
                    <select
                      onChange={(e) => e.target.value && handleClaim("A", Number(e.target.value))}
                      disabled={claimingSide === "A"}
                      className="text-xs px-2 py-1 rounded border border-primary/30 bg-primary/10 text-primary"
                      defaultValue=""
                    >
                      <option value="" disabled>Claim this side...</option>
                      {captainTeams.map((t: any) => (
                        <option key={t.teamId} value={t.teamId}>{t.teamName}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
            <div className={`p-3 rounded-xl border text-center ${sideBWon ? "border-primary/20 bg-primary/5" : "border-border/40 bg-card/30"}`}>
              <EloDelta before={match.teamBEloBefore} after={match.teamBEloAfter} />
              {sideBUnregistered && (
                <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 text-[10px] mt-1">
                  <ShieldAlert className="w-3 h-3 mr-1" /> Unregistered
                </Badge>
              )}
              {canClaimB && (
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] text-muted-foreground">Captains: link your team to this side for ELO tracking</p>
                  {captainTeams.length === 1 ? (
                    <button
                      onClick={() => handleClaim("B", captainTeams[0].teamId)}
                      disabled={claimingSide === "B"}
                      className="text-xs px-3 py-1 rounded border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                      {claimingSide === "B" ? "Claiming..." : `Claim as ${captainTeams[0].teamName}`}
                    </button>
                  ) : (
                    <select
                      onChange={(e) => e.target.value && handleClaim("B", Number(e.target.value))}
                      disabled={claimingSide === "B"}
                      className="text-xs px-2 py-1 rounded border border-primary/30 bg-primary/10 text-primary"
                      defaultValue=""
                    >
                      <option value="" disabled>Claim this side...</option>
                      {captainTeams.map((t: any) => (
                        <option key={t.teamId} value={t.teamId}>{t.teamName}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {roflAvailable && (
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a href={`${API_BASE}/api/matches/${matchId}/replay`} download>
                <Download className="w-4 h-4" />
                Download .rofl
                <span className="text-xs text-muted-foreground ml-1">({roflDaysLeft}d left)</span>
              </a>
            </Button>
          </div>
        )}

        {teamAPlayers.length === 0 && teamBPlayers.length === 0 && match.visibleAfter && (() => {
          const visDate = new Date(match.visibleAfter);
          const isPermanentPrivate = visDate.getFullYear() >= 9000;
          const isFuture = visDate.getTime() > Date.now();
          if (!isPermanentPrivate && !isFuture) return null;
          return (
            <Card className="bg-card/40 border-border/40 mb-6">
              <CardContent className="py-8 text-center">
                <EyeOff className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                {isPermanentPrivate ? (
                  <>
                    <p className="text-sm font-medium mb-1">Stats are private</p>
                    <p className="text-xs text-muted-foreground">Contact the team captain for access.</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium mb-1">
                      Stats available {visDate.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-xs text-muted-foreground">This match has a visibility delay. Check back later.</p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })()}

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
                      <th className="px-4 py-2 hidden lg:table-cell">Items</th>
                      {(vods.length > 0 || currentPlayerInMatch) && <th className="px-4 py-2 w-10">VOD</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {teamAPlayers.length > 0 && (
                      <tr className="bg-blue-400/5 border-b border-border/30">
                        <td colSpan={(vods.length > 0 || currentPlayerInMatch) ? 9 : 8} className="px-4 py-1.5 text-xs font-semibold text-blue-400">
                          {match.sideAName} {sideAWon ? "(WIN)" : "(LOSS)"}
                        </td>
                      </tr>
                    )}
                    {teamAPlayers.map((p) => {
                      const items = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].filter((id): id is number => id != null && id > 0);
                      const playerVod = vods.find(v => v.playerId === p.playerId);
                      const isSelf = isLoggedIn && p.playerId === playerIdNum;
                      return (
                      <tr key={p.id} className={`border-b border-border/20 hover:bg-muted/20 ${isSelf ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}>
                        <td className="px-4 py-2">
                          {p.playerRiotId ? (
                            <Link href={`/players/${encodeURIComponent(p.playerRiotId)}`} className="text-primary hover:underline text-xs">
                              {p.playerRiotId}
                            </Link>
                          ) : <span className="text-xs text-muted-foreground">Player #{p.playerId}</span>}
                          {p.teamPosition && <div className="text-[10px] text-muted-foreground">{p.teamPosition}</div>}
                        </td>
                        <td className="px-4 py-2">
                          {p.champion ? (
                            <div className="flex items-center gap-1.5">
                              <img src={champPortraitUrl(p.champion)} alt={p.champion} className="w-6 h-6 rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              <span className="text-xs">{p.champion}</span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">-</span>}
                        </td>
                        <td className="px-4 py-2 text-xs font-medium">
                          <span className="text-green-400">{p.kills}</span>/<span className="text-red-400">{p.deaths}</span>/<span className="text-blue-400">{p.assists}</span>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground hidden sm:table-cell">{p.cs + p.neutralCs}</td>
                        <td className="px-4 py-2 text-xs text-yellow-400 hidden sm:table-cell">{(p.gold / 1000).toFixed(1)}k</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground hidden md:table-cell">{(p.damageToChampions / 1000).toFixed(1)}k</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground hidden md:table-cell">{p.visionScore}</td>
                        <td className="px-4 py-2 hidden lg:table-cell">
                          {items.length > 0 ? (
                            <div className="flex gap-0.5">
                              {items.map((itemId, idx) => (
                                <img
                                  key={idx}
                                  src={itemIconUrl(itemId)}
                                  alt={`Item ${itemId}`}
                                  className="w-5 h-5 rounded-sm"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ))}
                            </div>
                          ) : <span className="text-xs text-muted-foreground">-</span>}
                        </td>
                        {(vods.length > 0 || currentPlayerInMatch) && (
                          <td className="px-4 py-2 text-center">
                            {playerVod ? (
                              <Link href={`/watch/${playerVod.id}`} className="text-primary hover:text-primary/80 transition-colors" title="Watch POV">
                                <FileVideo className="w-4 h-4 inline-block" />
                              </Link>
                            ) : isSelf ? (
                              povStatusLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground inline-block" />
                              ) : povStatus?.exists && povStatus.status === "pending" ? (
                                <span title="POV Requested — Processing"><Clock className="w-4 h-4 text-yellow-400 inline-block" /></span>
                              ) : povStatus?.exists && povStatus.status === "done" ? (
                                <span title="POV Ready"><CheckCircle2 className="w-4 h-4 text-green-400 inline-block" /></span>
                              ) : povStatus?.exists && povStatus.status === "failed" ? (
                                <button onClick={handlePovRequest} disabled={povRequesting} title="POV Failed — Retry" className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50">
                                  <AlertCircle className="w-4 h-4 inline-block" />
                                </button>
                              ) : (
                                <button onClick={handlePovRequest} disabled={povRequesting} title="Request My POV" className="text-primary hover:text-primary/80 transition-colors disabled:opacity-50">
                                  {povRequesting ? <Loader2 className="w-4 h-4 animate-spin inline-block" /> : <FileVideo className="w-4 h-4 inline-block" />}
                                </button>
                              )
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                        )}
                      </tr>
                      );
                    })}
                    {teamBPlayers.length > 0 && (
                      <tr className="bg-red-400/5 border-b border-border/30">
                        <td colSpan={(vods.length > 0 || currentPlayerInMatch) ? 9 : 8} className="px-4 py-1.5 text-xs font-semibold text-red-400">
                          {match.sideBName} {sideBWon ? "(WIN)" : "(LOSS)"}
                        </td>
                      </tr>
                    )}
                    {teamBPlayers.map((p) => {
                      const items = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].filter((id): id is number => id != null && id > 0);
                      const playerVod = vods.find(v => v.playerId === p.playerId);
                      const isSelf = isLoggedIn && p.playerId === playerIdNum;
                      return (
                      <tr key={p.id} className={`border-b border-border/20 hover:bg-muted/20 ${isSelf ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}>
                        <td className="px-4 py-2">
                          {p.playerRiotId ? (
                            <Link href={`/players/${encodeURIComponent(p.playerRiotId)}`} className="text-primary hover:underline text-xs">
                              {p.playerRiotId}
                            </Link>
                          ) : <span className="text-xs text-muted-foreground">Player #{p.playerId}</span>}
                          {p.teamPosition && <div className="text-[10px] text-muted-foreground">{p.teamPosition}</div>}
                        </td>
                        <td className="px-4 py-2">
                          {p.champion ? (
                            <div className="flex items-center gap-1.5">
                              <img src={champPortraitUrl(p.champion)} alt={p.champion} className="w-6 h-6 rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              <span className="text-xs">{p.champion}</span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">-</span>}
                        </td>
                        <td className="px-4 py-2 text-xs font-medium">
                          <span className="text-green-400">{p.kills}</span>/<span className="text-red-400">{p.deaths}</span>/<span className="text-blue-400">{p.assists}</span>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground hidden sm:table-cell">{p.cs + p.neutralCs}</td>
                        <td className="px-4 py-2 text-xs text-yellow-400 hidden sm:table-cell">{(p.gold / 1000).toFixed(1)}k</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground hidden md:table-cell">{(p.damageToChampions / 1000).toFixed(1)}k</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground hidden md:table-cell">{p.visionScore}</td>
                        <td className="px-4 py-2 hidden lg:table-cell">
                          {items.length > 0 ? (
                            <div className="flex gap-0.5">
                              {items.map((itemId, idx) => (
                                <img
                                  key={idx}
                                  src={itemIconUrl(itemId)}
                                  alt={`Item ${itemId}`}
                                  className="w-5 h-5 rounded-sm"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ))}
                            </div>
                          ) : <span className="text-xs text-muted-foreground">-</span>}
                        </td>
                        {(vods.length > 0 || currentPlayerInMatch) && (
                          <td className="px-4 py-2 text-center">
                            {playerVod ? (
                              <Link href={`/watch/${playerVod.id}`} className="text-primary hover:text-primary/80 transition-colors" title="Watch POV">
                                <FileVideo className="w-4 h-4 inline-block" />
                              </Link>
                            ) : isSelf ? (
                              povStatusLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground inline-block" />
                              ) : povStatus?.exists && povStatus.status === "pending" ? (
                                <span title="POV Requested — Processing"><Clock className="w-4 h-4 text-yellow-400 inline-block" /></span>
                              ) : povStatus?.exists && povStatus.status === "done" ? (
                                <span title="POV Ready"><CheckCircle2 className="w-4 h-4 text-green-400 inline-block" /></span>
                              ) : povStatus?.exists && povStatus.status === "failed" ? (
                                <button onClick={handlePovRequest} disabled={povRequesting} title="POV Failed — Retry" className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50">
                                  <AlertCircle className="w-4 h-4 inline-block" />
                                </button>
                              ) : (
                                <button onClick={handlePovRequest} disabled={povRequesting} title="Request My POV" className="text-primary hover:text-primary/80 transition-colors disabled:opacity-50">
                                  {povRequesting ? <Loader2 className="w-4 h-4 animate-spin inline-block" /> : <FileVideo className="w-4 h-4 inline-block" />}
                                </button>
                              )
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                        )}
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {vods.length > 0 && (() => {
          const hasGameNumbers = vods.some((v) => v.gameNumber != null && v.gameNumber > 0);

          function vodTypeLabel(vod: typeof vods[number]): { label: string; style: string } {
            const vt = vod.vodType;
            if (vt === "spectator") return { label: "Spectator", style: "bg-primary/20 text-primary border-primary/30" };
            if (vt === "team-pov") return { label: "Team POV", style: "bg-green-400/20 text-green-400 border-green-400/30" };
            if (vt === "player-pov") return { label: "Player POV", style: "bg-blue-400/20 text-blue-400 border-blue-400/30" };
            return vod.playerId
              ? { label: "Player POV", style: "bg-blue-400/20 text-blue-400 border-blue-400/30" }
              : { label: "Spectator", style: "bg-primary/20 text-primary border-primary/30" };
          }

          function renderVodCard(vod: typeof vods[number]) {
            const vid = extractYouTubeId(vod.videoUrl);
            const { label: typeLabel, style: typeStyle } = vodTypeLabel(vod);
            return (
              <Link key={vod.id} href={`/watch/${vod.id}`} className="group block">
                <div className="rounded-lg overflow-hidden border border-border/40 bg-black aspect-video relative">
                  {vid ? (
                    <img
                      src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`}
                      alt={vod.title}
                      className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/20">
                      <PlayCircle className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                      <PlayCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <Badge className={`absolute top-2 left-2 text-[10px] ${typeStyle}`}>
                    {typeLabel}
                  </Badge>
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{vod.title}</p>
                  <div className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                    {vod.playerRiotId && <span className="text-primary/80">{vod.playerRiotId}</span>}
                    {vod.champion && <span>{vod.champion}</span>}
                    {vod.position && <span>• {vod.position}</span>}
                  </div>
                </div>
              </Link>
            );
          }

          if (!hasGameNumbers) {
            return (
              <Card className="bg-card/40 border-border/40 mb-6">
                <CardHeader>
                  <CardTitle className="text-base font-display flex items-center gap-2">
                    <Video className="w-4 h-4 text-primary" /> VODs ({vods.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vods.map(renderVodCard)}
                  </div>
                </CardContent>
              </Card>
            );
          }

          const gameMap = new Map<number, typeof vods>();
          const ungrouped: typeof vods = [];
          for (const vod of vods) {
            if (vod.gameNumber != null && vod.gameNumber > 0) {
              const arr = gameMap.get(vod.gameNumber) ?? [];
              arr.push(vod);
              gameMap.set(vod.gameNumber, arr);
            } else {
              ungrouped.push(vod);
            }
          }
          const sortedGames = [...gameMap.entries()].sort((a, b) => a[0] - b[0]);

          return (
            <Card className="bg-card/40 border-border/40 mb-6">
              <CardHeader>
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Video className="w-4 h-4 text-primary" /> VODs ({vods.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {sortedGames.map(([gameNum, gameVods]) => (
                  <div key={gameNum}>
                    <h3 className="text-sm font-display font-semibold text-muted-foreground mb-3">Game {gameNum}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {gameVods.map(renderVodCard)}
                    </div>
                  </div>
                ))}
                {ungrouped.length > 0 && (
                  <div>
                    {sortedGames.length > 0 && (
                      <h3 className="text-sm font-display font-semibold text-muted-foreground mb-3">Other</h3>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ungrouped.map(renderVodCard)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

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
