import PublicLayout from "@/components/layout/PublicLayout";
import { Mail, MessageSquare } from "lucide-react";

export default function Contact() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 py-24 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">Get in Touch</h1>
        <p className="text-xl text-muted-foreground mb-16">
          Have questions about the project, want to help organize, or interested in sponsoring an event?
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          <div className="bg-card border border-border/50 p-8 rounded-xl flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Discord</h3>
            <p className="text-muted-foreground mb-6">The primary hub for all project communication and team coordination.</p>
            <p className="text-sm font-medium border border-border/50 bg-background px-4 py-2 rounded">
              Join via the Discord link on our Register page
            </p>
          </div>

          <div className="bg-card border border-border/50 p-8 rounded-xl flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Email</h3>
            <p className="text-muted-foreground mb-6">For business inquiries, organization offers, or direct contact.</p>
            <a href="mailto:admin@vclol.test" className="text-primary hover:underline font-medium">
              admin@vclol.test
            </a>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
