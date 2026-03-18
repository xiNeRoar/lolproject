import PublicLayout from "@/components/layout/PublicLayout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy, Video, Users, ArrowRight, Calendar as CalendarIcon,
  MessageCircle, Swords, BarChart3,
} from "lucide-react";
import { useListEvents, useListVods, useListMatches } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";
import { motion } from "framer-motion";

const DD = "https://ddragon.leagueoflegends.com";

function getEventBanner(format: string): string {
  const f = format.toLowerCase();
  if (f === "1v1" || f === "1v1 ladder") return `${DD}/cdn/img/champion/splash/Draven_0.jpg`;
  if (f.includes("house") || f.includes("5v5") || f.includes("team")) return `${DD}/cdn/img/champion/splash/Orianna_0.jpg`;
  if (f.includes("elimination") || f.includes("swiss") || f.includes("robin") || f.includes("knockout")) return `${DD}/cdn/img/champion/splash/Jinx_0.jpg`;
  return `${DD}/cdn/img/champion/splash/Caitlyn_0.jpg`;
}


export default function Home() {
  const { data: events } = useListEvents();
  const { data: vods } = useListVods();
  const { data: matches } = useListMatches();

  const upcomingEvent = events?.find(e => e.registrationStatus !== 'closed') || events?.[0];
  const recentVods = vods?.slice(0, 3);

  return (
    <PublicLayout>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-background min-h-[540px] flex items-center">
        {/* Full-width Jinx splash — anchored to the right so she shows fully */}
        <div className="absolute inset-0 pointer-events-none select-none">
          <img
            src={`${DD}/cdn/img/champion/splash/Jinx_0.jpg`}
            alt=""
            className="w-full h-full object-cover object-right-top"
          />
          {/* Left-heavy gradient so text is readable and Jinx stays visible on right */}
          <div className="absolute inset-0 bg-gradient-to-r from-background from-[35%] via-background/70 via-[55%] to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-background/30" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-xl"
          >
            <Badge variant="outline" className="mb-6 border-primary/30 text-primary bg-primary/5">
              Lower Mainland • BC
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold font-display tracking-tight mb-6 text-foreground leading-tight">
              Vancouver Competitive <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                LoL Project
              </span>
            </h1>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
              A serious environment for local players to improve, compete, and be seen. Structured grassroots competition for the Lower Mainland.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/register">
                <Button size="lg" className="font-semibold w-full sm:w-auto">
                  Register Now <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/events">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  View Events
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────── */}
      <section className="border-y border-border/50 bg-card/40 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { icon: CalendarIcon, value: events?.length ?? "—", label: "Events Hosted" },
              { icon: Swords,       value: matches?.length ?? "—", label: "Matches Played" },
              { icon: Video,        value: vods?.length    ?? "—", label: "VODs Archived"  },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label}>
                <Icon className="w-4 h-4 text-primary mx-auto mb-1 opacity-70" />
                <p className="text-2xl md:text-3xl font-bold font-display text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Current Phase Banner ─────────────────────────── */}
      <section className="border-b border-primary/20 bg-primary/5 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-3">Active Competition</Badge>
          <h2 className="text-xl font-bold font-display mb-3">Vancouver's competitive ladder is live</h2>
          <p className="max-w-2xl mx-auto text-muted-foreground text-sm leading-relaxed">
            Building Vancouver's first structured competitive LoL ladder. Register to compete, 
            build your match record, and track your ELO over time.
          </p>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="py-20 bg-card/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Trophy,
                title: "Competitive Local Play",
                desc: "Structured events beyond solo queue. 1v1s, 5v5s, and organized in-houses designed for serious improvement.",
                delay: 0,
              },
              {
                icon: BarChart3,
                title: "Match Records & VODs",
                desc: "Every official match is recorded. Build a public history of your competitive performance and access high-level local VODs.",
                delay: 0.1,
              },
              {
                icon: Users,
                title: "A Place to Be Seen",
                desc: "Network with dedicated players in the Lower Mainland. Find teams, scrim partners, and local rivals.",
                delay: 0.2,
              },
            ].map(({ icon: Icon, title, desc, delay }) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay }}
              >
                <Card className="bg-background border-border/40 hover:border-primary/30 transition-colors h-full">
                  <CardHeader>
                    <Icon className="w-8 h-8 text-primary mb-3" />
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">{desc}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Previews (Events + VODs) ─────────────────────── */}
      <section className="py-20 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16">

          {/* Upcoming Event */}
          <div>
            <div className="flex items-center justify-between mb-6 border-b border-border/40 pb-4">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <CalendarIcon className="text-primary w-5 h-5" /> Featured Event
              </h2>
              <Link href="/events" className="text-sm text-primary hover:underline">All Events →</Link>
            </div>

            {upcomingEvent ? (
              <Card className="group hover:border-primary/50 transition-all duration-300 bg-card/50 overflow-hidden">
                {/* Champion splash art banner based on event format */}
                <div className="relative overflow-hidden flex-shrink-0" style={{ height: '150px' }}>
                  <img
                    src={getEventBanner(upcomingEvent.format)}
                    alt={upcomingEvent.format}
                    className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card/95 via-card/30 to-transparent" />
                  <div className="absolute bottom-3 left-4">
                    <Badge variant="outline" className="border-primary/60 text-primary bg-background/70 backdrop-blur-sm text-xs">
                      {upcomingEvent.format}
                    </Badge>
                  </div>
                  <div className="absolute bottom-3 right-4 text-xs font-medium text-foreground/80 drop-shadow">
                    {formatDate(upcomingEvent.eventDate)}
                  </div>
                </div>
                <CardContent className="p-5">
                  <h3 className="text-lg font-bold font-display mb-1">{upcomingEvent.title}</h3>
                  <p className="text-muted-foreground text-sm mb-5 line-clamp-2">{upcomingEvent.shortDescription}</p>
                  <Link href={`/events/${upcomingEvent.slug}`}>
                    <Button className="w-full" size="sm">View Details <ArrowRight className="ml-2 w-3 h-3" /></Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="p-8 text-center border border-border/40 border-dashed rounded-lg bg-card/20">
                <p className="text-muted-foreground text-sm">No events scheduled at the moment.</p>
              </div>
            )}
          </div>

          {/* Recent VODs */}
          <div>
            <div className="flex items-center justify-between mb-6 border-b border-border/40 pb-4">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <Video className="text-primary w-5 h-5" /> Recent VODs
              </h2>
              <Link href="/vods" className="text-sm text-primary hover:underline">VOD Archive →</Link>
            </div>

            {recentVods && recentVods.length > 0 ? (
              <div className="space-y-3">
                {recentVods.map((vod, i) => (
                  <Link key={vod.id} href={`/vods/${vod.id}`} className="block group">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.07 }}
                  >
                    <Card className="bg-card/30 hover:bg-card border-border/40 hover:border-primary/30 transition-all">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="min-w-0">
                          <h4 className="font-medium text-sm group-hover:text-primary transition-colors truncate">{vod.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {vod.eventTitle && <span className="truncate">{vod.eventTitle}</span>}
                            {vod.format && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-border inline-block flex-shrink-0" />
                                <span>{vod.format}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 ml-3" />
                      </CardContent>
                    </Card>
                  </motion.div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center border border-border/40 border-dashed rounded-lg bg-card/20">
                <p className="text-muted-foreground text-sm">Archive is currently building.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Discord CTA ───────────────────────────────────── */}
      <section className="py-16 border-t border-border/40 bg-card/30">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <MessageCircle className="w-10 h-10 text-primary mx-auto mb-5 opacity-80" />
          <h2 className="text-2xl font-bold font-display mb-3">Join the Community</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            Get notified about upcoming events, find teammates, discuss strategies, and connect with local Vancouver / Lower Mainland players on Discord.
          </p>
          <a href={import.meta.env.VITE_DISCORD_URL ?? "#"} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="font-semibold">
              <MessageCircle className="mr-2 w-4 h-4" /> Join Discord Server
            </Button>
          </a>
        </div>
      </section>
    </PublicLayout>
  );
}
