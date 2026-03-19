import AdminLayout from "@/components/layout/AdminLayout";
import { EVENT_FORMAT_OPTIONS } from "@/lib/tournament-formats";
import { useListEvents, useCreateEvent, useDeleteEvent, useListRegistrations } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Users, ArrowRight } from "lucide-react";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatDate } from "@/lib/utils";

export default function ManageEvents() {
  const { data: events, isLoading } = useListEvents();
  const { data: allRegs } = useListRegistrations();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const regCountByEvent = useMemo(() => {
    const map: Record<number, number> = {};
    allRegs?.forEach((r) => {
      map[r.eventId] = (map[r.eventId] ?? 0) + 1;
    });
    return map;
  }, [allRegs]);

  const [isOpen, setIsOpen] = useState(false);

  const createMut = useCreateEvent();
  const deleteMut = useDeleteEvent();

  const { register, handleSubmit, reset } = useForm();

  const openNew = () => {
    reset({ registrationStatus: 'open', format: '' });
    setIsOpen(true);
  };

  const onSubmit = (data: any) => {
    createMut.mutate({ data }, {
      onSuccess: () => {
        setIsOpen(false);
        queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      }
    });
  };

  const handleDelete = (id: number) => {
    if(confirm("Delete this event?")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/events'] })
      });
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-display font-bold">Manage Events</h1>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> New Event</Button>
      </div>

      <div className="bg-card border border-border/50 rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
            <tr>
              <th className="px-6 py-3">Event</th>
              <th className="px-6 py-3 hidden sm:table-cell">Date</th>
              <th className="px-6 py-3 hidden md:table-cell">Format</th>
              <th className="px-6 py-3 hidden sm:table-cell">Status</th>
              <th className="px-6 py-3 hidden lg:table-cell">Registrations</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">Loading…</td></tr>
            ) : !events?.length ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">No events yet. Create your first event.</td></tr>
            ) : events.map(event => {
              const regCount = regCountByEvent[event.id] ?? 0;
              const statusColor =
                event.registrationStatus === "open" ? "text-green-400" :
                event.registrationStatus === "closed" ? "text-red-400" :
                event.registrationStatus === "invite-only" ? "text-yellow-400" :
                "text-muted-foreground";
              return (
                <tr key={event.id} className="border-b border-border/20 hover:bg-muted/20">
                  <td className="px-6 py-4">
                    <div className="font-medium">{event.title}</div>
                    <div className="text-xs text-muted-foreground">{event.slug}</div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground hidden sm:table-cell">{formatDate(event.eventDate)}</td>
                  <td className="px-6 py-4 text-muted-foreground hidden md:table-cell">{event.format}</td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <span className={`text-xs font-medium capitalize ${statusColor}`}>
                      {event.registrationStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span>{regCount} reg{regCount !== 1 ? "s" : ""}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:text-primary hover:bg-primary/10 gap-1 mr-1"
                        onClick={() => navigate(`/admin/events/${event.id}`)}>
                        Manage <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon"
                        onClick={() => handleDelete(event.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <Input placeholder="Event Title" {...register("title", {required: true})} />
          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Slug (url-friendly)" {...register("slug", {required: true})} />
            <Input type="date" {...register("eventDate", {required: true})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" {...register("format", { required: true })}>
               <option value="">Select Format</option>
               {EVENT_FORMAT_OPTIONS.map((fmt) => (
                 <option key={fmt} value={fmt}>{fmt}</option>
               ))}
             </select>
             <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" {...register("registrationStatus")}>
               <option value="open">Open</option>
               <option value="upcoming">Upcoming</option>
               <option value="closed">Closed</option>
               <option value="invite-only">Invite Only</option>
             </select>
          </div>
          <Textarea placeholder="Short Description (appears on cards)" {...register("shortDescription", {required: true})} />
          <Textarea placeholder="Full Description (Markdown allowed)" className="h-32" {...register("fullDescription")} />
          <Textarea placeholder="Rules Summary" {...register("rulesSummary")} />
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={createMut.isPending}>Save Event</Button>
          </div>
        </form>
      </Dialog>
    </AdminLayout>
  );
}
