import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import {
  useGetLadderSettings,
  useUpdateLadderSettings,
  useGetAdminSchedule,
  useUpdateAdminSchedule,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Settings, Calendar } from "lucide-react";

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
  const { data: schedule, isLoading: loadingSchedule } = useGetAdminSchedule();
  const updateLadder = useUpdateLadderSettings();
  const updateSchedule = useUpdateAdminSchedule();
  const { toast } = useToast();

  const [lForm, setLForm] = useState({
    kFactor: 32,
    minMatchesForDisplay: 4,
    maxChallengesPerWeek: 3,
    maxChallengesSameOpponentPerWeek: 1,
    challengeExpiryHours: 48,
  });

  const [sForm, setSForm] = useState({
    availableDays: "saturday,sunday",
    startTime: "12:00",
    endTime: "20:00",
    maxConcurrentMatches: 4,
  });

  useEffect(() => {
    if (ladder) {
      setLForm({
        kFactor: ladder.kFactor,
        minMatchesForDisplay: ladder.minMatchesForDisplay,
        maxChallengesPerWeek: ladder.maxChallengesPerWeek,
        maxChallengesSameOpponentPerWeek: ladder.maxChallengesSameOpponentPerWeek,
        challengeExpiryHours: ladder.challengeExpiryHours,
      });
    }
  }, [ladder]);

  useEffect(() => {
    if (schedule) {
      setSForm({
        availableDays: schedule.availableDays,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        maxConcurrentMatches: schedule.maxConcurrentMatches,
      });
    }
  }, [schedule]);

  const handleSaveLadder = () => {
    updateLadder.mutate(
      {
        data: {
          kFactor: Number(lForm.kFactor),
          minMatchesForDisplay: Number(lForm.minMatchesForDisplay),
          maxChallengesPerWeek: Number(lForm.maxChallengesPerWeek),
          maxChallengesSameOpponentPerWeek: Number(lForm.maxChallengesSameOpponentPerWeek),
          challengeExpiryHours: Number(lForm.challengeExpiryHours),
        },
      },
      { onSuccess: () => toast({ title: "Ladder settings saved." }) }
    );
  };

  const handleSaveSchedule = () => {
    updateSchedule.mutate(
      {
        data: {
          availableDays: sForm.availableDays,
          startTime: sForm.startTime,
          endTime: sForm.endTime,
          maxConcurrentMatches: Number(sForm.maxConcurrentMatches),
        },
      },
      { onSuccess: () => toast({ title: "Schedule settings saved." }) }
    );
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-display font-bold mb-6">Ladder & Schedule Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ladder ELO Settings */}
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
                  hint="Players need this many matches to show on the ladder"
                  value={lForm.minMatchesForDisplay}
                  onChange={(v) => setLForm((f) => ({ ...f, minMatchesForDisplay: Number(v) }))}
                />
                <Field
                  label="Max Challenges Per Week"
                  hint="Max challenges a player can send per week"
                  value={lForm.maxChallengesPerWeek}
                  onChange={(v) => setLForm((f) => ({ ...f, maxChallengesPerWeek: Number(v) }))}
                />
                <Field
                  label="Max Challenges vs Same Opponent / Week"
                  value={lForm.maxChallengesSameOpponentPerWeek}
                  onChange={(v) => setLForm((f) => ({ ...f, maxChallengesSameOpponentPerWeek: Number(v) }))}
                />
                <Field
                  label="Challenge Expiry (hours)"
                  hint="Time window before a challenge auto-expires"
                  value={lForm.challengeExpiryHours}
                  onChange={(v) => setLForm((f) => ({ ...f, challengeExpiryHours: Number(v) }))}
                />
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

        {/* Schedule Settings */}
        <Card className="bg-card/40 border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-primary" />
              Match Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingSchedule ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-9 bg-muted rounded" />)}
              </div>
            ) : (
              <>
                <Field
                  label="Available Days"
                  hint="Comma-separated: monday, tuesday, wednesday, thursday, friday, saturday, sunday"
                  type="text"
                  value={sForm.availableDays}
                  onChange={(v) => setSForm((f) => ({ ...f, availableDays: v }))}
                />
                <Field
                  label="Start Time (HH:MM)"
                  hint="Matches can start from this time"
                  type="time"
                  value={sForm.startTime}
                  onChange={(v) => setSForm((f) => ({ ...f, startTime: v }))}
                />
                <Field
                  label="End Time (HH:MM)"
                  hint="No matches scheduled after this time"
                  type="time"
                  value={sForm.endTime}
                  onChange={(v) => setSForm((f) => ({ ...f, endTime: v }))}
                />
                <Field
                  label="Max Concurrent Matches"
                  hint="How many matches can run at the same time"
                  value={sForm.maxConcurrentMatches}
                  onChange={(v) => setSForm((f) => ({ ...f, maxConcurrentMatches: Number(v) }))}
                />
                <Button
                  className="w-full mt-2"
                  onClick={handleSaveSchedule}
                  disabled={updateSchedule.isPending}
                >
                  {updateSchedule.isPending ? "Saving..." : "Save Schedule Settings"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
