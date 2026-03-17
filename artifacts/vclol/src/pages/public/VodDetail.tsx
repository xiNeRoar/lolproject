import PublicLayout from "@/components/layout/PublicLayout";
import { useGetVod } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ExternalLink, Video, ChevronLeft } from "lucide-react";
import { Link, useParams } from "wouter";

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function buildTimestampUrl(videoUrl: string | null | undefined, seconds: number): string {
  if (!videoUrl) return "#";
  // Append YouTube-compatible timestamp; use &t= if query string already exists
  const separator = videoUrl.includes("?") ? "&" : "?";
  return `${videoUrl}${separator}t=${seconds}`;
}

export default function VodDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: vod, isLoading, isError } = useGetVod(Number(id));

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

  if (isError || !vod) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
          <p className="text-muted-foreground">VOD not found.</p>
          <Link href="/vods" className="text-primary hover:underline text-sm mt-2 inline-block">
            Back to VODs
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-16 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Link href="/vods" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to VODs
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
              {vod.playerEloAtTime != null && (
                <span className="text-xs ml-2">({vod.playerEloAtTime} ELO at time)</span>
              )}
            </p>
          )}
          {vod.notes && (
            <p className="text-sm text-muted-foreground mt-2 italic">{vod.notes}</p>
          )}
        </div>

        {/* Watch button — external link only, no iframe embedding */}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timestamps */}
          <Card className="bg-card/40 border-border/40">
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Clock className="w-4 h-4" /> Timestamps
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!vod.timestamps?.length ? (
                <div className="px-6 py-6 text-center text-muted-foreground text-sm">
                  No timestamps added yet.
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {vod.timestamps.map((ts) => (
                    <a
                      key={ts.id}
                      href={buildTimestampUrl(vod.videoUrl, ts.seconds)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 px-6 py-3 hover:bg-muted/20 transition-colors"
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
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related VODs */}
          <Card className="bg-card/40 border-border/40">
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Video className="w-4 h-4" /> Related VODs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!vod.relatedVods?.length ? (
                <div className="px-6 py-6 text-center text-muted-foreground text-sm">
                  No related VODs found.
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {vod.relatedVods.map((related) => (
                    <Link key={related.id} href={`/vods/${related.id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/20 transition-colors cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{related.title}</div>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {related.champion && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                              {related.champion}{related.opponentChampion ? ` vs ${related.opponentChampion}` : ""}
                            </span>
                          )}
                          {related.playerEloAtTime != null && (
                            <span className="text-xs text-muted-foreground">ELO {related.playerEloAtTime}</span>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
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
