import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useListPlayers } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";

export default function DevLogin() {
  const { data: players, isLoading } = useListPlayers();
  const [, navigate] = useLocation();
  const { playerId: currentPlayerId } = useAuth();
  const currentId = currentPlayerId ? String(currentPlayerId) : null;

  const loginAs = (playerId: number) => {
    localStorage.setItem("vclol_player_id", String(playerId));
    window.dispatchEvent(new Event("storage"));
    navigate("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("vclol_player_id");
    window.dispatchEvent(new Event("storage"));
    navigate("/");
  };

  return (
    <PublicLayout>
      <div className="max-w-lg mx-auto px-4 pt-16 pb-16">
        <Card className="border-yellow-400/30 bg-card/60">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <span className="text-yellow-400">⚡</span> Dev Login
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Development-only — click a player to view their dashboard.
            </p>
            {currentId && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-green-400">Logged in as Player #{currentId}</span>
                <Button size="sm" variant="outline" className="text-xs h-6 px-2" onClick={logout}>
                  Logout
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted rounded-lg" />)}
              </div>
            ) : !players?.length ? (
              <p className="text-sm text-muted-foreground">
                No players found. Create one via Admin → Players first.
              </p>
            ) : (
              players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => loginAs(p.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-colors ${
                    currentId === String(p.id)
                      ? "border-primary bg-primary/10"
                      : "border-border/40 hover:border-primary/50 hover:bg-card/80"
                  }`}
                >
                  <div>
                    <div className="font-medium text-sm">{p.riotId}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.discordUsername} · ID #{p.id}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-display font-bold text-primary">ID #{p.id}</div>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
