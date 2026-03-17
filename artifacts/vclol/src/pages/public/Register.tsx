import PublicLayout from "@/components/layout/PublicLayout";
import { useCreatePlayer } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const schema = z.object({
  riotId: z.string().min(3, "Riot ID must be at least 3 characters (e.g. Player#NA1)"),
  discordUsername: z.string().min(1, "Discord username is required"),
  email: z.string().email("Please enter a valid email"),
  notificationPreference: z.enum(["web", "email", "discord", "both"]),
  agreeToRules: z.literal(true, { errorMap: () => ({ message: "You must agree to the rules" }) }),
});

type FormData = z.infer<typeof schema>;

export default function Register() {
  // TODO Claude: add Riot API validation for riotId before insert
  const [submitted, setSubmitted] = useState(false);
  const createPlayer = useCreatePlayer();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { notificationPreference: "web" },
  });

  const onSubmit = (data: FormData) => {
    createPlayer.mutate(
      {
        data: {
          riotId: data.riotId,
          discordUsername: data.discordUsername,
          email: data.email,
          notificationPreference: data.notificationPreference,
        } as Parameters<typeof createPlayer.mutate>[0]["data"],
      },
      { onSuccess: () => setSubmitted(true) }
    );
  };

  if (submitted) {
    return (
      <PublicLayout>
        <div className="max-w-md mx-auto px-4 pt-24 pb-16">
          <Card className="border-primary/20 bg-card/60">
            <CardContent className="pt-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-display font-bold mb-2">Registration Received!</h2>
              <p className="text-muted-foreground text-sm">
                Your Riot ID will be verified within 24 hours. You'll be notified via your chosen channel.
              </p>
              <Link href="/" className="text-primary hover:underline text-sm mt-4 inline-block">← Back to Home</Link>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto px-4 pt-24 pb-16">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-display font-bold mb-2">Join VCLoL</h1>
          <p className="text-muted-foreground text-sm">Register to compete on the Vancouver LoL ladder</p>
        </div>
        <Card className="border-border/40 bg-card/60">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Input placeholder="Riot ID (e.g. Player#NA1)" {...register("riotId")} className="bg-background" />
                {errors.riotId && <p className="text-xs text-red-400 mt-1">{errors.riotId.message}</p>}
              </div>
              <div>
                <Input placeholder="Discord Username" {...register("discordUsername")} className="bg-background" />
                {errors.discordUsername && <p className="text-xs text-red-400 mt-1">{errors.discordUsername.message}</p>}
              </div>
              <div>
                <Input type="email" placeholder="Email" {...register("email")} className="bg-background" />
                {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Notification preference</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "web", label: "Web only" },
                    { value: "email", label: "Email" },
                    { value: "discord", label: "Discord DM" },
                    { value: "both", label: "Email + Discord" },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded border border-border/40 hover:border-primary/40">
                      <input type="radio" value={opt.value} {...register("notificationPreference")} className="accent-primary" />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input type="checkbox" {...register("agreeToRules")} className="accent-primary mt-0.5" />
                  <span className="text-muted-foreground">I agree to compete fairly and follow platform rules</span>
                </label>
                {errors.agreeToRules && <p className="text-xs text-red-400 mt-1">{errors.agreeToRules.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={createPlayer.isPending}>
                {createPlayer.isPending ? "Registering..." : "Register"}
              </Button>

              {createPlayer.isError && (
                <p className="text-xs text-red-400 text-center">Registration failed. Your Riot ID may already be registered.</p>
              )}
            </form>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Already registered?{" "}
              <Link href="/login" className="text-primary hover:underline">Login with Discord →</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
