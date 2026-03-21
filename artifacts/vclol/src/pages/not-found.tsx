import PublicLayout from "@/components/layout/PublicLayout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Users, Trophy, Video } from "lucide-react";

export default function NotFound() {
  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16 text-center">
        <div className="text-8xl font-display font-bold text-primary/20 mb-4">404</div>
        <h1 className="text-2xl font-display font-bold mb-3">Page not found</h1>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex justify-center mb-10">
          <Link href="/">
            <Button size="lg" className="gap-2">
              <Home className="w-4 h-4" /> Go Home
            </Button>
          </Link>
        </div>
        <Card className="bg-card/40 border-border/40">
          <CardContent className="pt-6 pb-6">
            <p className="text-sm text-muted-foreground mb-4">Looking for something specific?</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/teams" className="text-sm text-primary hover:underline flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" /> Ranking
              </Link>
              <Link href="/players" className="text-sm text-primary hover:underline flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Players
              </Link>
              <Link href="/vods" className="text-sm text-primary hover:underline flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5" /> VODs
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
