import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "wouter";
import PublicLayout from "@/components/layout/PublicLayout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ChevronLeft, Eye, EyeOff, Search, ShieldCheck, Crown, Loader2
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";
const VIS_OPTIONS = ["public", "default", "private"] as const;

function visLabel(visibleAfter: string | null | undefined): string {
  if (visibleAfter == null) return "default";
  const d = new Date(visibleAfter);
  if (d.getFullYear() <= 1970) return "public";
  if (d.getFullYear() >= 9000) return "private";
  return "default";
}

function visBadge(v: string) {
  if (v === "public") return "bg-green-400/20 text-green-400 border-green-400/30";
  if (v === "private") return "bg-red-400/20 text-red-400 border-red-400/30";
  return "bg-muted/40 text-muted-foreground border-border/40";
}

interface MatchRow {
  id: number;
  matchTitle: string;
  sideAName: string;
  sideBName: string;
  teamAId: number | null;
  teamBId: number | null;
  winnerName: string | null;
  visibleAfter: string | null;
  createdAt: string;
}

interface PaginatedResponse {
  matches: MatchRow[];
  total: number;
  page: number;
  totalPages: number;
}

export default function CaptainMatchManagement() {
  const { id } = useParams<{ id: string }>();
  const teamId = parseInt(id ?? "0");
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [singleLoading, setSingleLoading] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [teamName, setTeamName] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`${API_BASE}/api/teams/${teamId}/matches?${params}`, { credentials: "include" });
      if (res.status === 401) { setError("Not authenticated"); setLoading(false); return; }
      if (res.status === 403) { setError("Captain access only"); setLoading(false); return; }
      if (!res.ok) { setError("Failed to load matches"); setLoading(false); return; }
      const json = await res.json();
      setData(json);
    } catch {
      setError("Failed to load matches");
    }
    setLoading(false);
  }, [teamId, page, debouncedSearch]);

  useEffect(() => {
    if (!authLoading && isLoggedIn) fetchMatches();
  }, [authLoading, isLoggedIn, fetchMatches]);

  useEffect(() => {
    fetch(`${API_BASE}/api/teams/${teamId}`)
      .then(r => r.json())
      .then(d => { if (d.name) setTeamName(d.name); })
      .catch(() => {});
  }, [teamId]);

  const toggleSingle = async (matchId: number, newVis: string) => {
    setSingleLoading(matchId);
    try {
      const res = await fetch(`${API_BASE}/api/matches/${matchId}/visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ visibility: newVis }),
      });
      if (!res.ok) throw new Error("Server error");
      toast.success(`Match visibility set to ${newVis}`);
      fetchMatches();
    } catch {
      toast.error("Failed to update visibility");
    }
    setSingleLoading(null);
  };

  const bulkSetVisibility = async (vis: string) => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      const count = selected.size;
      const res = await fetch(`${API_BASE}/api/teams/${teamId}/matches/visibility`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ visibility: vis, matchIds: [...selected] }),
      });
      if (!res.ok) throw new Error("Server error");
      setSelected(new Set());
      toast.success(`${count} match(es) set to ${vis}`);
      fetchMatches();
    } catch {
      toast.error("Failed to bulk update visibility");
    }
    setBulkLoading(false);
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const matches = data?.matches ?? [];

  const toggleAll = () => {
    if (selected.size === matches.length) setSelected(new Set());
    else setSelected(new Set(matches.map(m => m.id)));
  };

  if (authLoading) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-4 pt-24 pb-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        </div>
      </PublicLayout>
    );
  }

  if (!isLoggedIn) {
    return (
      <PublicLayout>
        <div className="max-w-md mx-auto px-4 pt-24 pb-16">
          <Card className="bg-card/40 border-border/40 text-center">
            <CardContent className="pt-8 pb-8">
              <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4 opacity-60" />
              <h2 className="text-xl font-display font-bold mb-3">Log in to manage matches</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Match management is available to the team captain. Log in with Discord to continue.
              </p>
              <Link href="/login">
                <button className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold" style={{ backgroundColor: "#5865F2" }}>
                  Login with Discord →
                </button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  if (error === "Not authenticated") {
    return (
      <PublicLayout>
        <div className="max-w-md mx-auto px-4 pt-24 pb-16">
          <Card className="bg-card/40 border-border/40 text-center">
            <CardContent className="pt-8 pb-8">
              <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4 opacity-60" />
              <h2 className="text-xl font-display font-bold mb-3">Session expired</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Please log in with Discord to manage matches. Dev login does not grant server access.
              </p>
              <Link href="/login">
                <button className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold" style={{ backgroundColor: "#5865F2" }}>
                  Login with Discord →
                </button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  if (error === "Captain access only") {
    return (
      <PublicLayout>
        <div className="max-w-md mx-auto px-4 pt-24 pb-16">
          <Card className="bg-card/40 border-border/40 text-center">
            <CardContent className="pt-8 pb-8">
              <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-4 opacity-60" />
              <h2 className="text-xl font-display font-bold mb-3">Captain access only</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Only the team captain can manage match visibility.
              </p>
              <Link href={`/teams/${teamId}`}>
                <button className="text-sm text-primary hover:underline">← Back to team profile</button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-16 sm:px-6 lg:px-8">
        <Link href={`/teams/${teamId}/manage`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to Captain Hub
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold">Manage Matches</h1>
          {teamName && <p className="text-sm text-muted-foreground">{teamName} · Match Visibility</p>}
        </div>

        <Card className="bg-card/40 border-border/40">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" /> All Matches ({data?.total ?? 0})
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search opponent..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-sm rounded-lg border border-border/40 bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary/50 w-full sm:w-56"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
              </div>
            ) : error ? (
              <div className="py-12 text-center text-muted-foreground text-sm">{error}</div>
            ) : matches.length === 0 ? (
              <div className="border border-dashed border-border rounded-lg mx-6 mb-6 py-12 text-center">
                <EyeOff className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-xl font-medium mb-2">No matches found</p>
                <p className="text-muted-foreground text-sm">
                  {debouncedSearch ? "Try a different search term." : "Matches will appear here after scrims are recorded."}
                </p>
              </div>
            ) : (
              <>
                {selected.size > 0 && (
                  <div className="px-6 py-2 border-b border-border/30 flex items-center gap-2 bg-muted/10">
                    <span className="text-xs text-muted-foreground">{selected.size} selected</span>
                    {VIS_OPTIONS.map(v => (
                      <button
                        key={v}
                        onClick={() => bulkSetVisibility(v)}
                        disabled={bulkLoading}
                        className="text-xs px-2.5 py-1 rounded border border-border/40 hover:bg-muted/30 transition-colors capitalize disabled:opacity-50"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}
                <div className="px-6 py-2 border-b border-border/30 flex items-center gap-3">
                  <Checkbox checked={selected.size === matches.length && matches.length > 0} onCheckedChange={toggleAll} />
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Select all</span>
                </div>
                <div className="divide-y divide-border/30">
                  {matches.map((m) => {
                    const isA = m.teamAId === teamId;
                    const oppName = isA ? m.sideBName : m.sideAName;
                    const won = m.winnerName === (isA ? m.sideAName : m.sideBName);
                    const vis = visLabel(m.visibleAfter);
                    const isItemLoading = singleLoading === m.id;
                    return (
                      <div key={m.id} className="px-6 py-3 flex items-center gap-3">
                        <Checkbox checked={selected.has(m.id)} onCheckedChange={() => toggleSelect(m.id)} />
                        <span className={`w-7 h-7 rounded shrink-0 flex items-center justify-center text-xs font-bold ${won ? "bg-green-400/20 text-green-400" : "bg-red-400/20 text-red-400"}`}>
                          {won ? "W" : "L"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">vs {oppName}</div>
                          <div className="text-xs text-muted-foreground">{m.matchTitle}</div>
                        </div>
                        <Badge className={`text-xs capitalize ${visBadge(vis)}`}>{vis}</Badge>
                        <div className="flex items-center gap-1">
                          {VIS_OPTIONS.filter(v => v !== vis).map(v => (
                            <button
                              key={v}
                              onClick={() => toggleSingle(m.id, v)}
                              disabled={isItemLoading}
                              className="text-[11px] px-2 py-0.5 rounded border border-border/30 hover:bg-muted/30 transition-colors capitalize disabled:opacity-50"
                            >
                              {isItemLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : v}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {data && data.totalPages > 1 && (
                  <div className="px-6 py-3 border-t border-border/30 flex items-center justify-between">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="text-sm text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                    >
                      ← Previous
                    </button>
                    <span className="text-xs text-muted-foreground">
                      Page {data.page} of {data.totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                      disabled={page >= data.totalPages}
                      className="text-sm text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
