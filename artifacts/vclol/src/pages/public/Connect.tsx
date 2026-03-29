/**
 * /connect — RSO verification page.
 *
 * Receives ?token=<uuid> from bot-generated /connect link.
 * Shows verification prompt, error states, or generic fallback.
 * Initiates RSO OAuth via full-page navigation (window.location.href).
 *
 * Spec: .planning/phases/12-rso-connect-page-dashboard-cta/12-UI-SPEC.md
 */
import PublicLayout from "@/components/layout/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ShieldCheck, ShieldAlert, ArrowRight } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

const ERROR_COPY: Record<string, { heading: string; body: string }> = {
  invalid_token: {
    heading: "Link Expired or Invalid",
    body: "This verification link has expired or has already been used. Generate a new one in Discord.",
  },
  state_mismatch: {
    heading: "Verification Failed",
    body: "The security check failed. This can happen if you took too long or opened multiple tabs. Try again.",
  },
  missing_code: {
    heading: "Verification Interrupted",
    body: "The Riot authorization was not completed. This usually means the popup was closed early.",
  },
  token_exchange_failed: {
    heading: "Riot Server Error",
    body: "Riot's servers could not complete the verification right now. Wait a moment and try again.",
  },
  account_fetch_failed: {
    heading: "Could Not Retrieve Account",
    body: "Your Riot account information could not be fetched. This is usually temporary. Try again in a few minutes.",
  },
  no_player: {
    heading: "Account Not Found",
    body: "No VCLoL player profile is linked to this session. Log in via Discord first, then try verifying.",
  },
  server_error: {
    heading: "Something Went Wrong",
    body: "An unexpected error occurred during verification. Try again, or use /connect in Discord for a fresh link.",
  },
};

export default function Connect() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const error = params.get("error");

  // ── State 2: Error present ──────────────────────────────
  if (error) {
    const copy = ERROR_COPY[error] ?? ERROR_COPY.server_error;
    return (
      <PublicLayout>
        <div className="max-w-sm mx-auto px-4 pt-24 pb-16">
          <div className="text-center mb-8">
            <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold mb-2">{copy.heading}</h1>
            <p className="text-muted-foreground text-sm">{copy.body}</p>
          </div>
          <Card className="border-border/40 bg-card/60">
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
              {error === "invalid_token" && (
                <p className="text-sm text-muted-foreground text-center">
                  Use{" "}
                  <code className="text-primary bg-primary/10 px-2 py-1 rounded text-sm">
                    /connect
                  </code>{" "}
                  in Discord to generate a new link.
                </p>
              )}
              <Link href="/dashboard">
                <Button variant="outline" className="gap-2">
                  Go to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  // ── State 1: Token present, no error ────────────────────
  if (token) {
    return (
      <PublicLayout>
        <div className="max-w-sm mx-auto px-4 pt-24 pb-16">
          <div className="text-center mb-8">
            <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold mb-2">
              Verify Your Riot Account
            </h1>
            <p className="text-muted-foreground text-sm">
              Connect your Riot account to unlock your competitive profile,
              champion stats, and match history.
            </p>
          </div>
          <Card className="border-border/40 bg-card/60">
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-6">
              <Button
                size="lg"
                className="w-full gap-2"
                onClick={() => {
                  window.location.href = `${API_BASE}/api/auth/connect/${token}`;
                }}
              >
                <ShieldCheck className="w-4 h-4" />
                Verify with Riot
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                You will be redirected to Riot Games to authorize your identity.
                VCLoL only reads your PUUID and Riot ID &mdash; no match history
                or personal data.
              </p>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  // ── State 3: No token AND no error (fallback) ──────────
  return (
    <PublicLayout>
      <div className="max-w-sm mx-auto px-4 pt-24 pb-16">
        <div className="text-center mb-8">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h1 className="text-2xl font-display font-bold mb-2">
            Riot Verification
          </h1>
          <p className="text-muted-foreground text-sm">
            This page is used to verify your Riot account. Use /connect in
            Discord or log in to your dashboard to start verification.
          </p>
        </div>
        <Card className="border-border/40 bg-card/60">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
            <Link href="/login">
              <Button className="gap-2">
                Log In
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm">
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
