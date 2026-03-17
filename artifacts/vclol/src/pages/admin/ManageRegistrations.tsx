import AdminLayout from "@/components/layout/AdminLayout";
import { useListRegistrations, useListEvents, useDeleteRegistration } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function ManageRegistrations() {
  const [eventId, setEventId] = useState<number | undefined>();
  const { data: regs, isLoading } = useListRegistrations(eventId ? { eventId } : undefined);
  const { data: events } = useListEvents();
  const deleteMut = useDeleteRegistration();
  const queryClient = useQueryClient();

  const handleDelete = (id: number) => {
    if (confirm("Delete this registration?")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/registrations'] })
      });
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-display font-bold">Event Registrations</h1>
        <select 
          className="h-10 rounded-md border border-input bg-card px-3 py-2 text-sm max-w-xs w-full"
          value={eventId || ""}
          onChange={(e) => setEventId(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">All Events</option>
          {events?.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border/50 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
            <tr>
              <th className="px-6 py-3">Event</th>
              <th className="px-6 py-3">Player Info</th>
              <th className="px-6 py-3">Location/Rank</th>
              <th className="px-6 py-3">Availability</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center">Loading...</td></tr>
            ) : regs?.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-muted-foreground">No registrations found</td></tr>
            ) : (
              regs?.map((item) => (
                <tr key={item.id} className="border-b border-border/20 hover:bg-muted/20">
                  <td className="px-6 py-4 font-medium text-primary">{item.eventTitle}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold">{item.riotId}</div>
                    <div className="text-xs text-muted-foreground">{item.discordUsername}</div>
                  </td>
                  <td className="px-6 py-4">{item.currentRank} <br/><span className="text-xs text-muted-foreground">{item.city}</span></td>
                  <td className="px-6 py-4 max-w-xs truncate" title={item.availabilityConfirmation}>{item.availabilityConfirmation}</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
