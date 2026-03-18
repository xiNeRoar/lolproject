import PublicLayout from "@/components/layout/PublicLayout";
import { useGetMatch, useListSeasons } from "@workspace/api-client-react";
import { Link, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, PlayCircle, Video } from "lucide-react";

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

function BackButton() {
  return (
    <button
      onClick={() => window.history.back()}
      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
    >
      <ChevronLeft className="w-4 h-4" /> Back
    </button>
  );
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

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: match, isLoading, isError } = useGetMatch(Number(id));
  const { data: seasons } = useListSeasons();

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 animate-pulse">
          <div className="h-12 bg-card rounded mb-6 w-32" />
          <div className="h-48 bg-card rounded-xl mb-6" />
          <div className="aspect-video bg-card rounded-xl" />
        </div>
      </PublicLayout>
    );
  }

  if (isError || !match) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
          <p className="text-muted-foreground">Match not found.</p>
          <button
            onClick={() => window.history.back()}
            className="text-primary hover:underline text-sm mt-2 inline-block"
          >
            ← Back
          </button>
        </div>
      </PublicLayout>
    );
  }

  const seasonName = match.seasonId
    ? seasons?.find((s) => s.id === match.seasonId)?.name
    : null;

  const sideAWon = match.winnerName === match.sideAName;
  const sideBWon = match.winnerName === match.sideBName;
  const videoId = extractYouTubeId(match.vodUrl);

  const isSeries = match.format
    ? /bo\d|best.of/i.test(match.format)
    : false;

  const roundLabel = match.isPlayoff ? bracketRoundLabel(match.round, match.bracketSlot) : null;

  const vods = (match as any).vods as Array<{
    id: number; title: string; videoUrl?: string | null; playerRiotId?: string | null;
    champion?: string | null; opponentChampion?: string | null; position?: string | null;
  }> | undefined;

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-16 sm:px-6 lg:px-8">
        <BackButton />

        {/* Title + badges */}
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold mb-3">{match.matchTitle}</h1>
          <div className="flex flex-wrap gap-2">
            {match.format && <Badge variant="outline">{match.format}</Badge>}
            {match.isPlayoff && <Badge className="bg-primary/20 text-primary border-primary/30">Playoff</Badge>}
            {roundLabel && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{roundLabel}</Badge>
            )}
            {seasonName && <Badge variant="secondary">{seasonName}</Badge>}
            {match.eventTitle && match.eventSlug && (
              <Link href={`/events/${match.eventSlug}`}>
                <Badge variant="outline" className="hover:border-primary/50 cursor-pointer">
                  {match.eventTitle}
                </Badge>
              </Link>
            )}
          </div>
        </div>

        {/* Players + Score */}
        <div className="mb-8">
          {isSeries ? (
            <div className="flex items-stretch gap-4">
              <div className={`flex-1 p-5 rounded-xl border text-center ${sideAWon ? "border-primary bg-primary/5" : "border-border/40 bg-card/30"}`}>
                {sideAWon && <div className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">Winner</div>}
                <div className="text-lg font-display font-bold mb-1">
                  {match.playerARiotId ? (
                    <Link href={`/players/${encodeURIComponent(match.playerARiotId)}`} className="hover:text-primary transition-colors">
                      {match.sideAName}
                    </Link>
                  ) : match.sideAName}
                </div>
                <EloDelta before={match.playerAEloBefore} after={match.playerAEloAfter} />
              </div>

              <div className="flex flex-col items-center justify-center px-4 shrink-0">
                {match.score ? (
                  <span className="text-4xl font-display font-bold tracking-widest">{match.score}</span>
                ) : (
                  <span className="text-muted-foreground text-sm">vs</span>
                )}
              </div>

              <div className={`flex-1 p-5 rounded-xl border text-center ${sideBWon ? "border-primary bg-primary/5" : "border-border/40 bg-card/30"}`}>
                {sideBWon && <div className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">Winner</div>}
                <div className="text-lg font-display font-bold mb-1">
                  {match.playerBRiotId ? (
                    <Link href={`/players/${encodeURIComponent(match.playerBRiotId)}`} className="hover:text-primary transition-colors">
                      {match.sideBName}
                    </Link>
                  ) : match.sideBName}
                </div>
                <EloDelta before={match.playerBEloBefore} after={match.playerBEloAfter} />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className={`p-5 rounded-xl border text-center ${sideAWon ? "border-primary bg-primary/5" : "border-border/40 bg-card/30"}`}>
                  {sideAWon && <div className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">Winner</div>}
                  <div className="text-lg font-display font-bold mb-1">
                    {match.playerARiotId ? (
                      <Link href={`/players/${encodeURIComponent(match.playerARiotId)}`} className="hover:text-primary transition-colors">
                        {match.sideAName}
                      </Link>
                    ) : match.sideAName}
                  </div>
                  <EloDelta before={match.playerAEloBefore} after={match.playerAEloAfter} />
                </div>
                <div className={`p-5 rounded-xl border text-center ${sideBWon ? "border-primary bg-primary/5" : "border-border/40 bg-card/30"}`}>
                  {sideBWon && <div className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">Winner</div>}
                  <div className="text-lg font-display font-bold mb-1">
                    {match.playerBRiotId ? (
                      <Link href={`/players/${encodeURIComponent(match.playerBRiotId)}`} className="hover:text-primary transition-colors">
                        {match.sideBName}
                      </Link>
                    ) : match.sideBName}
                  </div>
                  <EloDelta before={match.playerBEloBefore} after={match.playerBEloAfter} />
                </div>
              </div>
              {match.score && (
                <div className="text-center">
                  <span className="text-3xl font-display font-bold tracking-widest">{match.score}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Embedded VOD (legacy vodUrl) */}
        {videoId ? (
          <div className="mb-8 rounded-xl overflow-hidden border border-border/40 bg-black aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={match.matchTitle}
            />
          </div>
        ) : match.vodUrl ? (
          <div className="mb-8 p-4 rounded-xl border border-border/40 bg-card/30 text-sm text-muted-foreground">
            VOD:{" "}
            <a href={match.vodUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              {match.vodUrl}
            </a>
          </div>
        ) : null}

        {/* VODs from replay pipeline */}
        {vods && vods.length > 0 && (
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
      </div>
    </PublicLayout>
  );
}
