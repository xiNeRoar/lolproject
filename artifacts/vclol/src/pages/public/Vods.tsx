import PublicLayout from "@/components/layout/PublicLayout";
import { useListVods, useListEvents } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, PlayCircle, ArrowRight, X } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const POSITIONS = ["Mid", "Top", "Jungle", "Bot", "Support"];

export default function Vods() {
  const [search, setSearch] = useState("");
  const [eventId, setEventId] = useState<number | undefined>();
  const [champion, setChampion] = useState("");
  const [opponentChampion, setOpponentChampion] = useState("");
  const [position, setPosition] = useState("");
  const [patch, setPatch] = useState("");
  const [eloMin, setEloMin] = useState("");
  const [eloMax, setEloMax] = useState("");

  const hasFilters = !!(search || eventId || champion || opponentChampion || position || patch || eloMin || eloMax);

  const params = hasFilters
    ? {
        search: search || undefined,
        eventId,
        champion: champion || undefined,
        opponentChampion: opponentChampion || undefined,
        position: position || undefined,
        patch: patch || undefined,
        eloMin: eloMin ? Number(eloMin) : undefined,
        eloMax: eloMax ? Number(eloMax) : undefined,
      }
    : undefined;

  const { data: vods, isLoading } = useListVods(params);
  const { data: events } = useListEvents();

  const clearFilters = () => {
    setSearch("");
    setEventId(undefined);
    setChampion("");
    setOpponentChampion("");
    setPosition("");
    setPatch("");
    setEloMin("");
    setEloMax("");
  };

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-display font-bold mb-2">VOD Archive</h1>
        <p className="text-muted-foreground mb-10">Study local matches, review your gameplay, and see how others perform.</p>

        {/* Filters */}
        <div className="flex flex-col gap-3 mb-10 bg-card/30 p-4 rounded-lg border border-border/50">
          {/* Row 1: search + event */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by player, champion, or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <select
              className="flex h-10 w-full md:w-52 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={eventId || ""}
              onChange={(e) => setEventId(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">All Events</option>
              {events?.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          </div>

          {/* Row 2: champion filters + position + patch */}
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              placeholder="Champion (e.g. Zed)"
              value={champion}
              onChange={(e) => setChampion(e.target.value)}
              className="bg-background md:w-40"
            />
            <Input
              placeholder="Opponent (e.g. Ahri)"
              value={opponentChampion}
              onChange={(e) => setOpponentChampion(e.target.value)}
              className="bg-background md:w-40"
            />
            <select
              className="flex h-10 w-full md:w-36 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            >
              <option value="">All Positions</option>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <Input
              placeholder="Patch (e.g. 14.8)"
              value={patch}
              onChange={(e) => setPatch(e.target.value)}
              className="bg-background md:w-32"
            />
          </div>

          {/* Row 3: ELO range + clear */}
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="ELO min"
                value={eloMin}
                onChange={(e) => setEloMin(e.target.value)}
                className="bg-background w-28"
              />
              <span className="text-muted-foreground text-sm">–</span>
              <Input
                type="number"
                placeholder="ELO max"
                value={eloMax}
                onChange={(e) => setEloMax(e.target.value)}
                className="bg-background w-28"
              />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3 mr-1" /> Clear filters
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-card rounded-lg" />
            ))}
          </div>
        ) : vods?.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">No VODs found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vods?.map((vod) => (
              <Card
                key={vod.id}
                className="h-full bg-card/40 border-border/40 hover:bg-card/80 hover:border-primary/50 transition-all duration-300 flex flex-col"
              >
                <a href={vod.videoUrl} target="_blank" rel="noreferrer" className="block group">
                  <div className="aspect-video bg-background flex items-center justify-center border-b border-border/40 relative overflow-hidden rounded-t-lg">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
                    <PlayCircle className="w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors group-hover:scale-110 duration-300" />
                  </div>
                </a>
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant="outline" className="bg-background text-[10px]">
                      {vod.format || "Match"}
                    </Badge>
                    {vod.roleTag && (
                      <span className="text-[10px] font-medium text-primary uppercase tracking-wider">
                        {vod.roleTag}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg leading-tight mb-1">{vod.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    {vod.eventTitle || "Independent Match"}
                  </p>

                  {/* Champion info */}
                  {vod.champion && (
                    <div className="flex gap-1 flex-wrap mb-3">
                      <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                        {vod.champion}
                        {vod.opponentChampion ? ` vs ${vod.opponentChampion}` : ""}
                      </Badge>
                      {vod.position && (
                        <Badge variant="outline" className="text-xs">{vod.position}</Badge>
                      )}
                      {vod.patch && (
                        <span className="text-[10px] text-muted-foreground self-center">
                          P{vod.patch}
                        </span>
                      )}
                    </div>
                  )}

                  {vod.playerNames && (
                    <p className="text-sm text-muted-foreground line-clamp-1 border-t border-border/30 pt-3 mb-3">
                      <span className="font-medium text-foreground/70">Players:</span> {vod.playerNames}
                    </p>
                  )}

                  <div className="mt-auto pt-3 border-t border-border/30">
                    <Link href={`/vods/${vod.id}`}>
                      <a className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        View Details <ArrowRight className="w-3 h-3" />
                      </a>
                    </Link>
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
