import PublicLayout from "@/components/layout/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

export default function Register() {
  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-display font-bold mb-3">Join VCLoL</h1>
          <p className="text-muted-foreground text-lg">
            Everything happens through our Discord bot. Follow the steps below to get started.
          </p>
        </div>

        <div className="space-y-6">
          <Card className="border-border/40 bg-card/60">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-lg font-display font-bold text-primary shrink-0">
                  1
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold mb-1">Add the Bot to Your Discord</h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    Click below to add the VCLoL bot to your Discord server.
                  </p>
                  {import.meta.env.VITE_BOT_INVITE_URL ? (
                    <a
                      href={import.meta.env.VITE_BOT_INVITE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-6 py-3 rounded-lg text-white font-semibold text-base hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: "#5865F2" }}
                    >
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                      Add VCLoL Bot to Discord
                    </a>
                  ) : (
                    <>
                      <button
                        disabled
                        className="inline-flex items-center gap-3 px-6 py-3 rounded-lg text-white font-semibold text-base opacity-60 cursor-not-allowed"
                        style={{ backgroundColor: "#5865F2" }}
                      >
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                        </svg>
                        Add VCLoL Bot to Discord
                      </button>
                      <p className="text-xs text-muted-foreground mt-2">Bot invite link available at launch.</p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/60">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-lg font-display font-bold text-primary shrink-0">
                  2
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold mb-1">Register Your Team</h2>
                  <p className="text-sm text-muted-foreground">
                    Use the <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">/register-team</code> slash
                    command in your Discord server. The bot will create your team profile and set you as captain.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/60">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-lg font-display font-bold text-primary shrink-0">
                  3
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold mb-1">Add Players</h2>
                  <p className="text-sm text-muted-foreground">
                    Invite your teammates with <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">/add @player</code>.
                    Each team needs 5 players to compete.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/40">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-display font-bold text-primary/70 shrink-0">
                  3.5
                </div>
                <div>
                  <h2 className="text-lg font-display font-bold mb-1">Link Riot Accounts</h2>
                  <p className="text-sm text-muted-foreground">
                    Each player should use <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">/link-riot RiotName#TAG</code> in
                    Discord to connect their Riot account. This unlocks champion stats, KDA, and CS tracking.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Matches still record without it — but individual stats won't appear until linked.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/60">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-lg font-display font-bold text-primary shrink-0">
                  4
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold mb-1">Submit Replays</h2>
                  <p className="text-sm text-muted-foreground">
                    After a scrim, use <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">/submit</code> and
                    attach the <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">.rofl</code> replay file.
                    The bot parses it and records the match automatically.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 text-center text-sm text-muted-foreground">
          <p>Already registered? <Link href="/login" className="text-primary hover:underline">Log in here →</Link></p>
        </div>
      </div>
    </PublicLayout>
  );
}
