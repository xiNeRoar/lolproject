import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useGlobalSearch } from "@workspace/api-client-react";
import { Search, X, Users, Trophy, Calendar, Swords } from "lucide-react";
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
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debouncedQuery = useDebounce(query.trim(), 300);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  const enabled = debouncedQuery.length >= 2;
  const { data, isLoading } = useGlobalSearch(
    { q: debouncedQuery },
    { query: { enabled } }
  );

  const teams = data?.teams ?? [];
  const players = data?.players ?? [];
  const events = data?.events ?? [];
  const matches = data?.matches ?? [];
  const hasResults = teams.length > 0 || players.length > 0 || events.length > 0 || matches.length > 0;

  const allItems = useMemo(() => {
    const items: { type: string; path: string; id: string | number }[] = [];
    teams.forEach((t) => items.push({ type: "team", path: `/teams/${t.id}`, id: t.id }));
    players.forEach((p) => items.push({ type: "player", path: `/players/${encodeURIComponent(p.riotId ?? "")}`, id: p.id }));
    matches.forEach((m) => items.push({ type: "match", path: `/matches/${m.id}`, id: m.id }));
    events.forEach((e) => items.push({ type: "event", path: `/events/${e.slug ?? e.id}`, id: e.id }));
    return items;
  }, [teams, players, matches, events]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [debouncedQuery]);

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

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !hasResults || allItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < allItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : allItems.length - 1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      go(allItems[highlightedIndex].path);
    }
  };

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-search-index="${highlightedIndex}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const handleMobileToggle = () => {
    setMobileExpanded(!mobileExpanded);
    if (!mobileExpanded) {
      setTimeout(() => mobileInputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setOpen(false);
    }
  };

  let itemIndex = -1;
  const getNextIndex = () => ++itemIndex;

  const resultBtnCls = (idx: number) =>
    cn(
      "w-full px-3 py-2.5 text-left transition-colors flex items-center gap-3",
      idx === highlightedIndex ? "bg-primary/10" : "hover:bg-muted/50"
    );

  const dropdown = (
    <>
      {enabled && open && (
        <div ref={listRef} className="absolute top-full left-0 right-0 mt-1.5 rounded-lg border border-border/60 bg-card shadow-xl shadow-black/40 overflow-hidden z-50 max-h-[70vh] overflow-y-auto" role="listbox">
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
                  {teams.map((t) => {
                    const idx = getNextIndex();
                    return (
                      <button
                        key={t.id}
                        data-search-index={idx}
                        onClick={() => go(`/teams/${t.id}`)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={resultBtnCls(idx)}
                        role="option"
                        aria-selected={idx === highlightedIndex}
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
                    );
                  })}
                </div>
              )}
              {players.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/30 flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> Players
                  </div>
                  {players.map((p) => {
                    const idx = getNextIndex();
                    return (
                      <button
                        key={p.id}
                        data-search-index={idx}
                        onClick={() => go(`/players/${encodeURIComponent(p.riotId ?? "")}`)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={resultBtnCls(idx)}
                        role="option"
                        aria-selected={idx === highlightedIndex}
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
                    );
                  })}
                </div>
              )}
              {matches.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/30 flex items-center gap-1.5">
                    <Swords className="w-3 h-3" /> Matches
                  </div>
                  {matches.map((m) => {
                    const idx = getNextIndex();
                    return (
                      <button
                        key={m.id}
                        data-search-index={idx}
                        onClick={() => go(`/matches/${m.id}`)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={resultBtnCls(idx)}
                        role="option"
                        aria-selected={idx === highlightedIndex}
                      >
                        <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-display font-bold text-primary flex-shrink-0">
                          <Swords className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{m.sideAName} vs {m.sideBName}</span>
                          {m.matchTitle && (
                            <span className="text-xs text-muted-foreground ml-1.5">{m.matchTitle}</span>
                          )}
                        </div>
                        {m.score && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">{m.score}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {events.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/30 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> Events
                  </div>
                  {events.map((e) => {
                    const idx = getNextIndex();
                    return (
                      <button
                        key={e.id}
                        data-search-index={idx}
                        onClick={() => go(`/events/${e.slug ?? e.id}`)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={resultBtnCls(idx)}
                        role="option"
                        aria-selected={idx === highlightedIndex}
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
                    );
                  })}
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
            onKeyDown={handleInputKeyDown}
            placeholder="Search..."
            className="w-44 lg:w-56 h-8 pl-8 pr-8 text-sm rounded-md border border-border/40 bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:bg-muted/50 transition-colors"
            aria-label="Search teams, players, matches, and events"
            role="combobox"
            aria-expanded={open && enabled}
            aria-activedescendant={highlightedIndex >= 0 ? `search-item-${highlightedIndex}` : undefined}
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
                onKeyDown={handleInputKeyDown}
                placeholder="Search teams, players, matches..."
                className="w-full h-10 pl-10 pr-10 text-sm rounded-md border border-border/40 bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                aria-label="Search teams, players, matches, and events"
                role="combobox"
                aria-expanded={open && enabled}
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
