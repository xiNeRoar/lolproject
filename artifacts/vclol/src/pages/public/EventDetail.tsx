import PublicLayout from "@/components/layout/PublicLayout";
import { useGetEvent, useCreateRegistration } from "@workspace/api-client-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Trophy, Video, Calendar, AlertCircle } from "lucide-react";

function EventMatches({ format, matches }: { format: string | null | undefined; matches: Match[] }) {
  if (format === "Single Elimination") return <SingleEliminationBracket matches={matches} />;
  if (format === "Double Elimination") return <DoubleEliminationBracket matches={matches} />;
  if (format === "Round Robin") return <RoundRobinTable matches={matches} />;
  if (format === "Swiss") return <SwissRoundsTable matches={matches} />;
  return <MatchList matches={matches} />;
}

const regSchema = z.object({
  riotId: z.string().min(1, "Required"),
  discordUsername: z.string().min(1, "Required"),
  currentRank: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  availabilityConfirmation: z.string().min(1, "Required"),
  notes: z.string().optional(),
});

type RegFormValues = z.infer<typeof regSchema>;

export default function EventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: event, isLoading, error } = useGetEvent(slug);
  const registerMutation = useCreateRegistration();
  const [registered, setRegistered] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegFormValues>({
    resolver: zodResolver(regSchema)
  });

  if (isLoading) return <PublicLayout><div className="p-16 text-center text-muted-foreground animate-pulse">Loading event...</div></PublicLayout>;
  if (error || !event) return <PublicLayout><div className="p-16 text-center text-destructive">Event not found.</div></PublicLayout>;

  const isOpen = event.registrationStatus === 'open';

  const onSubmit = (data: RegFormValues) => {
    registerMutation.mutate({ data: { ...data, eventId: event.id } }, {
      onSuccess: () => setRegistered(true)
    });
  };

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
                  <a key={v.id} href={v.videoUrl} target="_blank" rel="noreferrer" className="block">
                    <Card className="hover:border-primary/50 transition-colors h-full bg-card/40">
                      <CardContent className="p-4">
                        <div className="font-semibold mb-2">{v.title}</div>
                        <div className="text-xs text-primary">{v.videoUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</div>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar / Registration */}
        <div>
          <div className="sticky top-24">
            <Card className="border-primary/20 shadow-lg shadow-black/50">
              <CardContent className="p-6">
                <h3 className="text-xl font-display font-bold mb-2">Registration</h3>
                
                {!isOpen ? (
                  <div className="bg-secondary/50 p-4 rounded text-center text-sm text-muted-foreground">
                    Registration for this event is currently closed.
                  </div>
                ) : registered ? (
                  <div className="bg-primary/10 text-primary p-4 rounded text-center">
                    <p className="font-semibold mb-1">Registration Complete</p>
                    <p className="text-sm">You are registered for this event. Monitor Discord for updates.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
                    <div>
                      <Input placeholder="Riot ID (Name#Tag)" {...register("riotId")} className="bg-background" />
                      {errors.riotId && <p className="text-xs text-destructive mt-1">{errors.riotId.message}</p>}
                    </div>
                    <div>
                      <Input placeholder="Discord Username" {...register("discordUsername")} className="bg-background" />
                    </div>
                    <div>
                      <Input placeholder="Current Rank" {...register("currentRank")} className="bg-background" />
                    </div>
                    <div>
                      <Input placeholder="City / Area" {...register("city")} className="bg-background" />
                    </div>
                    <div>
                      <Textarea placeholder="Confirm your availability for the event dates/times" {...register("availabilityConfirmation")} className="bg-background h-20" />
                      {errors.availabilityConfirmation && <p className="text-xs text-destructive mt-1">{errors.availabilityConfirmation.message}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? "Submitting..." : "Register Now"}
                    </Button>
                    {registerMutation.isError && <p className="text-xs text-destructive text-center">Failed to register.</p>}
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
