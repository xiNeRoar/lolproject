import PublicLayout from "@/components/layout/PublicLayout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateInterest } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

const interestSchema = z.object({
  riotId: z.string().min(3, "Riot ID is required (e.g. Name#NA1)"),
  discordUsername: z.string().min(2, "Discord username is required"),
  currentRank: z.string().min(1, "Rank is required"),
  city: z.string().min(1, "City/Area is required"),
  preferredFormat: z.string().min(1, "Format is required"),
  availability: z.string().min(1, "Availability info is required"),
  hasTeam: z.boolean().default(false),
  willingWithoutPrize: z.boolean().default(true),
  notes: z.string().optional(),
});

type InterestFormValues = z.infer<typeof interestSchema>;

export default function Interest() {
  const [submitted, setSubmitted] = useState(false);
  const mutation = useCreateInterest();

  const { register, handleSubmit, formState: { errors } } = useForm<InterestFormValues>({
    resolver: zodResolver(interestSchema),
    defaultValues: {
      hasTeam: false,
      willingWithoutPrize: true
    }
  });

  const onSubmit = (data: InterestFormValues) => {
    mutation.mutate({ data }, {
      onSuccess: () => setSubmitted(true)
    });
  };

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        
        {submitted ? (
          <Card className="bg-card/50 border-primary/20 text-center py-12">
            <CardContent>
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-6" />
              <h2 className="text-3xl font-display font-bold mb-4">Submission Received</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Thank you for expressing interest in the Vancouver Competitive LoL Project. We will reach out via Discord when opportunities matching your profile arise.
              </p>
              <Button onClick={() => setSubmitted(false)} variant="outline">Submit Another</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-10">
              <h1 className="text-4xl font-display font-bold mb-4">Join the Player Pool</h1>
              <p className="text-muted-foreground text-lg">
                Fill this out to be notified about upcoming tournaments, in-houses, and team building opportunities. This helps us understand the local talent pool.
              </p>
            </div>

            <Card className="bg-card/30">
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Riot ID (with Tagline)</label>
                      <Input placeholder="Player#NA1" {...register("riotId")} />
                      {errors.riotId && <p className="text-xs text-destructive">{errors.riotId.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Discord Username</label>
                      <Input placeholder="username" {...register("discordUsername")} />
                      {errors.discordUsername && <p className="text-xs text-destructive">{errors.discordUsername.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Current Solo/Duo Rank</label>
                      <Input placeholder="e.g. Diamond 4" {...register("currentRank")} />
                      {errors.currentRank && <p className="text-xs text-destructive">{errors.currentRank.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">City / Municipality</label>
                      <Input placeholder="e.g. Burnaby, Vancouver, Surrey" {...register("city")} />
                      {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Preferred Format</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      {...register("preferredFormat")}
                    >
                      <option value="">Select a format...</option>
                      <option value="5v5">5v5 Structured</option>
                      <option value="1v1">1v1 Tournaments</option>
                      <option value="In-house">Organized In-houses</option>
                      <option value="Any">Open to any format</option>
                    </select>
                    {errors.preferredFormat && <p className="text-xs text-destructive">{errors.preferredFormat.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">General Availability</label>
                    <Textarea placeholder="e.g. Weekday evenings after 7pm, Weekends anytime" {...register("availability")} />
                    {errors.availability && <p className="text-xs text-destructive">{errors.availability.message}</p>}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-6 pt-4 pb-2">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-primary" {...register("hasTeam")} />
                      <span className="text-sm text-foreground">I already have a team/roster</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-primary" {...register("willingWithoutPrize")} />
                      <span className="text-sm text-foreground">I am willing to play in events without a prize pool</span>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Additional Notes (Optional)</label>
                    <Textarea placeholder="Roles played, competitive experience, etc." {...register("notes")} />
                  </div>

                  <div className="pt-4 border-t border-border/40">
                    <Button type="submit" size="lg" className="w-full md:w-auto" disabled={mutation.isPending}>
                      {mutation.isPending ? "Submitting..." : "Submit Profile"}
                    </Button>
                  </div>
                  
                  {mutation.isError && (
                     <p className="text-sm text-destructive mt-2">Failed to submit. Please try again.</p>
                  )}
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PublicLayout>
  );
}
