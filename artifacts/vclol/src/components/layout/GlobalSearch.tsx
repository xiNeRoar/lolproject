import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useGlobalSearch } from "@workspace/api-client-react";
import { Search, X, Users, Trophy, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const debouncedQuery = useDebounce(query.trim(), 300);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  const enabled = debouncedQuery.length >= 2;
  const { data, isLoading } = useGlobalSearch(
    { q: debouncedQuery },
    { query: { enabled } }
  );

  const teams = data?.teams ?? [];
  const players = data?.players ?? [];
  const events = data?.events ?? [];
  const hasResults = teams.length > 0 || players.length > 0 || events.length > 0;

  useEffect(() => {
    if (enabled) setOpen(true);
  }, [enabled, debouncedQuery]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setMobileExpanded(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const go = useCallback((path: string) => {
    setOpen(false);
    setQuery("");
    setMobileExpanded(false);
    navigate(path);
  }, [navigate]);

  const handleMobileToggle = () => {
    setMobileExpanded(!mobileExpanded);
    if (!mobileExpanded) {
      setTimeout(() => mobileInputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setOpen(false);
    }
  };

  const dropdown = (
    <>
      {enabled && open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 rounded-lg border border-border/60 bg-card shadow-xl shadow-black/40 overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">Searching...</div>
          ) : !hasResults ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">No results for &ldquo;{debouncedQuery}&rdquo;</div>
          ) : (
            <>
              {teams.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/30 flex items-center gap-1.5">
                    <Trophy className="w-3 h-3" /> Teams
                  </div>
                  {teams.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => go(`/teams/${t.id}`)}
                      className="w-full px-3 py-2.5 text-left hover:bg-muted/50 transition-colors flex items-center gap-3"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-display font-bold text-primary flex-shrink-0">
                        {(t.tag ?? "?")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{t.name}</span>
                        <span className="text-xs text-muted-foreground ml-1.5">[{t.tag}]</span>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{t.teamElo} ELO</span>
                    </button>
                  ))}
                </div>
              )}
              {players.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/30 flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> Players
                  </div>
                  {players.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => go(`/players/${encodeURIComponent(p.riotId ?? "")}`)}
                      className="w-full px-3 py-2.5 text-left hover:bg-muted/50 transition-colors flex items-center gap-3"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-display font-bold text-primary flex-shrink-0">
                        {(p.riotId ?? "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{p.riotId}</span>
                      </div>
                      {p.primaryRole && (
                        <span className="text-xs text-muted-foreground border border-border/40 rounded px-1.5 py-0.5 flex-shrink-0">{p.primaryRole}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {events.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/30 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> Events
                  </div>
                  {events.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => go(`/events/${e.slug ?? e.id}`)}
                      className="w-full px-3 py-2.5 text-left hover:bg-muted/50 transition-colors flex items-center gap-3"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-display font-bold text-primary flex-shrink-0">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{e.title}</span>
                      </div>
                      {e.format && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">{e.format}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );

  return (
    <>
      <div className="hidden md:block relative" ref={ref}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (enabled) setOpen(true); }}
            placeholder="Search..."
            className="w-44 lg:w-56 h-8 pl-8 pr-8 text-sm rounded-md border border-border/40 bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:bg-muted/50 transition-colors"
            aria-label="Search teams, players, and events"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setOpen(false); inputRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {dropdown}
      </div>

      <div className="md:hidden">
        <button
          onClick={handleMobileToggle}
          className="text-muted-foreground hover:text-foreground p-1.5"
          aria-label={mobileExpanded ? "Close search" : "Open search"}
        >
          {mobileExpanded ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
        </button>

        {mobileExpanded && (
          <div className={cn("absolute left-0 right-0 top-full border-b border-border bg-background px-4 py-3 z-50")} ref={ref}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                ref={mobileInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => { if (enabled) setOpen(true); }}
                placeholder="Search teams, players, events..."
                className="w-full h-10 pl-10 pr-10 text-sm rounded-md border border-border/40 bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                aria-label="Search teams, players, and events"
              />
              {query && (
                <button
                  onClick={() => { setQuery(""); setOpen(false); mobileInputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {dropdown}
          </div>
        )}
      </div>
    </>
  );
}
