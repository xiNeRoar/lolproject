import PublicLayout from "@/components/layout/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";

export default function Register() {
  return (
    <PublicLayout>
      <div className="max-w-md mx-auto px-4 pt-24 pb-16">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-display font-bold mb-2">Join VCLoL</h1>
          <p className="text-muted-foreground text-sm">Register to compete on the Vancouver LoL ladder</p>
        </div>
        <Card className="border-border/40 bg-card/60">
          <CardContent className="pt-6 pb-6">
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-display font-bold">Step 1: Connect Discord</h2>
                <p className="text-sm text-muted-foreground">
                  Your Discord account verifies your identity on the platform.
                </p>
              </div>
              <a
                href="/auth/discord"
                className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg text-white font-semibold text-base transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#5865F2" }}
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Continue with Discord
              </a>
              <p className="text-xs text-muted-foreground text-center">
                Already registered?{" "}
                <a href="/login" className="text-primary hover:underline">Login here →</a>
              </p>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-muted/20 border border-border/30 opacity-50">
              <p className="text-xs text-muted-foreground text-center">
                Step 2: Verify your Riot ID — you'll enter your Riot ID (e.g. Player#NA1) to link your LoL account.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
