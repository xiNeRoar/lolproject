import PublicLayout from "@/components/layout/PublicLayout";
import { Eye, Zap, Target } from "lucide-react";

export default function About() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-5xl font-bold font-display mb-8">About the Project</h1>
        
        <div className="prose prose-invert prose-blue max-w-none">
          <p className="text-xl text-muted-foreground leading-relaxed mb-10">
            The Vancouver Competitive LoL Project was created to solve a simple problem: the gap between standard solo queue and highly structured, often inaccessible semi-pro leagues.
          </p>

          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-4 flex items-center gap-2"><Eye className="w-5 h-5 text-primary" /> The Vision</h2>
              <p className="text-muted-foreground">
                We believe that a healthy competitive ecosystem requires a strong grassroots foundation. Too often, local tournaments are one-off brackets that vanish once the prize pool is distributed. Our goal is to build continuity. We want to create an environment where local players can consistently compete, build verifiable match records, and develop rivalries over time.
              </p>
            </section>

            <section className="bg-card border border-border/50 p-8 rounded-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <h2 className="text-2xl font-display font-semibold text-foreground mb-4 mt-0 flex items-center gap-2"><Zap className="w-5 h-5 text-primary" /> Current Phase: Active Competition</h2>
              <p className="text-muted-foreground mb-4">
                The platform is live. Players can register, compete on the ELO Ladder, and build a verifiable match record over time.
              </p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-2">
                <li><strong className="text-foreground">Team ELO Ladder:</strong> Persistent competitive ranking that tracks your team's progress across seasons.</li>
                <li><strong className="text-foreground">VOD Archive:</strong> Match recordings with timestamps, searchable by champion, matchup, and role.</li>
                <li><strong className="text-foreground">Events & Brackets:</strong> Structured tournaments with bracket progression and recorded results.</li>
                <li><strong className="text-foreground">Discord Bot Integration:</strong> Register teams, add players, and submit replays directly through Discord.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-display font-semibold text-foreground mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> Why We Need This</h2>
              <p className="text-muted-foreground">
                Solo queue is great for mechanical practice, but it teaches bad habits for competitive play. True competitive League of Legends requires communication, draft strategy, and team cohesion. By providing a structured, recorded environment, we aim to elevate the level of play in our region.
              </p>
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
