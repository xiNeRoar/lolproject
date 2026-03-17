import { useState } from "react";
import { useGetAdminSchedule, useCreateChallenge } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  targetPlayer: { id: number; riotId: string } | null;
  challengerId: number;
  onClose: () => void;
}

const DAY_NAMES: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

function generateSlots(schedule: { availableDays: string; startTime: string } | undefined): string[] {
  if (!schedule || !schedule.availableDays) return [];

  const days = schedule.availableDays
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d in DAY_NAMES)
    .map((d) => DAY_NAMES[d]);

  const [startHour, startMin] = schedule.startTime.split(":").map(Number);
  const slots: string[] = [];
  const now = new Date();

  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    d.setHours(startHour, startMin ?? 0, 0, 0);
    if (days.includes(d.getDay())) {
      slots.push(d.toISOString());
    }
    if (slots.length >= 7) break;
  }

  return slots;
}

function formatSlot(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-CA", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ChallengeModal({ targetPlayer, challengerId, onClose }: Props) {
  const { data: schedule } = useGetAdminSchedule();
  const createChallenge = useCreateChallenge();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (!targetPlayer) return null;

  const slots = generateSlots(schedule ?? undefined);

  const handleSubmit = () => {
    if (!selectedSlot) return;
    createChallenge.mutate(
      { data: { challengedId: targetPlayer.id, scheduledTime: selectedSlot } },
      {
        onSuccess: () => setSent(true),
      }
    );
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogHeader>
        <DialogTitle>Challenge {targetPlayer.riotId}</DialogTitle>
      </DialogHeader>

      {sent ? (
        <div className="text-center py-4">
          <p className="text-green-400 font-semibold mb-1">Challenge sent!</p>
          <p className="text-sm text-muted-foreground">They have 48 hours to accept.</p>
          <Button className="mt-4 w-full" onClick={onClose}>Close</Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-3">Select a time slot:</p>

          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No available time slots configured. Contact admin.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
              {slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                    selectedSlot === slot
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border/40 bg-card/40 hover:border-primary/40"
                  }`}
                >
                  {formatSlot(slot)}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1"
              disabled={!selectedSlot || createChallenge.isPending}
              onClick={handleSubmit}
            >
              {createChallenge.isPending ? "Sending..." : "Confirm"}
            </Button>
          </div>
        </>
      )}
    </Dialog>
  );
}
