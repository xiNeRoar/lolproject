import PublicLayout from "@/components/layout/PublicLayout";
import { useListEvents } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Calendar } from "lucide-react";

const DD = "https://ddragon.leagueoflegends.com";

function getEventBanner(format: string): string {
  const f = format.toLowerCase();
  if (f.includes("house") || f.includes("5v5") || f.includes("team") || f.includes("scrim")) return `${DD}/cdn/img/champion/splash/Orianna_0.jpg`;
  if (f.includes("elimination") || f.includes("swiss") || f.includes("robin") || f.includes("knockout")) return `${DD}/cdn/img/champion/splash/Jinx_0.jpg`;
  return `${DD}/cdn/img/champion/splash/Caitlyn_0.jpg`;
}

export default function Events() {
  const { data: events, isLoading, error } = useListEvents();

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 pt-16 pb-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-display font-bold mb-2">Events</h1>
        <p className="text-muted-foreground mb-10">Upcoming and past tournaments, brackets, and in-houses.</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-16 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-72 bg-card rounded-lg" />)}
          </div>
        ) : error ? (
          <div className="text-destructive p-8 bg-destructive/10 rounded-lg">Failed to load events.</div>
        ) : events?.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-lg">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-medium mb-2">No Events Found</h3>
            <p className="text-muted-foreground">Check back later for new event announcements.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {events?.map((event) => {
              const isClosed = event.registrationStatus === 'closed';
              const bannerSrc = getEventBanner(event.format);

              return (
                <Card key={event.id} className="flex flex-col overflow-hidden bg-card/40 hover:bg-card/80 transition-colors border-border/50 hover:border-primary/30">
                  {/* Format-specific banner image */}
                  <div className="relative overflow-hidden flex-shrink-0" style={{ height: '150px' }}>
                    <img
                      src={bannerSrc}
                      alt={event.format}
                      className="w-full h-full object-cover"
                      style={{ opacity: 0.9 }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card/95 via-card/20 to-transparent" />
                    <div className="absolute bottom-3 left-4 flex gap-2">
                      <Badge variant="outline" className="border-primary/60 text-primary bg-background/70 backdrop-blur-sm">
                        {event.format}
                      </Badge>
                      <Badge
                        variant={isClosed ? "secondary" : "default"}
                        className={`backdrop-blur-sm ${isClosed ? "opacity-70" : ""}`}
                      >
                        {event.registrationStatus.charAt(0).toUpperCase() + event.registrationStatus.slice(1)}
                      </Badge>
                    </div>
                    <div className="absolute bottom-3 right-4 text-sm font-medium text-foreground/80 drop-shadow">
                      {formatDate(event.eventDate)}
                    </div>
                  </div>

                  {/* Card body */}
                  <CardContent className="flex-1 flex flex-col p-6">
                    <h3 className="text-xl font-bold font-display mb-2">{event.title}</h3>
                    <p className="text-muted-foreground mb-6 flex-1 line-clamp-3">{event.shortDescription}</p>
                    <div className="pt-4 border-t border-border/40 mt-auto">
                      <Link href={`/events/${event.slug}`}>
                        <Button variant={isClosed ? "outline" : "default"} className="w-full">
                          {isClosed ? "View Results & VODs" : "View Details & Register"}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
