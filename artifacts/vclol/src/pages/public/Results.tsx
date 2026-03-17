import PublicLayout from "@/components/layout/PublicLayout";
import { useListMatches, useListEvents } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink } from "lucide-react";

import { useState } from "react";

export default function Results() {
  const [search, setSearch] = useState("");
  const [eventId, setEventId] = useState<number | undefined>();
  
  const { data: matches, isLoading } = useListMatches(
    (search || eventId) ? { search: search || undefined, eventId } : undefined
  );
  const { data: events } = useListEvents();

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 pt-16 pb-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-display font-bold mb-2">Match Results</h1>
        <p className="text-muted-foreground mb-10">Archive of all recorded official matches.</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8 bg-card/30 p-4 rounded-lg border border-border/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Search players or teams..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <div className="w-full md:w-64">
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={eventId || ""}
              onChange={(e) => setEventId(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">All Events</option>
              {events?.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-card rounded-lg" />)}
          </div>
        ) : matches?.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">No matches found matching your filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches?.map((match) => (
              <Card key={match.id} className="bg-card/40 border-border/40 hover:bg-card/60 transition-colors">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Event Info Sidebar */}
                    <div className="bg-card/60 p-4 md:w-48 flex flex-col justify-center border-b md:border-b-0 md:border-r border-border/40">
                      {match.format && <Badge variant="outline" className="w-fit mb-2">{match.format}</Badge>}
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{match.eventTitle || 'Exhibition'}</span>
                      <span className="text-sm font-medium mt-1">{match.matchTitle}</span>
                    </div>
                    
                    {/* Match Score */}
                    <div className="p-6 flex-1 flex items-center justify-between">
                      <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-8">
                        
                        <div className={`text-lg font-medium ${match.winnerName === match.sideAName ? 'text-primary font-bold' : ''}`}>
                          {match.sideAName}
                        </div>
                        
                        <div className="flex flex-col items-center justify-center shrink-0 min-w-24">
                          <span className="text-xs text-muted-foreground mb-1">VS</span>
                          <span className="font-display font-bold text-2xl tracking-widest">{match.score || '-'}</span>
                        </div>

                        <div className={`text-lg font-medium text-left sm:text-right w-full sm:w-auto ${match.winnerName === match.sideBName ? 'text-primary font-bold' : ''}`}>
                          {match.sideBName}
                        </div>

                      </div>

                      {match.vodUrl && (
                        <div className="ml-8 border-l border-border/50 pl-6 hidden sm:block">
                          <a href={match.vodUrl} target="_blank" rel="noreferrer" className="flex items-center text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
                            <ExternalLink className="w-4 h-4 mr-2" /> Watch VOD
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
       </div>
    </PublicLayout>
  );
}
