import PublicLayout from "@/components/layout/PublicLayout";
import { useGetMatch, useListSeasons } from "@workspace/api-client-react";
import { Link, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Video } from "lucide-react";

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

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: match, isLoading, isError } = useGetMatch(Number(id));
  const { data: seasons } = useListSeasons();

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="max-w-3xl mx-auto px-4 pt-20 pb-16 animate-pulse">
          <div className="h-48 bg-card rounded-xl mb-6" />
          <div className="h-48 bg-card rounded-xl" />
        </div>
      </PublicLayout>
    );
  }

  if (isError || !match) {
    return (
      <PublicLayout>
        <div className="max-w-3xl mx-auto px-4 pt-20 pb-16 text-center">
          <p className="text-muted-foreground">Match not found.</p>
          <Link href="/" className="text-primary hover:underline text-sm mt-2 inline-block">
            ← Back to Home
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const seasonName = match.seasonId
    ? seasons?.find((s) => s.id === match.seasonId)?.name
    : null;

  const sideAWon = match.winnerName === match.sideAName;
  const sideBWon = match.winnerName === match.sideBName;

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 pt-12 pb-16 sm:px-6">
        <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>

        {/* Title + badges */}
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold mb-3">{match.matchTitle}</h1>
          <div className="flex flex-wrap gap-2">
            {match.format && <Badge variant="outline">{match.format}</Badge>}
            {match.isPlayoff && <Badge className="bg-primary/20 text-primary border-primary/30">Playoff</Badge>}
          </div>
        </div>

        {/* Score */}
        {match.score && (
          <div className="text-center mb-8">
            <span className="text-4xl font-display font-bold tracking-widest">{match.score}</span>
          </div>
        )}

        {/* Players */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Side A */}
          <div className={`p-5 rounded-xl border text-center ${sideAWon ? "border-primary bg-primary/5" : "border-border/40 bg-card/30"}`}>
            {sideAWon && (
              <div className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">Winner</div>
            )}
            <div className="text-lg font-display font-bold mb-1">
              {match.playerARiotId ? (
                <Link
                  href={`/players/${encodeURIComponent(match.playerARiotId)}`}
                  className="hover:text-primary transition-colors"
                >
                  {match.sideAName}
                </Link>
              ) : (
                match.sideAName
              )}
            </div>
            <EloDelta before={match.playerAEloBefore} after={match.playerAEloAfter} />
          </div>

          {/* Side B */}
          <div className={`p-5 rounded-xl border text-center ${sideBWon ? "border-primary bg-primary/5" : "border-border/40 bg-card/30"}`}>
            {sideBWon && (
              <div className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">Winner</div>
            )}
            <div className="text-lg font-display font-bold mb-1">
              {match.playerBRiotId ? (
                <Link
                  href={`/players/${encodeURIComponent(match.playerBRiotId)}`}
                  className="hover:text-primary transition-colors"
                >
                  {match.sideBName}
                </Link>
              ) : (
                match.sideBName
              )}
            </div>
            <EloDelta before={match.playerBEloBefore} after={match.playerBEloAfter} />
          </div>
        </div>

        {/* Meta */}
        <div className="space-y-3 text-sm text-muted-foreground border-t border-border/40 pt-6">
          {match.eventTitle && match.eventSlug && (
            <div className="flex items-center gap-2">
              <span className="text-foreground/60">Event:</span>
              <Link href={`/events/${match.eventSlug}`} className="text-primary hover:underline">
                {match.eventTitle}
              </Link>
            </div>
          )}
          {seasonName && (
            <div className="flex items-center gap-2">
              <span className="text-foreground/60">Season:</span>
              <span>{seasonName}</span>
            </div>
          )}
          {match.vodUrl && (
            <div className="flex items-center gap-2 pt-2">
              <a href={match.vodUrl} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline">
                  <Video className="w-4 h-4 mr-2" /> Watch VOD →
                </Button>
              </a>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
