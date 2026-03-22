import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Bell, Swords, Trophy, Award, CalendarCheck, CalendarX, Loader2 } from "lucide-react";
import { useListNotifications, useMarkNotificationRead } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  entityId?: number | null;
  isRead: boolean;
  createdAt: string;
}

function notifIcon(type: string) {
  if (type === "match_result") return { Icon: Swords, color: "text-primary" };
  if (type === "season_completed") return { Icon: Trophy, color: "text-yellow-400" };
  if (type === "badge_earned") return { Icon: Award, color: "text-yellow-400" };
  if (type === "event_registration_confirmed") return { Icon: CalendarCheck, color: "text-green-400" };
  if (type === "event_registration_declined") return { Icon: CalendarX, color: "text-red-400" };
  return { Icon: Bell, color: "text-muted-foreground" };
}

function notifHref(n: { type: string; entityId?: number | null }): string | null {
  if (n.type === "match_result" && n.entityId) return `/matches/${n.entityId}`;
  if (n.type === "season_completed") return "/teams";
  return null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();

  const { data: notifications, isLoading, isError } = useListNotifications({
    query: { refetchInterval: 30000, retry: false },
  });
  const markRead = useMarkNotificationRead();

  const notifList = isError ? [] : ((notifications ?? []) as Notification[]);
  const unreadCount = notifList.filter((n) => !n.isRead).length;
  const recent = notifList.slice(0, 6);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) close();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, close]);

  const handleMarkRead = (n: Notification) => {
    if (!n.isRead) {
      markRead.mutate(
        { id: n.id },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }) }
      );
    }
  };

  const handleMarkAllRead = () => {
    const allUnread = notifList.filter((n) => !n.isRead);
    allUnread.forEach((n) => {
      markRead.mutate(
        { id: n.id },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }) }
      );
    });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-red-400 text-white ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border/60 bg-card shadow-xl shadow-black/40 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <h3 className="text-sm font-display font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {isLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
              </div>
            ) : recent.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {recent.map((n) => {
                  const { Icon, color } = notifIcon(n.type);
                  const href = notifHref(n);
                  const content = (
                    <div
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer",
                        n.isRead
                          ? "opacity-60 hover:bg-muted/20"
                          : "bg-primary/[0.03] hover:bg-primary/[0.06]"
                      )}
                      onClick={() => {
                        handleMarkRead(n);
                        if (href) setOpen(false);
                      }}
                    >
                      <div className={cn("mt-0.5 shrink-0", color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                    </div>
                  );

                  return href ? (
                    <Link key={n.id} href={href} className="block">
                      {content}
                    </Link>
                  ) : (
                    <div key={n.id}>{content}</div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-border/40 px-4 py-2.5">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block text-center text-xs text-primary hover:underline font-medium"
            >
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
