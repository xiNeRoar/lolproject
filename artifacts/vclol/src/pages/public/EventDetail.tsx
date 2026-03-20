import PublicLayout from "@/components/layout/PublicLayout";
import { useGetEvent, useListRegistrations } from "@workspace/api-client-react";
import type { Match } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { MatchList } from "@/components/brackets/MatchList";
import { SingleEliminationBracket } from "@/components/brackets/SingleEliminationBracket";
import { DoubleEliminationBracket } from "@/components/brackets/DoubleEliminationBracket";
import { RoundRobinTable } from "@/components/brackets/RoundRobinTable";
import { SwissRoundsTable } from "@/components/brackets/SwissRoundsTable";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, cn } from "@/lib/utils";
import { Trophy, Video, Calendar, AlertCircle, Users } from "lucide-react";

function EventMatches({ format, matches }: { format: string | null | undefined; matches: Match[] }) {
  if (format === "Single Elimination") return <SingleEliminationBracket matches={matches} />;
  if (format === "Double Elimination") return <DoubleEliminationBracket matches={matches} />;
  if (format === "Round Robin") return <RoundRobinTable matches={matches} />;
  if (format === "Swiss") return <SwissRoundsTable matches={matches} />;
  return <MatchList matches={matches} />;
}

export default function EventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: event, isLoading, error } = useGetEvent(slug);
  const { data: registrations } = useListRegistrations(event?.id ? { eventId: event.id } : undefined);

  if (isLoading) return <PublicLayout><div className="p-16 text-center text-muted-foreground animate-pulse">Loading event...</div></PublicLayout>;
  if (error || !event) return <PublicLayout><div className="p-16 text-center text-destructive">Event not found.</div></PublicLayout>;

  const isOpen = event.registrationStatus === 'open';

  return (
    <PublicLayout>
      <div className="bg-card/30 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex gap-3 mb-6">
            <Badge variant="outline" className="border-primary text-primary">{event.format}</Badge>
            <Badge variant={isOpen ? "default" : "secondary"}>{event.registrationStatus.toUpperCase()}</Badge>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-4">{event.title}</h1>
          <div className="flex items-center gap-2 text-lg text-muted-foreground">
            <Calendar className="w-5 h-5" />
            {formatDate(event.eventDate)}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-12">
          
          <section>
            <h2 className="text-2xl font-display font-semibold mb-4 border-b border-border pb-2">Overview</h2>
            <p className="text-lg text-muted-foreground whitespace-pre-wrap">{event.shortDescription}</p>
            {event.fullDescription && (
              <div className="mt-6 text-muted-foreground whitespace-pre-wrap prose prose-invert max-w-none">
                {event.fullDescription}
              </div>
            )}
          </section>

          {/* Participants */}
          <section>
            <h2 className="text-2xl font-display font-semibold mb-4 border-b border-border pb-2 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Participants ({registrations?.length ?? 0})
            </h2>
            {!registrations?.length ? (
              <p className="text-muted-foreground text-sm">No registrations yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {registrations.map((r) => {
                  const chip = (
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 border border-border/40 text-sm",
                      r.riotId && "hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
                    )}>
                      <span className="font-medium">{r.riotId ?? "Unknown"}</span>
                      {r.status && r.status !== "registered" && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">{r.status}</Badge>
                      )}
                    </div>
                  );
                  return r.riotId ? (
                    <Link key={r.id} href={`/players/${encodeURIComponent(r.riotId)}`}>{chip}</Link>
                  ) : (
                    <div key={r.id}>{chip}</div>
                  );
                })}
              </div>
            )}
          </section>

          {event.rulesSummary && (
            <section>
              <h2 className="text-2xl font-display font-semibold mb-4 border-b border-border pb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-primary" /> Rules Summary
              </h2>
              <div className="bg-card/50 p-6 rounded-lg border border-border/50 text-muted-foreground whitespace-pre-wrap">
                {event.rulesSummary}
              </div>
            </section>
          )}

          {/* Related Matches */}
          <section>
            <h2 className="text-2xl font-display font-semibold mb-4 border-b border-border pb-2 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" /> Match Results
            </h2>
            <EventMatches format={event.format} matches={event.matches ?? []} />
          </section>

          {/* Related VODs */}
          {event.vods && event.vods.length > 0 && (
            <section>
              <h2 className="text-2xl font-display font-semibold mb-4 border-b border-border pb-2 flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" /> Event VODs
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {event.vods.map(v => (
                  <Link key={v.id} href={`/vods/${v.id}`} className="block">
                    <Card className="hover:border-primary/50 transition-colors h-full bg-card/40">
                      <CardContent className="p-4">
                        <div className="font-semibold mb-2">{v.title}</div>
                        <div className="text-xs text-primary">{v.videoUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar / Participate */}
        <div>
          <div className="sticky top-24">
            <Card className="border-primary/20 shadow-lg shadow-black/50">
              <CardContent className="p-6">
                <h3 className="text-xl font-display font-bold mb-2">Participate</h3>
                {!isOpen ? (
                  <div className="bg-secondary/50 p-4 rounded text-center text-sm text-muted-foreground">
                    Registration for this event is currently closed.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      To register for this event, you must be a registered VCLoL player.
                    </p>
                    <Link href="/register">
                      <Button className="w-full">Add Bot to Discord →</Button>
                    </Link>
                    <p className="text-xs text-muted-foreground text-center">
                      Already registered? Contact admin via Discord to be added to this event.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
