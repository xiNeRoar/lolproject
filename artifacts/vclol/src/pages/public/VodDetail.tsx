import PublicLayout from "@/components/layout/PublicLayout";
import { useGetVod } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, PlayCircle, Video, ChevronLeft, EyeOff } from "lucide-react";
import { Link, useParams } from "wouter";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: { onReady?: (e: { target: YTPlayer }) => void };
        }
      ) => YTPlayer;
      loaded: number;
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  destroy(): void;
}

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
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

function YouTubePlayer({
  videoId,
  playerRef,
}: {
  videoId: string;
  playerRef: React.MutableRefObject<YTPlayer | null>;
}) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let player: YTPlayer | null = null;

    function initPlayer() {
      if (!divRef.current) return;
      player = new window.YT.Player(divRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: (e) => {
            playerRef.current = e.target;
          },
        },
      });
    }

    if (window.YT && window.YT.loaded) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
      }
    }

    return () => {
      playerRef.current = null;
      player?.destroy();
    };
  }, [videoId]);

  return (
    <div className="mb-6 rounded-xl overflow-hidden border border-border/40 bg-black aspect-video">
      <div ref={divRef} className="w-full h-full" />
    </div>
  );
}

export default function VodDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: vod, isLoading, isError, error } = useGetVod(Number(id));
  const playerRef = useRef<YTPlayer | null>(null);

  const videoId = extractYouTubeId(vod?.videoUrl);

  function seekTo(seconds: number) {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds, true);
      playerRef.current.playVideo();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 animate-pulse">
          <div className="h-64 bg-card rounded-xl mb-6" />
          <div className="h-48 bg-card rounded-xl" />
        </div>
      </PublicLayout>
    );
  }

  const isPrivacyGated = isError && (error as any)?.status === 403;

  if (isPrivacyGated) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
          <EyeOff className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-display font-semibold mb-2">This VOD is not available</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
            This replay is restricted by the team captain or requires player consent to view.
          </p>
          <Link href="/watch" className="text-primary hover:underline text-sm inline-block">
            ← Back to Watch
          </Link>
        </div>
      </PublicLayout>
    );
  }

  if (isError || !vod) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
          <p className="text-muted-foreground">VOD not found.</p>
          <Link href="/watch" className="text-primary hover:underline text-sm mt-2 inline-block">
            ← Back to Watch
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-16 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Link href="/watch" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" /> Watch
        </Link>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-display font-bold mb-3">{vod.title}</h1>
          <div className="flex flex-wrap gap-2 items-center">
            {vod.eventTitle && <Badge variant="outline">{vod.eventTitle}</Badge>}
            {vod.format && <Badge variant="secondary">{vod.format}</Badge>}
            {vod.champion && (
              <Badge className="bg-primary/20 text-primary border-primary/30">
                {vod.champion}{vod.opponentChampion ? ` vs ${vod.opponentChampion}` : ""}
              </Badge>
            )}
            {vod.position && <Badge variant="outline">{vod.position}</Badge>}
            {vod.patch && <span className="text-xs text-muted-foreground">Patch {vod.patch}</span>}
          </div>
          {vod.playerRiotId && (
            <p className="text-sm text-muted-foreground mt-2">
              Player:{" "}
              <Link
                href={`/players/${encodeURIComponent(vod.playerRiotId)}`}
                className="text-primary hover:underline"
              >
                {vod.playerRiotId}
              </Link>
            </p>
          )}
          {vod.notes && (
            <p className="text-sm text-muted-foreground mt-2 italic">{vod.notes}</p>
          )}
          {/* Link back to match */}
          {vod.matchId && (
            <p className="text-sm text-muted-foreground mt-2">
              Match:{" "}
              <Link href={`/matches/${vod.matchId}`} className="text-primary hover:underline">
                View Match #{vod.matchId} →
              </Link>
            </p>
          )}
        </div>

        {/* YouTube embed (IFrame API) or fallback external link */}
        {videoId ? (
          <YouTubePlayer videoId={videoId} playerRef={playerRef} />
        ) : (
          <div className="mb-6">
            <a
              href={vod.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <Video className="w-5 h-5" /> Watch VOD
            </a>
          </div>
        )}

        <div className={`grid grid-cols-1 ${vod.timestamps?.length && vod.relatedVods?.length ? "lg:grid-cols-2" : ""} gap-6`}>
          {vod.timestamps && vod.timestamps.length > 0 && (
            <Card className="bg-card/40 border-border/40">
              <CardHeader>
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Timestamps
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/30">
                  {vod.timestamps.map((ts) => (
                    <button
                      key={ts.id}
                      onClick={() => seekTo(ts.seconds)}
                      className="w-full flex items-center gap-3 px-6 py-3 hover:bg-muted/20 transition-colors text-left"
                    >
                      <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0">
                        {formatSeconds(ts.seconds)}
                      </span>
                      <span className="text-sm flex-1">{ts.label}</span>
                      {ts.type !== "manual" && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                          {ts.type}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related VODs */}
          {vod.relatedVods && vod.relatedVods.length > 0 && (
            <Card className="bg-card/40 border-border/40">
              <CardHeader>
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Video className="w-4 h-4" /> Related VODs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/30">
                  {vod.relatedVods.map((related) => (
                    <Link key={related.id} href={`/watch/${related.id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/20 transition-colors cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{related.title}</div>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {related.champion && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                              {related.champion}{related.opponentChampion ? ` vs ${related.opponentChampion}` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <PlayCircle className="w-3 h-3 text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
