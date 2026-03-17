import PublicLayout from "@/components/layout/PublicLayout";
import { useListVods, useListEvents } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, PlayCircle } from "lucide-react";
import { useState } from "react";

export default function Vods() {
  const [search, setSearch] = useState("");
  const [eventId, setEventId] = useState<number | undefined>();
  
  const { data: vods, isLoading } = useListVods(
    (search || eventId) ? { search: search || undefined, eventId } : undefined
  );
  const { data: events } = useListEvents();

  return (
    <PublicLayout>
       <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-display font-bold mb-2">VOD Archive</h1>
        <p className="text-muted-foreground mb-10">Study local matches, review your gameplay, and see how others perform.</p>

        <div className="flex flex-col md:flex-row gap-4 mb-10 bg-card/30 p-4 rounded-lg border border-border/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Search by player, champion, or title..." 
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-card rounded-lg" />)}
          </div>
        ) : vods?.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">No VODs found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vods?.map((vod) => (
              <a key={vod.id} href={vod.videoUrl} target="_blank" rel="noreferrer" className="block group h-full">
                <Card className="h-full bg-card/40 border-border/40 group-hover:bg-card/80 group-hover:border-primary/50 transition-all duration-300">
                  <div className="aspect-video bg-background flex items-center justify-center border-b border-border/40 relative overflow-hidden">
                    {/* Pseudo-thumbnail placeholder since we don't have actual thumbnails */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
                    <PlayCircle className="w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors group-hover:scale-110 duration-300" />
                  </div>
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <Badge variant="outline" className="bg-background text-[10px]">{vod.format || 'Match'}</Badge>
                      {vod.roleTag && <span className="text-[10px] font-medium text-primary uppercase tracking-wider">{vod.roleTag}</span>}
                    </div>
                    <h3 className="font-semibold text-lg leading-tight mb-2 group-hover:text-primary transition-colors">{vod.title}</h3>
                    <p className="text-xs text-muted-foreground mb-4">{vod.eventTitle || 'Independent Match'}</p>
                    
                    {vod.playerNames && (
                      <p className="text-sm text-muted-foreground line-clamp-1 border-t border-border/30 pt-3">
                        <span className="font-medium text-foreground/70">Players:</span> {vod.playerNames}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        )}
       </div>
    </PublicLayout>
  );
}
