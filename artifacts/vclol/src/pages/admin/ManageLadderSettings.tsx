import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { PLAYOFF_FORMAT_OPTIONS, MATCH_FORMAT_OPTIONS } from "@/lib/tournament-formats";
import {
  useGetLadderSettings,
  useUpdateLadderSettings,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Settings } from "lucide-react";

function Field({
  label, hint, type = "number", value, onChange,
}: {
  label: string;
  hint?: string;
  type?: string;
  value: string | number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}

export default function ManageLadderSettings() {
  const { data: ladder, isLoading: loadingLadder } = useGetLadderSettings();
  const updateLadder = useUpdateLadderSettings();
  const { toast } = useToast();

  const [lForm, setLForm] = useState({
    kFactor: 32,
    minMatchesForDisplay: 4,
    playoffSize: 8,
    playoffFormat: "single_elimination",
    defaultMatchFormat: "BO1",
  });

  useEffect(() => {
    if (ladder) {
      setLForm({
        kFactor: ladder.kFactor,
        minMatchesForDisplay: ladder.minMatchesForDisplay,
        playoffSize: ladder.playoffSize,
        playoffFormat: ladder.playoffFormat,
        defaultMatchFormat: ladder.defaultMatchFormat ?? "BO1",
      });
    }
  }, [ladder]);

  const handleSaveLadder = () => {
    updateLadder.mutate(
      {
        data: {
          kFactor: Number(lForm.kFactor),
          minMatchesForDisplay: Number(lForm.minMatchesForDisplay),
          playoffSize: Number(lForm.playoffSize),
          playoffFormat: lForm.playoffFormat,
          defaultMatchFormat: lForm.defaultMatchFormat,
        },
      },
      { onSuccess: () => toast({ title: "Ladder settings saved." }) }
    );
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-display font-bold mb-6">Ladder Settings</h1>

      <div className="max-w-lg">
        <Card className="bg-card/40 border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="w-5 h-5 text-primary" />
              ELO Ladder
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingLadder ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-9 bg-muted rounded" />)}
              </div>
            ) : (
              <>
                <Field
                  label="K-Factor"
                  hint="ELO gain/loss per match (higher = more volatile)"
                  value={lForm.kFactor}
                  onChange={(v) => setLForm((f) => ({ ...f, kFactor: Number(v) }))}
                />
                <Field
                  label="Minimum Matches to Appear"
                  hint="Teams need this many matches to show on the ladder"
                  value={lForm.minMatchesForDisplay}
                  onChange={(v) => setLForm((f) => ({ ...f, minMatchesForDisplay: Number(v) }))}
                />
                <Field
                  label="Playoff Size"
                  hint="Number of teams in the playoff bracket (4 or 8)"
                  type="number"
                  value={lForm.playoffSize}
                  onChange={(v) => setLForm((f) => ({ ...f, playoffSize: Number(v) }))}
                />
                <div className="space-y-1">
                  <label className="text-sm font-medium">Default Match Format</label>
                  <p className="text-xs text-muted-foreground">Global default for new ladder matches (BO1, BO3, BO5). Seasons can override this.</p>
                  <select
                    value={lForm.defaultMatchFormat}
                    onChange={(e) => setLForm((f) => ({ ...f, defaultMatchFormat: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {MATCH_FORMAT_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Playoff Format</label>
                  <p className="text-xs text-muted-foreground">Bracket format for playoffs</p>
                  <select
                    value={lForm.playoffFormat}
                    onChange={(e) => setLForm((f) => ({ ...f, playoffFormat: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {PLAYOFF_FORMAT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <Button
                  className="w-full mt-2"
                  onClick={handleSaveLadder}
                  disabled={updateLadder.isPending}
                >
                  {updateLadder.isPending ? "Saving..." : "Save Ladder Settings"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
