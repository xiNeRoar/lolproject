import AdminLayout from "@/components/layout/AdminLayout";
import { useListChallenges, useDeleteChallenge } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useLocation } from "wouter";

function statusBadge(status: string) {
  if (status === "pending") return <Badge variant="secondary">{status}</Badge>;
  if (status === "accepted") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{status}</Badge>;
  if (status === "completed") return <Badge>{status}</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">{status}</Badge>;
}

export default function ManageChallenges() {
  const { data: challenges, isLoading } = useListChallenges();
  const deleteChallenge = useDeleteChallenge();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [, navigate] = useLocation();

  const filtered = (challenges ?? []).filter((c) =>
    statusFilter === "all" ? true : c.status === statusFilter
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Challenges</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
          <option value="expired">Expired</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-card rounded-lg" />)}
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-20 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">No challenges found.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-border/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-card/60 border-b border-border/40">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Challenger</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Challenged</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden sm:table-cell">Scheduled</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Game ID</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/20 last:border-0 hover:bg-card/30">
                  <td className="px-4 py-3 font-medium">{c.challengerRiotId ?? `#${c.challengerId}`}</td>
                  <td className="px-4 py-3">{c.challengedRiotId ?? `#${c.challengedId}`}</td>
                  <td className="px-4 py-3">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {c.scheduledTime ? new Date(c.scheduledTime).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell font-mono text-xs">{c.gameId ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {c.status === "accepted" && c.gameId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/matches?playerAId=${c.challengerId}&playerBId=${c.challengedId}`)}
                        >
                          Create Match →
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-400 border-red-400/30 hover:bg-red-500/10"
                        onClick={() => deleteChallenge.mutate({ id: c.id })}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
